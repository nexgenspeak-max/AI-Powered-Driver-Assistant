// Per-mount randomization for the light-mode glass specular highlight —
// each card/field/surface gets its own offset + rotation instead of every
// instance sharing one fixed top-left position, which read as a mechanical
// stamp repeated down a list (e.g. every TripCard having the identical
// glint in the identical spot). Dark mode is unaffected — callers only use
// this when isLight is true and keep their original fixed values otherwise.
//
// Call once per component instance via `useMemo(() => randomSpecularVariation(baseAngleDeg), [])`
// — an empty dep array so it's stable for the component's lifetime (doesn't
// re-roll on every re-render), not recomputed from any prop.
export interface SpecularVariation {
  /** Fraction of the surface's own half-width/half-height, roughly -0.6..0.6 — feed directly into the native shader's `specularOffset` uniform. */
  offsetX: number;
  offsetY: number;
  /** Final angle in degrees (base +/- a random 15-30deg deviation) — use directly for the web fallback's `rotate(${angleDeg}deg)`, or convert to radians for the native shader's `specularAngle` uniform. */
  angleDeg: number;
  /** Relative highlight size variation for light mode surfaces, 0.82..1.14. */
  sizeScale: number;
}

export function randomSpecularVariation(
  baseAngleDeg: number,
): SpecularVariation {
  const offsetX = Math.random() * 1.1 - 0.55; // -0.55..0.55 — left, center, or right
  const offsetY = Math.random() * 0.7 - 0.55; // -0.55..0.15 — stays broadly in the upper half, some spread
  const deviation = 15 + Math.random() * 15; // 15..30deg, per spec
  const sign = Math.random() < 0.5 ? -1 : 1;
  const sizeScale = 0.82 + Math.random() * 0.32; // 0.82..1.14 — slightly variable highlight size
  return {
    offsetX,
    offsetY,
    angleDeg: baseAngleDeg + sign * deviation,
    sizeScale,
  };
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
