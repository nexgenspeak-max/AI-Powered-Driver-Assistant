"""Generate the thesis draw.io sources (Hình 4.1, sequence S1–S7, Hình 4.9).

Run:  python3 docs/diagrams/gen_drawio.py
Output (same folder):
  H4_1_aws_architecture.drawio   AWS architecture, five layers as columns (Hình 4.1, trang ngang)
  H4_sequences.drawio            one page per sequence S1–S7 (Hình 4.2–4.8)
  H4_2_turn_pipeline.drawio      one conversational turn (Hình 4.9)

Font sizes are chosen for print: every figure must read ≥ 8 pt at the size
build_thesis_final.py places it (check_layout.py reports PRINT). Every shape carries
custom data (service, aws_resource, source) so a reviewer can trace a box to infra/ and
to the code. Flow numbers ①–㉕ match Bảng 4.4; sequence steps match Bảng 4.6–4.12.
Edit this script and rerun; do not hand-edit the generated files.
"""
from __future__ import annotations

from pathlib import Path
from xml.sax.saxutils import escape, quoteattr

OUT_DIR = Path(__file__).resolve().parent

FONT = "fontFamily=Helvetica;"
TEXT = "#232F3E"

# AWS Architecture Icons (draw.io "AWS 2021+" stencil), category colours per AWS guidelines.
AWS_COLOURS = {
    "compute": "#ED7100",
    "containers": "#ED7100",
    "database": "#C925D1",
    "networking": "#8C4FFF",
    "storage": "#7AA116",
    "management": "#E7157B",
    "security": "#DD344C",
    "integration": "#E7157B",
}


def aws_icon(res_icon: str, category: str) -> str:
    return (
        "sketch=0;outlineConnect=0;fontColor=#232F3E;"
        f"fillColor={AWS_COLOURS[category]};strokeColor=#ffffff;dashed=0;"
        "verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=14;"
        f"fontStyle=0;aspect=fixed;shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.{res_icon};{FONT}"
    )


def aws_group(gr_icon: str, stroke: str, fill: str = "none", dashed: int = 0) -> str:
    return (
        "points=[[0,0],[0.25,0],[0.5,0],[0.75,0],[1,0],[1,0.25],[1,0.5],[1,0.75],[1,1],[0.75,1],"
        "[0.5,1],[0.25,1],[0,1],[0,0.75],[0,0.5],[0,0.25]];outlineConnect=0;gradientColor=none;html=1;"
        "whiteSpace=wrap;fontSize=14;fontStyle=1;container=1;pointerEvents=0;collapsible=0;"
        f"recursiveResize=0;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.{gr_icon};"
        f"strokeColor={stroke};fillColor={fill};verticalAlign=top;align=left;spacingLeft=30;"
        f"fontColor={stroke};dashed={dashed};{FONT}"
    )


GENERAL_ICON = (
    "sketch=0;outlineConnect=0;fontColor=#232F3E;gradientColor=none;fillColor=#232F3D;"
    "strokeColor=none;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;"
    "html=1;fontSize=14;fontStyle=0;aspect=fixed;pointerEvents=1;shape=mxgraph.aws4.{shape};" + FONT
)

EXTERNAL_BOX = (
    "rounded=1;whiteSpace=wrap;html=1;fillColor=#F5F5F5;strokeColor=#666666;dashed=1;"
    f"fontColor={TEXT};fontSize=14;arcSize=8;spacing=6;" + FONT
)

LAYER_BAND = (
    "swimlane;horizontal=0;startSize=48;html=1;whiteSpace=wrap;collapsible=0;"
    "fillColor={fill};swimlaneFillColor={fill};strokeColor=#D5D8DC;fontSize=15;fontStyle=1;"
    f"fontColor={TEXT};" + FONT
)

SERVICE_GROUP = (
    "rounded=1;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#879196;dashed=1;"
    "verticalAlign=top;align=center;fontSize=11;fontStyle=2;fontColor=#545B64;arcSize=4;" + FONT
)

LABEL_RIGHT = "labelPosition=right;verticalLabelPosition=middle;align=left;verticalAlign=middle;spacingLeft=6;"
LABEL_LEFT = "labelPosition=left;verticalLabelPosition=middle;align=right;verticalAlign=middle;spacingRight=6;"

EDGE = (
    "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;"
    "endArrow=block;endFill=1;strokeColor=#545B64;strokeWidth=1.5;fontSize=13;"
    f"fontColor={TEXT};labelBackgroundColor=#FFFFFF;" + FONT
)


# ─────────────────────────────────────────────────────────────────────────────
# Bản tiếng Anh cho README (khóa = chuỗi tiếng Việt gốc, kể cả chỗ xuống dòng)
# ─────────────────────────────────────────────────────────────────────────────
LANG = "vn"
EN = {
    "H4.1 Kiến trúc AWS": "H4.1 AWS architecture", "H4.9 Một lượt hội thoại": "H4.9 One conversational turn",
    "S1 Đăng nhập": "S1 Login", "S2 Khởi tạo phiên": "S2 Open voice session", "S3 Một lượt hội thoại": "S3 One conversational turn",
    "S4 Mời nhận chuyến": "S4 Trip offer call", "S5 Gọi khách và SMS": "S5 Call and text the rider",
    "S6 Nhật ký cuộc gọi": "S6 Call records", "S7 Báo cáo ngày": "S7 Daily report",
    # sequence participants
    "Ứng dụng tài xế": "Driver app", "Cổng API REST": "REST API", "Dịch vụ Định danh": "Identity service",
    "Dịch vụ Chuyến đi và Điều phối": "Trip & dispatch service", "Nền tảng truyền thông": "Real-time media",
    "Liên lạc hội thoại thời gian thực": "Voice agent", "Nhà cung cấp AI": "AI providers", "Bộ nhớ đệm phiên": "Session cache",
    "Trang quản trị điều hành": "Admin panel", "Nhà cung cấp thoại": "Voice carrier",
    "Dịch vụ Liên lạc bằng tin nhắn": "Channel service", "Dịch vụ Nhật ký cuộc gọi": "Call records service",
    "Kênh thông báo WebSocket": "WebSocket push", "Lịch chạy báo cáo": "Report schedule",
    "Dịch vụ Giám sát vận hành": "Ops service", "Mô hình chấm": "Grader model", "Trang giám sát hệ thống": "Ops panel",
    # architecture
    "Tài xế": "Driver", "Ứng dụng\nkhách hàng": "Rider app", "Quản trị viên": "Operators",
    "Nền tảng\ntruyền thông\nthời gian thực": "Real-time\nmedia\nplatform", "Nhà cung cấp\ndịch vụ thoại": "Voice\ncarrier",
    "Nhà cung cấp\nmô hình AI": "AI model\nproviders", "STT · LLM · TTS\nchính và dự phòng": "STT · LLM · TTS\nprimary + fallback",
    "Liên lạc\nhội thoại\nthời gian thực": "Voice\nagent", "Cụm ECS": "ECS\ncluster", "Kênh thông báo\nthời gian thực": "Real-time\npush channel",
    "Định danh": "Identity", "Chuyến đi và\nĐiều phối": "Trips &\ndispatch", "Liên lạc\nbằng tin nhắn": "Channel",
    "Nhật ký\ncuộc gọi": "Call\nrecords", "Giám sát\nvận hành": "Operations", "Lưu trữ web tĩnh": "Static web\nhosting",
    "Nhật ký tập trung": "Central logs", "Quyền truy cập": "Access control", "Hạ tầng dạng mã": "Infra as code",
    "Lịch báo cáo ngày": "Daily report job", "Dịch vụ bản đồ": "Maps service", "Dịch vụ\nbản đồ": "Maps\nservice", "Goong ·\nGoogle Maps": "Goong ·\nGoogle Maps", "Bộ nhớ đệm\nphiên": "Session\ncache",
    "Kho image": "Image\nregistry", "HTTPS qua API Gateway": "HTTPS via API Gateway",
    "<Service>RestApi (mỗi dịch vụ một API)": "<Service>RestApi (one API per service)",
    # turn pipeline
    "Tài xế\nnói": "Driver\nspeaks", "Nhận dạng\ngiọng nói": "Speech\nto text", "STT chính\n→ dự phòng": "primary STT\n→ fallback",
    "Mô hình ngôn ngữ": "Language model", "LLM chính → dự phòng\nlược đồ công cụ\ntheo loại phiên": "primary LLM → fallback\ntool schema\nper session type",
    "Tổng hợp\ngiọng nói": "Text\nto speech", "TTS chính\n→ dự phòng": "primary TTS\n→ fallback", "Phát\ntrả lời": "Plays\nanswer",
    "Gọi API nghiệp vụ": "Business API call", "Trạng thái phiên\nhội thoại": "Session\nstate",
    "context_store\ntải trước khi mở phiên": "context_store\npreloaded at session start",
    "Dịch vụ Chuyến đi\nvà Điều phối": "Trip & dispatch\nservice", "Câu đệm": "Hold phrase",
    "turn_filler: quá 2 s chưa có âm thanh trả lời thì phát một lần;\nhủy khi câu trả lời thật bắt đầu":
        "turn_filler: plays once when no answer audio after 2 s;\ncancelled when the real answer starts",
    "văn bản": "text", "gọi công cụ": "tool call", "kết quả": "result", "trả lời": "answer",
    "đọc trước": "read first", "thiếu dữ liệu / ghi": "missing data / write",
    # sequence steps
    "① chuyển tiếp": "① forward", "② tìm tài khoản": "② find account", "bản ghi tài khoản": "account record",
    "so khớp mật khẩu": "check password", "ký token": "sign tokens", "② lưu băm refresh": "② store refresh hash",
    "200 token mới | 401": "200 new tokens | 401", "đọc phiên đang mở": "read open session", "phòng | không có": "room | none",
    "④ tạo phòng": "④ create room", "ký token LiveKit": "sign LiveKit token", "④ phân công tác nhân": "④ dispatch agent",
    "200 token, phòng": "200 token, room", "⑤ vào phòng (WebRTC)": "⑤ join room (WebRTC)", "⑥ giao việc": "⑥ assign job",
    "⑤ lời chào": "⑤ greeting", "ngữ cảnh": "context", "⑤ hỏi cần gì": "⑤ ask what is needed",
    "⑤⑥ âm thanh": "⑤⑥ audio", "đếm 2 s": "start 2 s timer", "⑦ LLM + công cụ": "⑦ LLM + tools", "câu đệm": "hold phrase",
    "⑨ ghi trạng thái": "⑨ write status", "⑤ câu trả lời": "⑤ spoken answer", "④ người tham gia SIP": "④ SIP participant",
    "⑩ trạng thái calling": "⑩ status calling", "hỏi nhận chuyến": "ask to accept", "⑩ trạng thái mới": "⑩ new status",
    "⑪ gọi khách": "⑪ call rider", "⑫ gửi SMS": "⑫ send SMS", "㉒ lưu sự kiện": "㉒ store event",
    "tổng hợp bản ghi": "build record", "⑯ lưu bản ghi": "⑯ store record", "bản ghi gần nhất": "latest record",
    "tóm tắt": "summary", "⑲ 00:15 hằng ngày": "⑲ daily at 00:15", "bản ghi của ngày": "day's records",
    "tổng hợp chỉ số": "aggregate metrics", "㉘ chấm mẫu": "㉘ grade sample", "đúng / sai / không rõ": "correct / incorrect / unclear",
    "㉑ lưu báo cáo": "㉑ store report", "báo cáo + xu hướng": "report + trend",
    "opt [mật khẩu đúng]": "opt [password OK]", "opt [chưa có phòng]": "opt [no open room]", "opt [quá 2 s]": "opt [> 2 s]",
    "opt [có SIP trunk]": "opt [SIP trunk set]", "alt [chế độ gọi]": "alt [call mode]",
    "opt [tài xế hỏi tóm tắt]": "opt [driver asks summary]", "opt [có khóa API]": "opt [API key set]",
}


def tr(text: str) -> str:
    """Chuỗi hiển thị theo LANG; bản tiếng Anh chỉ dùng cho README."""
    return EN.get(text, text) if LANG == "en" else text

def label(title: str, tech: str = "", tech_px: int = 12) -> str:
    """Function name large, technical name small (GVHD rule)."""
    title, tech = tr(title), tr(tech)
    if not tech:
        return f"<b>{escape(title)}</b>"
    small = "<br>".join(escape(part) for part in tech.split("\n"))
    return f"<b>{escape(title)}</b><br><font style=\"font-size:{tech_px}px;color:#545B64\">{small}</font>"


class Diagram:
    def __init__(self, name: str, width: int, height: int):
        self.name = tr(name)
        self.width = width
        self.height = height
        self.cells: list[str] = []

    def _data(self, data: dict[str, str] | None) -> str:
        return "".join(f" {k}={quoteattr(tr(v))}" for k, v in (data or {}).items())

    def vertex(self, cid: str, value: str, style: str, x: float, y: float, w: float, h: float,
               parent: str = "1", data: dict[str, str] | None = None) -> str:
        geo = f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/>'
        cell = f'<mxCell style={quoteattr(style)} vertex="1" parent="{parent}">{geo}</mxCell>'
        self.cells.append(f'<object id="{cid}" label={quoteattr(value)}{self._data(data)}>{cell}</object>')
        return cid

    def edge(self, cid: str, source: str, target: str, value: str = "", style: str = EDGE,
             points: list[tuple[float, float]] | None = None, data: dict[str, str] | None = None,
             ports: tuple[float, float, float, float] | None = None, at: float = 0.0) -> str:
        """at: label position along the edge, -1 (source) … 0 (middle) … 1 (target), as draw.io."""
        value = tr(value)
        if ports:
            ex, ey, nx, ny = ports
            style += f"exitX={ex};exitY={ey};exitDx=0;exitDy=0;entryX={nx};entryY={ny};entryDx=0;entryDy=0;"
        pts = ""
        if points:
            pts = '<Array as="points">' + "".join(f'<mxPoint x="{px}" y="{py}"/>' for px, py in points) + "</Array>"
        pos = f' x="{at}"' if at else ""
        geo = f'<mxGeometry{pos} relative="1" as="geometry">{pts}</mxGeometry>'
        cell = f'<mxCell style={quoteattr(style)} edge="1" parent="1" source="{source}" target="{target}">{geo}</mxCell>'
        self.cells.append(f'<object id="{cid}" label={quoteattr(value)}{self._data(data)}>{cell}</object>')
        return cid

    def free_edge(self, cid: str, x1: float, y1: float, x2: float, y2: float, value: str, style: str) -> str:
        geo = (
            '<mxGeometry relative="1" as="geometry">'
            f'<mxPoint x="{x1}" y="{y1}" as="sourcePoint"/><mxPoint x="{x2}" y="{y2}" as="targetPoint"/>'
            "</mxGeometry>"
        )
        cell = f'<mxCell style={quoteattr(style)} edge="1" parent="1">{geo}</mxCell>'
        self.cells.append(f'<object id="{cid}" label={quoteattr(value)}>{cell}</object>')
        return cid

    def xml(self) -> str:
        body = "".join(self.cells)
        return (
            f'<diagram id={quoteattr(self.name)} name={quoteattr(self.name)}>'
            f'<mxGraphModel dx="1600" dy="1000" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" '
            f'arrows="1" fold="1" page="1" pageScale="1" pageWidth="{self.width}" pageHeight="{self.height}" '
            'math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>'
            f"{body}</root></mxGraphModel></diagram>"
        )


def write(path: Path, diagrams: list[Diagram]) -> None:
    content = '<mxfile host="gen_drawio.py" type="device">' + "".join(d.xml() for d in diagrams) + "</mxfile>\n"
    path.write_text(content, encoding="utf-8")
    print("wrote", path.relative_to(OUT_DIR.parent.parent))


# ─────────────────────────────────────────────────────────────────────────────
# Hình 4.1 — AWS architecture
# ─────────────────────────────────────────────────────────────────────────────

ARCH_PX = 28        # nhãn chính, nhãn mũi tên của Hình 4.1
ARCH_TECH_PX = 23   # tên kỹ thuật cỡ nhỏ
ARCH_TITLE_PX = 30  # tên lớp


ARCH_VIEWS = {
    "structure": "H4.1 Kiến trúc tổng thể",
    "driver": "H4.2 Luồng hành vi: Tài xế",
    "customer": "H4.3 Luồng hành vi: Khách hàng",
    "dispatcher": "H4.4 Luồng hành vi: Điều phối viên",
    "sysadmin": "H4.5 Luồng hành vi: Quản trị viên hệ thống",
}
# Ở hình theo người dùng, thành phần không nằm trên luồng của người dùng đó được làm mờ.
FADE = "opacity=20;textOpacity=25;"
NEVER_FADE = ("band-", "aws-cloud", "region", "vpc", "subnet", "ext-box", "cross-box")


def architecture(view: str = "structure") -> Diagram:
    """Hình 4.1 — năm lớp là năm cột từ trái sang phải (Client → Real-time & AI → API Gateway →
    Microservices → Data), dải Cross-cutting ở đáy. Hình in trên trang A4 ngang; cỡ chữ và
    khung được chọn để chữ ≥ 8 pt khi in (check_layout.py kiểm tra PRINT, CROSS, LABEL…).

    - Mỗi Lambda cùng hàng với bảng DynamoDB của nó (database per service); nhãn Lambda đặt
      bên trái icon nên mũi tên tới bảng đi thẳng sang phải.
    - Mũi tên vào Lambda đi từ trên xuống qua làn giữa hai hàng; nhãn mũi tên chỉ ghi số luồng
      (giao thức và mục đích ở Bảng 4.4).
    """
    F, T = ARCH_PX, ARCH_TECH_PX
    d = Diagram(ARCH_VIEWS[view], 2362, 1420)

    def lab(title: str, tech: str = "") -> str:
        title, tech = tr(title), tr(tech)
        head = "<br>".join(f"<b>{escape(t)}</b>" for t in title.split("\n"))
        if not tech:
            return head
        small = "<br>".join(escape(t) for t in tech.split("\n"))
        return f'{head}<br><font style="font-size:{T}px;color:#545B64">{small}</font>'

    def icon(res: str, cat: str, where: str = "bottom") -> str:
        st = aws_icon(res, cat).replace("fontSize=14;", f"fontSize={F};")
        return st + {"bottom": "", "right": LABEL_RIGHT, "left": LABEL_LEFT, "top":
                     "verticalLabelPosition=top;verticalAlign=bottom;"}[where]

    def general(shape: str) -> str:
        return GENERAL_ICON.format(shape=shape).replace("fontSize=14;", f"fontSize={F};")

    def group(gr: str, stroke: str, fill: str = "none", dashed: int = 0) -> str:
        return aws_group(gr, stroke, fill, dashed).replace("fontSize=14;", f"fontSize={F};") + "spacingLeft=40;"

    ext_box = EXTERNAL_BOX.replace("fontSize=14;", f"fontSize={F};")
    column = (
        "swimlane;horizontal=1;startSize=96;html=1;whiteSpace=wrap;collapsible=0;"
        "fillColor={fill};swimlaneFillColor={fill};strokeColor=#D5D8DC;"
        f"fontSize={ARCH_TITLE_PX};fontStyle=1;fontColor={TEXT};" + FONT
    )
    region_box = (f"rounded=1;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#879196;dashed=1;"
                  f"verticalAlign=top;align=left;spacingLeft=16;spacingTop=4;fontSize={F};fontStyle=1;"
                  f"fontColor={TEXT};arcSize=3;" + FONT)

    # ── Năm lớp (cột) ──
    for cid, text, x, w, fill in [
        ("band-client", "Client Layer", 10, 330, "#F2F4F4"),
        ("band-rtai", "Real-time Communication &amp;<br>Conversational AI Layer", 350, 600, "#FFF7ED"),
        ("band-apigw", "API Gateway Layer", 960, 330, "#F5F0FF"),
        ("band-ms", "Microservices Layer", 1300, 420, "#FFF4EC"),
        ("band-data", "Data Layer", 1730, 400, "#FBF0FC"),
        # Outside the AWS Cloud box: services the system calls but does not run.
        ("band-ext", "External Services", 2140, 216, "#F2F4F4"),
    ]:
        d.vertex(cid, text, column.format(fill=fill), x, 10, w, 1100, data={"layer": cid.removeprefix("band-")})

    d.vertex("aws-cloud", "AWS Cloud", group("group_aws_cloud_alt", "#232F3E"), 620, 110, 1515, 1260)
    d.vertex("region", "Region ap-southeast-1", group("group_region", "#00A4A6", dashed=1), 636, 150, 1493, 1216)
    d.vertex("vpc", "VPC", group("group_vpc2", "#8C4FFF"), 640, 240, 300, 380)
    d.vertex("subnet", "Public subnet", group("group_security_group", "#7AA116", fill="#F2F6E8"), 656, 290, 272, 320)
    # Tiêu đề khung đặt ở đáy để mũi tên vào hai hộp từ phía trên không cắt chữ.
    d.vertex("cross-box", "Cross-cutting Concerns", region_box, 650, 1165, 1478, 182)

    # ── Client ──
    d.vertex("driver", lab("Tài xế"), general("user"), 151, 130, 48, 48)
    d.vertex("driver-app", lab("Ứng dụng tài xế", "driver-app"), general("mobile_client"), 151, 250, 48, 74,
             data={"service": "driver-app", "layer": "client", "source": "src/frontend/driver-app"})
    d.vertex("customer", lab("Khách hàng", "điện thoại thường"), general("user"), 151, 450, 48, 48,
             data={"layer": "client", "external": "true"})
    d.vertex("dispatcher", lab("Điều phối viên", "admin-panel"), general("client"), 145, 650, 60, 58,
             data={"service": "admin-panel", "layer": "client", "source": "src/frontend/admin-panel"})
    d.vertex("sysadmin", lab("Quản trị viên\nhệ thống", "super-admin-panel"), general("client"), 145, 830, 60, 58,
             data={"service": "super-admin-panel", "layer": "client", "source": "src/frontend/super-admin-panel"})

    # ── Real-time communication & conversational AI ──
    d.vertex("livekit", lab("Nền tảng\ntruyền thông\nthời gian thực", "LiveKit Cloud\nWebRTC · SIP"),
             ext_box, 370, 260, 225, 200, data={"layer": "realtime-ai", "external": "true"})
    d.vertex("twilio", lab("Nhà cung cấp\ndịch vụ thoại", "Twilio\nSIP trunk · SMS"),
             ext_box, 370, 500, 225, 190, data={"layer": "realtime-ai", "external": "true"})
    d.vertex("ai", lab("Nhà cung cấp\nmô hình AI", "STT · LLM · TTS\nchính và dự phòng"),
             ext_box, 370, 760, 225, 190, data={"layer": "realtime-ai", "external": "true",
                                                "source": "src/backend/llm-orchestrator/app/providers"})
    d.vertex("agent", lab("Liên lạc\nhội thoại\nthời gian thực", "llm-orchestrator\nAWS Fargate"),
             icon("fargate", "containers"), 758, 350, 64, 64,
             data={"service": "llm-orchestrator", "layer": "realtime-ai",
                   "aws_resource": "LlmOrchestratorService, LlmOrchestratorTaskDefinition",
                   "source": "infra/llm-orchestrator/cfn.yaml; src/backend/llm-orchestrator"})
    d.vertex("ecs", lab("Cụm ECS", "Amazon ECS"), icon("ecs", "containers"), 668, 650, 64, 64,
             data={"service": "llm-orchestrator", "layer": "realtime-ai",
                   "aws_resource": "LlmOrchestratorCluster", "source": "infra/llm-orchestrator/cfn.yaml"})
    d.vertex("ecr", lab("Kho image", "Amazon ECR"), icon("ecr", "containers"), 820, 650, 64, 64,
             data={"service": "llm-orchestrator", "layer": "cross-cutting",
                   "aws_resource": "LlmOrchestratorRepository", "source": "infra/llm-orchestrator/cfn.yaml"})

    # ── API Gateway ──
    d.vertex("apigw-rest", lab("Cổng API REST", "API Gateway (REST)"), icon("api_gateway", "networking", "top"),
             1093, 350, 64, 64,
             data={"layer": "api-gateway", "aws_resource": "<Service>RestApi (mỗi dịch vụ một API)", "source": "infra/*/sam.yaml"})
    d.vertex("apigw-ws", lab("Kênh thông báo\nthời gian thực", "API Gateway\n(WebSocket)"), icon("api_gateway", "networking"),
             1093, 830, 64, 64,
             data={"service": "external-api-service", "layer": "api-gateway",
                   "aws_resource": "ExternalApiDispatchWebSocketApi", "source": "infra/external-api-service/sam.yaml"})

    # ── Microservices (nhãn bên trái icon) và Data (cùng hàng) ──
    rows = [
        ("identity", "Định danh", "identity-service", "Identity", 190, [("accounts", "Accounts"), ("driver-settings", "DriverSettings")]),
        ("trip", "Chuyến đi và\nĐiều phối", "external-api-\nservice", "ExternalApi", 380, [("trips", "Trips"), ("ws-connections", "WsConnections")]),
        ("channel", "Liên lạc\nbằng tin nhắn", "external-channel-\nservice", "ExternalChannel", 570, [("channel-events", "ChannelEvents")]),
        ("records", "Nhật ký\ncuộc gọi", "call-records-\nservice", "CallRecords", 760, [("call-records", "")]),
        ("ops", "Giám sát\nvận hành", "ops-service", "Ops", 950, [("daily-reports", "DailyReports")]),
    ]
    for key, title, tech, prefix, y, tables in rows:
        d.vertex(f"fn-{key}", lab(title, tech), icon("lambda", "compute", "left"), 1640, y, 64, 64,
                 data={"service": tech.replace("\n", ""), "layer": "microservices", "aws_resource": f"{prefix}Function",
                       "source": f"src/backend/{tech.replace(chr(10), '')}"})
        for j, (tname, logical) in enumerate(tables):
            d.vertex(f"tbl-{tname}", lab(tname, "DynamoDB"), icon("dynamodb", "database", "right"),
                     1790, y + 2 + 70 * j, 60, 60,
                     data={"service": tech.replace("\n", ""), "layer": "data",
                           "aws_resource": f"{prefix}{logical}Table", "source": f"infra/{tech.replace(chr(10), '')}/sam.yaml"})
    d.vertex("s3", lab("Lưu trữ web tĩnh", "Amazon S3"), icon("s3", "storage", "left"), 2050, 1044, 64, 64,
             data={"service": "frontend", "layer": "data", "aws_resource": "S3 bucket", "source": "infra/frontend/deploy.sh"})

    # ── Cross-cutting (đáy, nhãn dưới icon) và hệ thống bên ngoài ──
    for cid, title, tech, res, cat, cx in [
        ("cw", "Nhật ký tập trung", "CloudWatch Logs", "cloudwatch_2", "management", 1100),
        ("iam", "Quyền truy cập", "AWS IAM · JWT", "identity_and_access_management", "security", 1394),
        ("cfn", "Hạ tầng dạng mã", "CloudFormation · SAM", "cloudformation", "management", 1990),
        ("sched", "Lịch báo cáo ngày", "EventBridge Scheduler", "eventbridge", "integration", 1688),
    ]:
        d.vertex(cid, lab(title, tech), icon(res, cat), cx - 28, 1212, 56, 56,
                 data={"layer": "cross-cutting", "aws_resource": tech})
    # Right-hand column, level with Dịch vụ Chuyến đi (the only backend caller):
    # at the bottom-left the two links crossed the whole figure.
    d.vertex("maps", lab("Dịch vụ\nbản đồ", "Goong ·\nGoogle Maps"), ext_box, 2148, 590, 200, 150,
             data={"layer": "external", "external": "true",
                   "source": "src/backend/external-api-service/src/services/mapsService.ts"})
    d.vertex("redis", lab("Bộ nhớ đệm\nphiên", "Redis (tùy chọn)"), ext_box, 2148, 285, 200, 130,
             data={"layer": "external", "external": "true",
                   "source": "src/backend/external-api-service/src/cache/redis.ts"})

    # ── Luồng (Bảng 4.4) ──
    # view="structure": mọi kết nối, không số, nét xám mảnh (mô hình cấu trúc, Hình 4.1).
    # view=driver|customer|admin: chỉ các luồng của nhóm người dùng đó, có số (Hình 4.2–4.4).
    # Mỗi luồng: (id, nguồn, đích, {view: nhãn}, ports, points, kiểu, vị trí nhãn).
    aux = EDGE + "dashed=1;"
    both = EDGE + "startArrow=block;startFill=1;"
    big = f"fontSize={F};"
    small = f"fontSize={F};labelBackgroundColor=#FFFFFF;"
    jump = "jumpStyle=arc;jumpSize=12;"
    D, C, P, Q = "driver", "customer", "dispatcher", "sysadmin"
    flows = [
        ("f1", "driver-app", "apigw-rest", {"structure": "HTTPS", D: "① ③"}, (1, .8, 0, .75), [(320, 309), (320, 1030), (970, 1030), (970, 398)], EDGE, -0.05),
        ("f1b", "apigw-rest", "fn-identity", {D: "① ㉖", P: "⑰ ㉖", Q: "⑰ ㉗"}, (1, .2, .5, 0), [(1300, 363), (1300, 130), (1672, 130)], EDGE, 0.45),
        ("f2", "fn-identity", "tbl-accounts", {D: "②", P: "②", Q: "②"}, (1, .5, 0, .5), None, EDGE, 0.0),
        ("f3", "apigw-rest", "fn-trip", {D: "③ ⑧", C: "⑧", P: "⑰", Q: "㉗"}, (1, .5, .5, 0), [(1320, 382), (1320, 320), (1672, 320)], EDGE, 0.3),
        ("f4", "fn-trip", "livekit", {"structure": "HTTPS", D: "④", C: "④", P: "④"}, (.25, 0, 1, .1), [(1656, 332), (1310, 332), (1310, 230), (610, 230), (610, 280)], EDGE, 0.3),
        ("f5", "driver-app", "livekit", {"structure": "WebRTC", D: "⑤"}, (1, .5, 0, .135), None, both, 0.0),
        ("f6", "livekit", "agent", {"structure": "WebRTC", D: "⑥", C: "⑥"}, (1, .53, 0, .25), [(700, 366)], both, 0.0),
        ("f7", "agent", "ai", {D: "⑦", C: "⑦"}, (0, .5, 1, .53), [(628, 382), (628, 860)], EDGE, -0.55),
        ("f8", "agent", "apigw-rest", {"structure": "HTTPS", D: "⑧ ⑭", C: "⑧ ⑭"}, (1, .35, 0, .35), None, EDGE, 0.0),
        ("f9", "fn-trip", "tbl-trips", {D: "⑨", C: "⑨", P: "⑨"}, (1, .5, 0, .5), None, EDGE, 0.0),
        ("f10a", "fn-trip", "apigw-ws", {D: "⑩"}, (1, .9, 1, .78), [(1720, 438), (1720, 880)], EDGE, 0.2),
        ("f10b", "apigw-ws", "driver-app", {"structure": "WSS", D: "⑩"}, (0, .5, 1, .3), [(1000, 862), (1000, 1000), (335, 1000), (335, 272)], aux, -0.3),
        ("f11", "livekit", "twilio", {"structure": "SIP", D: "⑪", C: "⑪", P: "⑪"}, (.5, 1, .5, 0), None, EDGE, 0.0),
        # Gọi giữa các dịch vụ đi qua Cổng API REST của dịch vụ đích (URL ...ApiUrl do deploy-all.sh gán, kèm JWT dịch vụ).
        ("f12a", "fn-trip", "apigw-rest", {D: "⑫ ⑮ ㉖", C: "⑫", P: "㉖", "structure": "HTTPS"}, (.5, 1, 1, .35), [(1672, 480), (1395, 480), (1395, 372)], EDGE, 0.78),
        ("f12c", "apigw-rest", "fn-channel", {D: "⑫", C: "⑫", Q: "㉗"}, (.5, 1, .5, 0), [(1125, 515), (1672, 515)], EDGE, 0.5),
        ("f12b", "fn-channel", "twilio", {"structure": "HTTPS · webhook", D: "⑫ ⑬", C: "⑫ ⑬"}, (1, .9, 0, .79), [(1760, 628), (1760, 1108), (360, 1108), (360, 650)], both, 0.4),
        ("f14", "apigw-rest", "fn-records", {D: "⑭ ⑮", C: "⑭", P: "⑰", Q: "⑳ ㉗"}, (1, .8, .5, 0), [(1340, 401), (1340, 700), (1672, 700)], EDGE, 0.45),
        ("f16", "fn-records", "tbl-call-records", {D: "⑯", C: "⑯", P: "⑯", Q: "⑯"}, (1, .5, 0, .5), None, EDGE, 0.0),
        ("k1", "twilio", "customer", {"structure": "PSTN", C: "⑪ ⑫"}, (0, .3, 1, .5), [(300, 557), (300, 474)], both, -0.75),
        ("k2", "customer", "dispatcher", {"structure": "Zalo / gọi điện", C: "Zalo / gọi điện", P: "Zalo / gọi điện"}, (0, .5, 0, .5), [(40, 474), (40, 679)], EDGE + "dashed=1;", 0.25),
        ("f17", "dispatcher", "apigw-rest", {"structure": "HTTPS", P: "⑰"}, (1, .5, 0, .95), [(305, 679), (305, 1060), (985, 1060), (985, 411)], EDGE, 0.05),
        ("f17s", "sysadmin", "apigw-rest", {"structure": "HTTPS", Q: "⑰"}, (1, .5, 0, .1), [(298, 859), (298, 1075), (955, 1075), (955, 356)], EDGE, 0.05),
        ("a-ops", "apigw-rest", "fn-ops", {Q: "⑰"}, (1, .95, .15, 0), [(1360, 411), (1360, 920), (1650, 920)], EDGE, 0.3),
        ("f18a", "agent", "cw", {D: "⑱", C: "⑱"}, (1, .8, .3, 0), [(945, 401), (945, 1090), (1089, 1090)], aux, 0.0),
        ("f18b", "fn-ops", "cw", {Q: "⑱ ㉙"}, (.25, 1, .7, 0), [(1656, 1100), (1111, 1100)], aux, 0.0),
        ("f19", "sched", "fn-ops", {Q: "⑲"}, (.5, 0, .75, 1), None, EDGE, 0.0),
        ("f20a", "fn-ops", "apigw-rest", {Q: "⑳ ㉗"}, (.75, 0, 1, .65), [(1688, 900), (1375, 900), (1375, 392)], EDGE, 0.8),
        # Dịch vụ bản đồ và bộ nhớ đệm phiên: chỉ Dịch vụ Chuyến đi và Điều phối gọi; ứng dụng tài xế tải bản đồ nền.
        # Trip service → maps runs in the gap between the trip and channel rows;
        # → Redis in the gap above its tables; the app's map tiles go round the bottom edge.
        ("f23", "fn-trip", "maps", {D: "㉓", P: "㉓", "structure": "HTTPS"}, (.75, 1, 0, .5), [(1688, 545), (2138, 545), (2138, 665)], EDGE, 0.55),
        ("f24", "fn-trip", "redis", {D: "㉔", P: "㉔", "structure": "TLS"}, (.75, 0, 0, .5), [(1688, 350)], aux, 0.7),
        ("f25", "driver-app", "maps", {D: "㉕", "structure": "HTTPS"}, (0, .5, .5, 1), [(25, 287), (25, 1395), (2248, 1395)], EDGE, 0.55),
        # Giám sát vận hành: mô hình chấm của báo cáo ngày (reports/judge.ts) và trạng thái tác vụ tác nhân (status/ecsProbe.ts).
        ("f28", "fn-ops", "ai", {Q: "㉘", "structure": "HTTPS"}, (.5, 1, .49, 1), [(1672, 1130), (480, 1130)], EDGE, -0.2),
        ("f29", "fn-ops", "ecs", {Q: "㉙"}, (.4, 1, 0, .5), [(1665.6, 1120), (650, 1120), (650, 682)], EDGE, 0.7),
        ("f21", "fn-ops", "tbl-daily-reports", {Q: "㉑"}, (1, .5, 0, .5), None, EDGE, 0.0),
        ("f22", "fn-channel", "tbl-channel-events", {D: "㉒", C: "㉒"}, (1, .5, 0, .5), None, EDGE, 0.0),
        ("f-ecs", "ecs", "agent", {}, (.5, 0, 0, .75), [(700, 630), (660, 630), (660, 398)], aux, 0.0),
        ("f-ecr", "ecr", "ecs", {}, (0, .5, 1, .5), None, aux, 0.0),
    ]
    thin = "strokeColor=#879196;strokeWidth=1.2;"
    for cid, src, dst, labels, ports, points, style, at in flows:
        if view == "structure":
            # Hình cấu trúc: nhãn là giao thức (chi tiết ở Bảng 4.4), chữ nhỏ hơn nhãn số luồng.
            d.edge(cid, src, dst, labels.get("structure", ""), style=style + small + thin + jump,
                   ports=ports, points=points, at=at)
        elif view in labels:
            d.edge(cid, src, dst, labels[view], style=style + big + jump, ports=ports, points=points, at=at)
    if view != "structure":
        used = {n for cid, src, dst, labels, *_ in flows if view in labels for n in (src, dst)}
        if view == "driver":
            used.add("driver")
        import re as _re
        for k, cell in enumerate(d.cells):
            m = _re.match(r'<object id="([^"]+)"', cell)
            if not m or 'vertex="1"' not in cell:
                continue
            cid = m.group(1)
            if cid in used or cid.startswith(NEVER_FADE):
                continue
            d.cells[k] = cell.replace('<mxCell style="', '<mxCell style="' + FADE, 1)
    return d


# ─────────────────────────────────────────────────────────────────────────────
# Sequence diagrams S1–S6 (steps mirror Bảng 4.6–4.11)
# ─────────────────────────────────────────────────────────────────────────────

# In ấn: hình sequence đặt rộng tối đa 14,5 cm (411 pt). Chữ 22 px trên khung
# ≤ 1130 px cho ≥ 8 pt khi in (check_layout.py kiểm tra PRINT). Nhãn thông điệp
# vì thế ngắn gọn; chi tiết (tham số, mã lỗi, ghi chú) nằm ở Bảng 4.6–4.12.
SEQ_PX = 23          # thông điệp, tiêu đề đối tượng, nhãn khung
SEQ_TECH_PX = 20     # tên kỹ thuật dưới tiêu đề đối tượng
SEQ_COL = 172        # khoảng cách giữa hai đường đời
SEQ_BOX = 164        # bề rộng hộp đối tượng
SEQ_HEAD = 132       # chiều cao hộp đối tượng (tiêu đề 3 dòng + tên kỹ thuật)
SEQ_GAP = 72         # khoảng cách dọc giữa hai bước
SEQ_FRAME_PAD = 30   # nới thêm quanh khung alt/opt

LIFELINE = (
    "shape=umlLifeline;perimeter=lifelinePerimeter;whiteSpace=wrap;html=1;container=1;dropTarget=0;"
    f"collapsible=0;recursiveResize=0;outlineConnect=0;portConstraint=eastwest;size={SEQ_HEAD};"
    f"fillColor=#FFFFFF;strokeColor=#545B64;fontColor={TEXT};fontSize={SEQ_PX};spacing=4;" + FONT
)
MSG = (f"html=1;verticalAlign=bottom;endArrow=block;endFill=1;strokeColor=#232F3E;strokeWidth=1.5;"
       f"fontSize={SEQ_PX};fontColor={TEXT};labelBackgroundColor=#FFFFFF;" + FONT)
RET = MSG.replace("endArrow=block;endFill=1;", "endArrow=open;endFill=0;") + "dashed=1;"
SELF = MSG + "edgeStyle=orthogonalEdgeStyle;"
FRAME = (f"shape=umlFrame;whiteSpace=wrap;html=1;width={{w}};height=32;fontSize={SEQ_PX - 2};fontStyle=1;"
         f"strokeColor=#879196;fontColor={TEXT};" + FONT)


def sequence(page: str, participants: list[tuple[str, str, str]], steps: list[tuple], frames=()) -> Diagram:
    """participants: (id, title, tech). steps: (kind, from, to, text) with kind msg|ret|self.
    Bước cách nhau SEQ_GAP; riêng bước mở hoặc ngay sau một khung alt/opt được nới thêm để
    tab và cạnh dưới của khung không chạm nhãn thông điệp."""
    left = 20
    top = 20
    starts = {f[1] for f in frames}
    after = {f[2] + 1 for f in frames}
    ys, y = [], top + SEQ_HEAD + 58
    for n in range(1, len(steps) + 1):
        if n > 1:
            y += SEQ_GAP + (SEQ_FRAME_PAD if n in starts or n in after else 0)
        ys.append(y)
    height = ys[-1] + 40
    width = left * 2 + SEQ_COL * (len(participants) - 1) + SEQ_BOX
    d = Diagram(page, width, height + 20)
    xs: dict[str, float] = {}
    for i, (pid, title, tech) in enumerate(participants):
        x = left + i * SEQ_COL
        xs[pid] = x + SEQ_BOX / 2
        d.vertex(f"ll-{pid}", label(title, tech, SEQ_TECH_PX), LIFELINE, x, top, SEQ_BOX, height - top)
    for n, step in enumerate(steps, 1):
        kind, src, dst, text = step
        y = ys[n - 1]
        value = f"{n}. {escape(tr(text))}"
        if kind == "self":
            d.free_edge(f"m{n}", xs[src], y, xs[src] + 1, y + 18,
                        value, SELF + "align=left;labelPosition=right;spacingLeft=48;" + "entryX=0;")
            d.cells[-1] = d.cells[-1].replace(
                '<mxPoint x="%s" y="%s" as="targetPoint"/>' % (xs[src] + 1, y + 18),
                '<mxPoint x="%s" y="%s" as="targetPoint"/><Array as="points"><mxPoint x="%s" y="%s"/><mxPoint x="%s" y="%s"/></Array>'
                % (xs[src] + 1, y + 18, xs[src] + 40, y, xs[src] + 40, y + 18),
            )
        else:
            d.free_edge(f"m{n}", xs[src], y, xs[dst], y, value, RET if kind == "ret" else MSG)
    for i, (title, first, last, left_p, right_p) in enumerate(frames):
        fy = ys[first - 1] - 70                  # tab above the first message label
        fh = ys[last - 1] - ys[first - 1] + 90   # bottom edge under the last message
        fx = max(4, min(xs[left_p], xs[right_p]) - SEQ_BOX / 2 - 6)
        fr = min(width - 4, max(xs[left_p], xs[right_p]) + SEQ_BOX / 2 + 6)
        title = tr(title)
        d.vertex(f"frame{i}", escape(title), FRAME.format(w=min(int(fr - fx) - 20, 13 * len(title) + 36)), fx, fy, fr - fx, fh)
    return d


def sequences() -> list[Diagram]:
    app = ("app", "Ứng dụng tài xế", "driver-app")
    gw = ("gw", "Cổng API REST", "API Gateway")
    idn = ("idn", "Dịch vụ Định danh", "identity-service")
    trip = ("trip", "Dịch vụ Chuyến đi và Điều phối", "external-api-service")
    lk = ("lk", "Nền tảng truyền thông", "LiveKit Cloud")
    agent = ("agent", "Liên lạc hội thoại thời gian thực", "llm-orchestrator")
    ai = ("ai", "Nhà cung cấp AI", "STT · LLM · TTS")
    ddb_acc = ("ddb", "DynamoDB", "accounts")
    ddb_trip = ("ddb", "DynamoDB", "trips")
    redis = ("redis", "Bộ nhớ đệm phiên", "Redis")
    admin = ("admin", "Trang quản trị điều hành", "admin-panel")
    twilio = ("tw", "Nhà cung cấp thoại", "Twilio")
    chan = ("chan", "Dịch vụ Liên lạc bằng tin nhắn", "external-channel-service")
    rec = ("rec", "Dịch vụ Nhật ký cuộc gọi", "call-records-service")
    ddb_rec = ("ddb", "DynamoDB", "call-records")
    wsgw = ("ws", "Kênh thông báo WebSocket", "API Gateway")
    s1 = sequence(
        "S1 Đăng nhập",
        [app, gw, idn, ddb_acc],
        [
            ("msg", "app", "gw", "① POST /auth/login"),
            ("msg", "gw", "idn", "① chuyển tiếp"),
            ("msg", "idn", "ddb", "② tìm tài khoản"),
            ("ret", "ddb", "idn", "bản ghi tài khoản"),
            ("self", "idn", "idn", "so khớp mật khẩu"),
            ("self", "idn", "idn", "ký token"),
            ("msg", "idn", "ddb", "② lưu băm refresh"),
            ("ret", "idn", "app", "200 token"),
            ("msg", "app", "gw", "① POST /auth/refresh"),
            ("ret", "gw", "app", "200 token mới | 401"),
        ],
        frames=[("opt [mật khẩu đúng]", 6, 8, "app", "ddb")],
    )
    s2 = sequence(
        "S2 Khởi tạo phiên",
        [app, trip, redis, lk, agent],
        [
            ("msg", "app", "trip", "③ POST /voice/token"),
            ("msg", "trip", "redis", "đọc phiên đang mở"),
            ("ret", "redis", "trip", "phòng | không có"),
            ("msg", "trip", "lk", "④ tạo phòng"),
            ("self", "trip", "trip", "ký token LiveKit"),
            ("msg", "trip", "lk", "④ phân công tác nhân"),
            ("ret", "trip", "app", "200 token, phòng"),
            ("msg", "app", "lk", "⑤ vào phòng (WebRTC)"),
            ("msg", "lk", "agent", "⑥ giao việc"),
            ("msg", "agent", "trip", "⑧ PUT /session"),
            ("msg", "agent", "app", "⑤ lời chào"),
            ("msg", "agent", "trip", "⑧ GET /context"),
            ("ret", "trip", "agent", "ngữ cảnh"),
            ("msg", "agent", "app", "⑤ hỏi cần gì"),
        ],
        frames=[("opt [chưa có phòng]", 4, 4, "trip", "lk")],
    )
    s3 = sequence(
        "S3 Một lượt hội thoại",
        [app, agent, ai, trip, ddb_trip],
        [
            ("msg", "app", "agent", "⑤⑥ âm thanh"),
            ("msg", "agent", "ai", "⑦ STT"),
            ("self", "agent", "agent", "đếm 2 s"),
            ("msg", "agent", "ai", "⑦ LLM + công cụ"),
            ("msg", "agent", "app", "câu đệm"),
            ("ret", "ai", "agent", "gọi công cụ"),
            ("msg", "agent", "trip", "⑧ PATCH /trips/{id}"),
            ("msg", "trip", "ddb", "⑨ ghi trạng thái"),
            ("ret", "trip", "agent", "200"),
            ("msg", "agent", "ai", "⑦ LLM + TTS"),
            ("msg", "agent", "app", "⑤ câu trả lời"),
        ],
        frames=[("opt [quá 2 s]", 5, 5, "app", "agent")],
    )
    s4 = sequence(
        "S4 Mời nhận chuyến",
        [admin, trip, lk, twilio, agent, wsgw],
        [
            ("msg", "admin", "trip", "⑰ POST /dispatch"),
            ("msg", "trip", "lk", "④ tạo phòng"),
            ("msg", "trip", "lk", "④ phân công tác nhân"),
            ("msg", "trip", "lk", "④ người tham gia SIP"),
            ("msg", "lk", "tw", "⑪ SIP INVITE"),
            ("msg", "trip", "ws", "⑩ trạng thái calling"),
            ("msg", "agent", "tw", "hỏi nhận chuyến"),
            ("msg", "agent", "trip", "⑧ PATCH /trips/{id}"),
            ("msg", "trip", "ws", "⑩ trạng thái mới"),
        ],
        frames=[("opt [có SIP trunk]", 4, 5, "trip", "tw")],
    )
    s5 = sequence(
        "S5 Gọi khách và SMS",
        [agent, trip, lk, twilio, chan, ("ddbc", "DynamoDB", "channel-events")],
        [
            ("msg", "agent", "trip", "⑧ POST /calls/start"),
            ("msg", "trip", "lk", "④ agent, bridge"),
            ("msg", "trip", "lk", "④ background"),
            ("msg", "lk", "tw", "⑪ gọi khách"),
            ("ret", "trip", "agent", "200 call_id"),
            ("msg", "agent", "trip", "⑧ POST /calls/complete"),
            ("msg", "agent", "trip", "⑧ POST /sms/send"),
            ("msg", "trip", "chan", "⑫ POST /sms/send"),
            ("msg", "chan", "tw", "⑫ gửi SMS"),
            ("msg", "tw", "chan", "⑬ webhook"),
            ("msg", "chan", "ddbc", "㉒ lưu sự kiện"),
        ],
        frames=[("alt [chế độ gọi]", 2, 3, "trip", "lk")],
    )
    s6 = sequence(
        "S6 Nhật ký cuộc gọi",
        [agent, rec, ddb_rec, trip],
        [
            ("self", "agent", "agent", "tổng hợp bản ghi"),
            ("msg", "agent", "rec", "⑭ POST /records"),
            ("msg", "rec", "ddb", "⑯ lưu bản ghi"),
            ("ret", "rec", "agent", "201"),
            ("msg", "agent", "trip", "⑧ GET /calls/latest"),
            ("msg", "trip", "rec", "⑮ GET /records"),
            ("ret", "rec", "trip", "bản ghi gần nhất"),
            ("ret", "trip", "agent", "tóm tắt"),
        ],
        frames=[("opt [tài xế hỏi tóm tắt]", 5, 8, "agent", "trip")],
    )
    sched = ("sched", "Lịch chạy báo cáo", "EventBridge Scheduler")
    ops = ("ops", "Dịch vụ Giám sát vận hành", "ops-service")
    judge = ("judge", "Mô hình chấm", "LLM")
    ddb_rep = ("ddbr", "DynamoDB", "daily-reports")
    ui = ("ui", "Trang giám sát hệ thống", "super-admin-panel")
    s7 = sequence(
        "S7 Báo cáo ngày",
        [sched, ops, rec, judge, ddb_rep, ui],
        [
            ("msg", "sched", "ops", "⑲ 00:15 hằng ngày"),
            ("msg", "ops", "rec", "⑳ GET /records?date="),
            ("ret", "rec", "ops", "bản ghi của ngày"),
            ("self", "ops", "ops", "tổng hợp chỉ số"),
            ("msg", "ops", "judge", "㉘ chấm mẫu"),
            ("ret", "judge", "ops", "đúng / sai / không rõ"),
            ("msg", "ops", "ddbr", "㉑ lưu báo cáo"),
            ("msg", "ui", "ops", "GET /reports/daily"),
            ("ret", "ops", "ui", "báo cáo + xu hướng"),
        ],
        frames=[("opt [có khóa API]", 5, 6, "ops", "judge")],
    )
    return [s1, s2, s3, s4, s5, s6, s7]


# ─────────────────────────────────────────────────────────────────────────────
# Hình 4.9 — one conversational turn
# ─────────────────────────────────────────────────────────────────────────────

def pipeline() -> Diagram:
    """Hình 4.9 — luồng chính một hàng, vòng gọi công cụ dưới LLM, nguồn dữ liệu ở hàng dưới.
    Khung 1100 px, chữ 22/19 px: ≥ 8 pt khi in rộng 14,5 cm (check_layout.py PRINT)."""
    F, T = 22, 19
    d = Diagram("H4.9 Một lượt hội thoại", 1100, 760)

    def lab(title: str, tech: str = "") -> str:
        title, tech = tr(title), tr(tech)
        head = "<br>".join(f"<b>{escape(t)}</b>" for t in title.split("\n"))
        if not tech:
            return head
        small = "<br>".join(escape(t) for t in tech.split("\n"))
        return f'{head}<br><font style="font-size:{T}px;color:#545B64">{small}</font>'

    box = (f"rounded=1;whiteSpace=wrap;html=1;fillColor=#FFF4EC;strokeColor=#ED7100;fontSize={F};"
           f"spacing=8;fontColor={TEXT};" + FONT)
    ext = EXTERNAL_BOX.replace("fontSize=14;", f"fontSize={F};") + "whiteSpace=wrap;"
    edge = EDGE.replace("fontSize=13;", f"fontSize={F};")
    aux = edge + "dashed=1;"
    person = GENERAL_ICON.format(shape="user").replace("fontSize=14;", f"fontSize={F};")
    phone = GENERAL_ICON.format(shape="mobile_client").replace("fontSize=14;", f"fontSize={F};")

    d.vertex("mic", lab("Tài xế\nnói"), person, 20, 236, 44, 44)
    d.vertex("stt", lab("Nhận dạng\ngiọng nói", "STT chính\n→ dự phòng"), box, 90, 195, 200, 130)
    d.vertex("llm", lab("Mô hình ngôn ngữ", "LLM chính → dự phòng\nlược đồ công cụ\ntheo loại phiên"), box, 400, 185, 280, 150)
    d.vertex("tts", lab("Tổng hợp\ngiọng nói", "TTS chính\n→ dự phòng"), box, 790, 195, 200, 130)
    d.vertex("spk", lab("Phát\ntrả lời"), phone, 1030, 226, 44, 64)
    d.vertex("tool", lab("Gọi API nghiệp vụ", "backend_api\ntimeout 8 s / 25 s"), box, 400, 450, 280, 120)
    d.vertex("ctx", lab("Trạng thái phiên\nhội thoại", "context_store\ntải trước khi mở phiên"), ext, 60, 630, 330, 120)
    d.vertex("api", lab("Dịch vụ Chuyến đi\nvà Điều phối", "HTTPS qua API Gateway"), ext, 560, 630, 330, 120)
    d.vertex("filler", lab("Câu đệm", "turn_filler: quá 2 s chưa có âm thanh trả lời thì phát một lần;\n"
                                    "hủy khi câu trả lời thật bắt đầu"), ext, 330, 20, 700, 110)
    d.edge("p1", "mic", "stt", "", style=edge, ports=(1, .5, 0, .5))
    d.edge("p2", "stt", "llm", "văn bản", style=edge, ports=(1, .5, 0, .5))
    d.edge("p3", "llm", "tool", "gọi công cụ", style=edge, ports=(.25, 1, .25, 0))
    d.edge("p4", "tool", "llm", "kết quả", style=edge, ports=(.75, 0, .75, 1))
    d.edge("p5", "llm", "tts", "trả lời", style=edge, ports=(1, .5, 0, .5))
    d.edge("p6", "tts", "spk", "", style=edge, ports=(1, .5, 0, .5))
    d.edge("p7", "tool", "ctx", "đọc trước", style=aux, ports=(0, .5, .5, 0), points=[(225, 510)])
    d.edge("p8", "tool", "api", "thiếu dữ liệu / ghi", style=aux, ports=(.7, 1, .109, 0))
    d.edge("p9", "filler", "spk", "", style=aux, ports=(1, .5, .5, 0), points=[(1052, 75)])
    return d


# ─────────────────────────────────────────────────────────────────────────────
# Hình 3.1, 3.2 — sơ đồ use case UML theo chân dung người sử dụng
# ─────────────────────────────────────────────────────────────────────────────

UC_PX = 22  # in rộng 14,5 cm trên khung ~1000 px: ≥ 8 pt


def _uc_page(name: str, groups: list[tuple[str, str, list[tuple[str, str]]]],
             support: list[tuple[str, str, list[str]]], height: int) -> Diagram:
    """groups: (actor_id, actor_label, [(uc_id, text)]); support: (id, label, [uc_id])."""
    d = Diagram(name, 1000, height)
    F = UC_PX
    actor = (f"shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;"
             f"fillColor=#FFFFFF;strokeColor=#232F3E;strokeWidth=2;fontSize={F};fontStyle=1;fontColor={TEXT};" + FONT)
    ell = (f"ellipse;whiteSpace=wrap;html=1;fillColor=#F2F6FC;strokeColor=#3B5B8C;strokeWidth=1.5;"
           f"fontSize={F};fontColor={TEXT};spacing=6;" + FONT)
    boundary = (f"rounded=0;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#545B64;strokeWidth=1.5;"
                f"verticalAlign=top;align=center;fontSize={F + 2};fontStyle=1;fontColor={TEXT};spacingTop=6;" + FONT)
    line = f"endArrow=none;html=1;strokeColor=#545B64;strokeWidth=1.3;" + FONT
    n = sum(len(u) for _, _, u in groups)
    gap_group = 26
    top, step, h = 72, 90, 74
    bottom = top + n * step + (len(groups) - 1) * gap_group
    d.vertex("sys", "Hệ thống trợ lý giọng nói hỗ trợ tài xế", boundary, 250, 15, 520, bottom - 15 + 14)
    y = top
    for gid, glabel, ucs in groups:
        y0 = y
        for uid, text in ucs:
            d.vertex(uid, f"<b>{escape(uid)}</b><br>{escape(text)}", ell, 270, y, 480, h)
            y += step
        mid = (y0 + y - step + h) / 2
        d.vertex(gid, escape(glabel).replace("\n", "<br>"), actor, 95, mid - 45, 44, 80)
        for uid, _ in ucs:
            d.edge(f"e-{gid}-{uid}", gid, uid, "", style=line, ports=(1, .4, 0, .5))
        y += gap_group
    for k, (sid, slabel, targets) in enumerate(support):
        ys = [float(c.split('y="')[1].split('"')[0]) for c in d.cells if any(f'id="{t}"' in c for t in targets)]
        mid = sum(ys) / len(ys) + h / 2 if ys else 200 + 200 * k
        d.vertex(sid, escape(slabel).replace("\n", "<br>"), actor.replace("fontStyle=1;", "fontStyle=0;"),
                 860, mid - 45, 44, 80)
        for t in targets:
            d.edge(f"e-{sid}-{t}", t, sid, "", style=line, ports=(1, .5, 0, .4))
    return d


def usecases() -> list[Diagram]:
    driver = _uc_page(
        "H3.1 Use case: Tài xế",
        [("a-driver", "Tài xế", [
            ("UC01", "Xem lịch chuyến"),
            ("UC02", "Nhận hoặc từ chối chuyến khi được gọi mời"),
            ("UC03", "Cập nhật tiến độ chuyến"),
            ("UC05", "Hủy chuyến hai bước"),
            ("UC16", "Tạo chuyến vãng lai, hỏi lộ trình"),
            ("UC04", "Liên lạc với khách hàng"),
            ("UC15", "Chờ đón khách"),
            ("UC06", "Báo khách vắng mặt hoặc sự cố"),
            ("UC08", "Xem thu nhập, bật/tắt nhận chuyến"),
            ("UC07", "Hỏi cách sử dụng"),
            ("UC10", "Mở trợ lý bằng từ khóa đánh thức"),
            ("UC09", "Kết thúc phiên trợ lý"),
        ])],
        [("s-voice", "Hệ thống thoại\n(LiveKit, Twilio)", ["UC02", "UC04"])],
        1190,
    )
    others = _uc_page(
        "H3.2 Use case: Khách hàng, Điều phối viên, Quản trị viên hệ thống",
        [("a-customer", "Khách hàng", [
            ("UC12", "Nhận cuộc gọi từ trợ lý hoặc tài xế"),
            ("UC13", "Nhận tin nhắn xác nhận chuyến"),
         ]),
         ("a-dispatcher", "Điều phối viên", [
            ("UC14", "Tạo chuyến và mời tài xế"),
            ("UC17", "Quản lý tài xế, khách hàng, cuộc gọi"),
         ]),
         ("a-sysadmin", "Quản trị viên\nhệ thống", [
            ("UC18", "Giám sát dịch vụ, cấu hình, nhật ký"),
            ("UC11", "Xem báo cáo vận hành ngày"),
         ])],
        [("s-voice2", "Hệ thống thoại\n(LiveKit, Twilio)", ["UC12", "UC13", "UC14"]),
         ("s-timer", "Bộ hẹn giờ\n(EventBridge)", ["UC11"])],
        690,
    )
    return [driver, others]


if __name__ == "__main__":
    for LANG, suffix in (("vn", ""), ("en", "_en")):   # _en: bản tiếng Anh cho README
        write(OUT_DIR / f"H4_1_aws_architecture{suffix}.drawio", [architecture(v) for v in ARCH_VIEWS])
        write(OUT_DIR / f"H4_sequences{suffix}.drawio", sequences())
        write(OUT_DIR / f"H4_2_turn_pipeline{suffix}.drawio", [pipeline()])
        write(OUT_DIR / f"H3_usecases{suffix}.drawio", usecases())
