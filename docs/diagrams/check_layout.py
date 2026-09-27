"""Layout checker for the thesis .drawio files (no draw.io install needed).

Estimates every icon/box, every text label and every edge polyline (using the
explicit exit/entry ports and waypoints written by gen_drawio.py), then reports:

  CROSS    an edge segment passes through an icon, box or label it does not connect to
  OVERLAP  two different edges run on top of each other (collinear, overlapping)
  LABEL    two labels / a label and an icon overlap
  ELABEL   an edge label overlaps an icon, box, label or another edge label

Usage:  python3 check_layout.py [--svg OUT_DIR] file.drawio [...]
Exit code 1 when any problem is found. Text widths are estimates (Helvetica),
so a clean report means "no overlap with a safety margin", not pixel-perfect.
"""
from __future__ import annotations

import html
import re
import sys
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from pathlib import Path

MARGIN = 3.0          # px kept clear around every obstacle
CHAR_W = 0.56         # average glyph width / font size (Helvetica)
BOLD_W = 0.62
LINE_H = 1.25

# Intentional shared trunks (same dashed style, drawn as one line that splits)
TRUNKS = {frozenset({"f-maps", "f-redis"})}


@dataclass
class Box:
    x: float
    y: float
    w: float
    h: float

    @property
    def x2(self) -> float:
        return self.x + self.w

    @property
    def y2(self) -> float:
        return self.y + self.h

    def inflate(self, m: float) -> "Box":
        return Box(self.x - m, self.y - m, self.w + 2 * m, self.h + 2 * m)

    def intersects(self, o: "Box") -> bool:
        return self.x < o.x2 and o.x < self.x2 and self.y < o.y2 and o.y < self.y2


@dataclass
class Vertex:
    id: str
    box: Box
    style: dict
    label: str
    label_box: Box | None = None
    obstacle: bool = True       # icon/box body blocks edges
    kind: str = "shape"


@dataclass
class Edge:
    id: str
    source: str | None
    target: str | None
    pts: list[tuple[float, float]] = field(default_factory=list)
    label: str = ""
    label_box: Box | None = None
    style: dict = field(default_factory=dict)


def parse_style(s: str) -> dict:
    out = {}
    for part in (s or "").split(";"):
        if "=" in part:
            k, v = part.split("=", 1)
            out[k] = v
        elif part:
            out[part] = "1"
    return out


def text_lines(label: str, base_fs: float, base_bold: bool) -> list[tuple[str, float, bool]]:
    """Split an HTML label into (text, font size, bold) lines."""
    lines: list[tuple[str, float, bool]] = []
    small = False
    small_fs = base_fs
    for raw in re.split(r"<br\s*/?>", label or ""):
        fs = base_fs
        if "font-size:" in raw or small:
            m = re.search(r"font-size:(\d+)px", raw)
            if m:
                small = True
                small_fs = fs = float(m.group(1))
            elif small:
                fs = small_fs
        if "</font>" in raw:
            small_after = False
        else:
            small_after = small
        bold = base_bold or "<b>" in raw
        txt = html.unescape(re.sub(r"<[^>]+>", "", raw)).strip()
        if txt:
            lines.append((txt, fs, bold))
        small = small_after
    return lines


def text_size(label: str, fs: float, bold: bool) -> tuple[float, float]:
    lines = text_lines(label, fs, bold)
    if not lines:
        return 0.0, 0.0
    w = max(len(t) * f * (BOLD_W if b else CHAR_W) for t, f, b in lines)
    h = sum(f * LINE_H for _, f, _ in lines)
    return w, h


def is_container(st: dict, label: str, vid: str) -> bool:
    shape = st.get("shape", "")
    return (
        st.get("container") == "1"
        or shape == "mxgraph.aws4.group"
        or shape == "umlFrame"
        or vid.startswith(("band-", "grp-", "cross-box", "aws-cloud", "region", "vpc", "subnet"))
        or (st.get("dashed") == "1" and not label and "rounded" in st)
    )


def load(path: Path):
    root = ET.parse(path).getroot()
    pages = []
    for dg in root.iter("diagram"):
        verts: dict[str, Vertex] = {}
        edges: list[Edge] = []
        for obj in dg.iter("object"):
            cell = obj.find("mxCell")
            geo = cell.find("mxGeometry")
            st = parse_style(cell.get("style"))
            lab = obj.get("label") or ""
            if cell.get("vertex") == "1":
                b = Box(*(float(geo.get(k, 0)) for k in ("x", "y", "width", "height")))
                v = Vertex(obj.get("id"), b, st, lab)
                fs = float(st.get("fontSize", 12))
                bold = st.get("fontStyle") == "1"
                tw, th = text_size(lab, fs, bold)
                icon = st.get("shape", "").startswith("mxgraph.aws4.") and st.get("shape") != "mxgraph.aws4.group"
                if st.get("shape") == "umlLifeline":
                    v.kind = "lifeline"
                    v.box = Box(b.x, b.y, b.w, float(st.get("size", 40)))   # only the header blocks
                elif st.get("shape") == "umlFrame":
                    v.kind = "frame"
                    v.obstacle = False
                    fw = float(st.get("width", 60))
                    v.label_box = Box(b.x, b.y, fw, float(st.get("height", 20)))
                elif is_container(st, lab, v.id):
                    v.kind = "container"
                    v.obstacle = False
                    # a container's title text is an obstacle too
                    if st.get("swimlane") == "1" and st.get("horizontal") == "0":
                        v.label_box = Box(b.x, b.y, float(st.get("startSize", 30)), b.h)
                    elif tw:
                        sl = float(st.get("spacingLeft", 0))
                        top = float(st.get("spacingTop", 0)) + 4
                        if st.get("align") == "left" or st.get("shape") == "mxgraph.aws4.group":
                            v.label_box = Box(b.x + sl, b.y + top, tw, th)
                        else:
                            v.label_box = Box(b.x + b.w / 2 - tw / 2, b.y + top, tw, th)
                elif icon:
                    v.kind = "icon"
                    cx, cy = b.x + b.w / 2, b.y + b.h / 2
                    if st.get("labelPosition") == "right":
                        v.label_box = Box(b.x2 + float(st.get("spacingLeft", 0)), cy - th / 2, tw, th)
                    elif st.get("labelPosition") == "left":
                        v.label_box = Box(b.x - float(st.get("spacingRight", 0)) - tw, cy - th / 2, tw, th)
                    elif tw:
                        v.label_box = Box(cx - tw / 2, b.y2 + 2, tw, th)
                elif lab.startswith("text") or st.get("text") == "1":
                    v.kind = "text"
                else:
                    v.kind = "box"
                    # text inside a box must fit the box
                    inner_w = b.w - 2 * float(st.get("spacing", 2))
                    if tw > inner_w + 1 and st.get("whiteSpace") != "wrap":
                        v.label_box = Box(b.x + b.w / 2 - tw / 2, b.y + b.h / 2 - th / 2, tw, th)
                    if th > b.h + 1:
                        v.label_box = Box(b.x, b.y + b.h / 2 - th / 2, b.w, th)
                verts[v.id] = v
            else:
                e = Edge(obj.get("id"), cell.get("source"), cell.get("target"), label=lab, style=st)
                e.at = float(geo.get("x", 0) or 0)  # type: ignore[attr-defined]
                sp = tp = None
                inner = []
                for p in geo.iter("mxPoint"):
                    xy = (float(p.get("x")), float(p.get("y")))
                    if p.get("as") == "sourcePoint":
                        sp = xy
                    elif p.get("as") == "targetPoint":
                        tp = xy
                    else:
                        inner.append(xy)
                e.pts = [sp] if sp else []
                e.pts += inner
                if tp:
                    e.pts.append(tp)
                e._sp, e._tp = sp, tp  # type: ignore[attr-defined]
                edges.append(e)
        # resolve port endpoints
        for e in edges:
            inner = [p for p in e.pts if p not in (getattr(e, "_sp"), getattr(e, "_tp"))]
            start = getattr(e, "_sp")
            end = getattr(e, "_tp")
            if e.source in verts:
                b = verts[e.source].box if verts[e.source].kind != "lifeline" else verts[e.source].box
                if "exitX" in e.style:
                    start = (b.x + float(e.style["exitX"]) * b.w, b.y + float(e.style["exitY"]) * b.h)
                else:
                    start = (b.x + b.w / 2, b.y + b.h / 2)
            if e.target in verts:
                b = verts[e.target].box
                if "entryX" in e.style:
                    end = (b.x + float(e.style["entryX"]) * b.w, b.y + float(e.style["entryY"]) * b.h)
                else:
                    end = (b.x + b.w / 2, b.y + b.h / 2)
            e.pts = [p for p in [start, *inner, end] if p is not None]
            # label at the middle of the polyline
            if e.label:
                fs = float(e.style.get("fontSize", 11))
                tw, th = text_size(e.label, fs, False)
                mx, my, horizontal = midpoint(e.pts, (getattr(e, "at", 0.0) + 1) / 2)
                if e.style.get("verticalAlign") == "bottom":       # UML message: text sits above the line
                    e.label_box = Box(mx - tw / 2, my - th - 2, tw, th)
                else:
                    e.label_box = Box(mx - tw / 2, my - th / 2, tw, th)
        pages.append((dg.get("name"), verts, edges))
    return pages


def midpoint(pts, frac: float = 0.5):
    segs = list(zip(pts, pts[1:]))
    total = sum(abs(a[0] - b[0]) + abs(a[1] - b[1]) for a, b in segs)
    half = total * frac
    for a, b in segs:
        L = abs(a[0] - b[0]) + abs(a[1] - b[1])
        if half <= L and L:
            t = half / L
            return a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, abs(a[1] - b[1]) < 1
        half -= L
    return pts[-1][0], pts[-1][1], True


def seg_hits_box(a, b, box: Box) -> bool:
    """Axis-aligned or diagonal segment vs box (sampled; segments here are short polylines)."""
    n = max(2, int((abs(a[0] - b[0]) + abs(a[1] - b[1])) / 2))
    for i in range(1, n):
        t = i / n
        x, y = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
        if box.x < x < box.x2 and box.y < y < box.y2:
            return True
    return False


def collinear_overlap(s1, s2) -> bool:
    (a1, b1), (a2, b2) = s1, s2
    if abs(a1[1] - b1[1]) < 1 and abs(a2[1] - b2[1]) < 1 and abs(a1[1] - a2[1]) < 6:
        lo, hi = max(min(a1[0], b1[0]), min(a2[0], b2[0])), min(max(a1[0], b1[0]), max(a2[0], b2[0]))
        return hi - lo > 8
    if abs(a1[0] - b1[0]) < 1 and abs(a2[0] - b2[0]) < 1 and abs(a1[0] - a2[0]) < 6:
        lo, hi = max(min(a1[1], b1[1]), min(a2[1], b2[1])), min(max(a1[1], b1[1]), max(a2[1], b2[1]))
        return hi - lo > 8
    return False


def check(verts: dict[str, Vertex], edges: list[Edge]) -> list[str]:
    problems: list[str] = []
    obstacles: list[tuple[str, Box]] = []
    for v in verts.values():
        if v.obstacle and v.kind in ("icon", "box", "lifeline", "shape"):
            obstacles.append((v.id, v.box))
        if v.label_box:
            obstacles.append((v.id + ":label", v.label_box))

    for e in edges:
        own = {e.source, e.target, f"{e.source}:label" if e.source else None, f"{e.target}:label" if e.target else None}
        segs = list(zip(e.pts, e.pts[1:]))
        for oid, ob in obstacles:
            if oid in own or oid.split(":")[0] in own:
                continue
            ob_in = Box(ob.x + 1, ob.y + 1, ob.w - 2, ob.h - 2)
            # sequence messages legitimately pass through lifeline bodies, never headers
            if any(seg_hits_box(a, b, ob_in) for a, b in segs):
                problems.append(f"CROSS   {e.id} ({e.label or '-'}) cắt qua {oid}")

    for i, e1 in enumerate(edges):
        for e2 in edges[i + 1:]:
            if frozenset({e1.id, e2.id}) in TRUNKS:
                continue
            for s1 in zip(e1.pts, e1.pts[1:]):
                if any(collinear_overlap(s1, s2) for s2 in zip(e2.pts, e2.pts[1:])):
                    problems.append(f"OVERLAP {e1.id} và {e2.id} chạy chồng lên nhau")
                    break

    labelled = [(v.id, v.label_box) for v in verts.values() if v.label_box and v.kind != "container"]
    bodies = [(v.id, v.box) for v in verts.values() if v.obstacle and v.kind in ("icon", "box", "lifeline", "shape")]
    for i, (a, ba) in enumerate(labelled):
        for b, bb in labelled[i + 1:]:
            if ba.inflate(MARGIN / 2).intersects(bb.inflate(MARGIN / 2)):
                problems.append(f"LABEL   nhãn {a} đè nhãn {b}")
        for b, bb in bodies:
            if b != a and ba.intersects(bb.inflate(MARGIN / 2)):
                problems.append(f"LABEL   nhãn {a} đè {b}")

    elabs = [(e.id, e.label_box) for e in edges if e.label_box]
    for i, (a, ba) in enumerate(elabs):
        for oid, ob in obstacles:
            if ba.intersects(ob):
                problems.append(f"ELABEL  nhãn mũi tên {a} đè {oid}")
        for b, bb in elabs[i + 1:]:
            if ba.intersects(bb):
                problems.append(f"ELABEL  nhãn mũi tên {a} đè nhãn mũi tên {b}")
    return problems


def to_svg(verts, edges, out: Path) -> None:
    W = max(v.box.x2 for v in verts.values()) + 60
    H = max(v.box.y2 for v in verts.values()) + 60
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" font-family="Helvetica">',
         '<rect width="100%" height="100%" fill="white"/>']
    for v in verts.values():
        b = v.box
        fill = {"icon": "#FAD7B5", "container": "none", "lifeline": "#EEF2F7"}.get(v.kind, "#F7F7F7")
        dash = ' stroke-dasharray="5,4"' if v.kind == "container" else ""
        s.append(f'<rect x="{b.x}" y="{b.y}" width="{b.w}" height="{b.h}" fill="{fill}" stroke="#8A8F98"{dash}/>')
        if v.kind == "lifeline":
            y2 = b.y + 2000
            s.append(f'<line x1="{b.x + b.w / 2}" y1="{b.y2}" x2="{b.x + b.w / 2}" y2="{y2}" stroke="#bbb" stroke-dasharray="4,4"/>')
        lines = text_lines(v.label, float(v.style.get("fontSize", 12)), v.style.get("fontStyle") == "1")
        if v.label_box:
            lb = v.label_box
            s.append(f'<rect x="{lb.x}" y="{lb.y}" width="{lb.w}" height="{lb.h}" fill="none" stroke="#9ad" stroke-width="0.5"/>')
            tx, ty, anchor = lb.x, lb.y, "start"
        elif v.kind == "container":
            tx, ty, anchor = b.x + 8, b.y + 4, "start"
        else:
            tx, ty, anchor = b.x + 6, b.y + 4, "start"
        yy = ty
        for t, f, bold in lines:
            yy += f * LINE_H
            s.append(f'<text x="{tx}" y="{yy - f * 0.25}" font-size="{f}" font-weight="{"bold" if bold else "normal"}" '
                     f'text-anchor="{anchor}">{html.escape(t)}</text>')
    for e in edges:
        dash = ' stroke-dasharray="6,4"' if e.style.get("dashed") == "1" else ""
        pts = " ".join(f"{x},{y}" for x, y in e.pts)
        s.append(f'<polyline points="{pts}" fill="none" stroke="#C0392B" stroke-width="1.6"{dash}/>')
        if e.pts:
            x, y = e.pts[-1]
            s.append(f'<circle cx="{x}" cy="{y}" r="3" fill="#C0392B"/>')
        if e.label_box:
            lb = e.label_box
            fs = float(e.style.get("fontSize", 11))
            s.append(f'<rect x="{lb.x}" y="{lb.y}" width="{lb.w}" height="{lb.h}" fill="white" opacity="0.85"/>')
            s.append(f'<text x="{lb.x}" y="{lb.y + fs}" font-size="{fs}" fill="#C0392B">'
                     f'{html.escape(html.unescape(re.sub(r"<[^>]+>", "", e.label)))}</text>')
    s.append("</svg>")
    out.write_text("\n".join(s), encoding="utf-8")


# Cách build_thesis_final.py đặt hình: trang dọc rộng tối đa 14,5 cm, cao tối đa 16 cm;
# Hình 4.1 nằm trên trang ngang riêng, vùng hình 24,7 × 14,5 cm.
PORTRAIT_CM = (14.5, 16.0)
SEQUENCE_CM = (14.5, 17.0)   # sequence: chừa chỗ cho tiêu đề mục và chú thích
LANDSCAPE_CM = (24.7, 14.5)
MIN_PT = 8.0          # tiêu đề, nhãn chính, nhãn mũi tên
MIN_SMALL_PT = 6.5    # dòng tên kỹ thuật cỡ nhỏ


def print_check(name: str, verts: dict[str, Vertex], edges: list[Edge]) -> tuple[list[str], str]:
    boxes = [v.box for v in verts.values()] + [e.label_box for e in edges if e.label_box]
    x0 = min(b.x for b in boxes); y0 = min(b.y for b in boxes)
    x1 = max(b.x + b.w for b in boxes); y1 = max(b.y + b.h for b in boxes)
    w, h = x1 - x0, y1 - y0
    max_w, max_h = (LANDSCAPE_CM if name.startswith("H4.1")
                    else SEQUENCE_CM if re.match(r"S\d ", name) else PORTRAIT_CM)
    width_cm = min(max_w, w / h * max_h)
    pt_per_px = width_cm / 2.54 * 72 / w
    main_fs, small_fs = [], []
    for v in verts.values():
        base = float(v.style.get("fontSize", 12))
        for _, fs, _ in text_lines(v.label, base, v.style.get("fontStyle") == "1"):
            (small_fs if fs < base else main_fs).append(fs)
    main_fs += [float(e.style.get("fontSize", 11)) for e in edges if e.label]
    lo_main = min(main_fs) * pt_per_px if main_fs else 99
    lo_small = min(small_fs) * pt_per_px if small_fs else 99
    out = []
    if lo_main < MIN_PT:
        out.append(f"PRINT   chữ chính nhỏ nhất {lo_main:.1f} pt < {MIN_PT} pt")
    if lo_small < MIN_SMALL_PT:
        out.append(f"PRINT   chữ phụ nhỏ nhất {lo_small:.1f} pt < {MIN_SMALL_PT} pt")
    info = f"in {width_cm:.1f} cm, chữ chính ≥ {lo_main:.1f} pt, chữ phụ ≥ {lo_small:.1f} pt"
    return out, info


def main(argv: list[str]) -> int:
    svg_dir = None
    if argv and argv[0] == "--svg":
        svg_dir = Path(argv[1])
        argv = argv[2:]
    total = 0
    for f in argv:
        for name, verts, edges in load(Path(f)):
            problems = check(verts, edges)
            printed, info = print_check(name, verts, edges)
            problems += printed
            total += len(problems)
            print(f"== {Path(f).name} :: {name}: {len(problems)} vấn đề ({info})")
            for p in problems:
                print("   ", p)
            if svg_dir:
                safe = re.sub(r"[^A-Za-z0-9]+", "_", name)
                to_svg(verts, edges, svg_dir / f"{safe}.svg")
    print(f"TỔNG: {total}")
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
