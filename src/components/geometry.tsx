const rectangles = [
  [34, 52, 118, 76], [204, 14, 232, 132], [520, 62, 72, 72], [674, 18, 274, 168], [1022, 84, 112, 112],
  [104, 266, 220, 138], [408, 242, 98, 98], [578, 332, 268, 154], [946, 278, 174, 104], [14, 446, 76, 76],
];

function Rectangles() {
  return rectangles.map(([x, y, width, height]) => <rect key={`${x}-${y}`} x={x} y={y} width={width} height={height} />);
}

export function Geometry({ repeat = false, accent = false, idPrefix = "hero" }: { repeat?: boolean; accent?: boolean; idPrefix?: string }) {
  if (repeat) {
    const patternId = accent ? `${idPrefix}-geometry-pattern-accent` : `${idPrefix}-geometry-pattern`;
    return <svg className={`geometry${accent ? " geometry--accent" : ""}`} aria-hidden="true">
      <defs><pattern id={patternId} width="1200" height="560" patternUnits="userSpaceOnUse"><Rectangles /></pattern></defs>
      <rect className="geometry__plane" width="100%" height="100%" />
    </svg>;
  }

  return <svg className="geometry" viewBox="0 0 1200 560" aria-hidden="true"><Rectangles /></svg>;
}
