const squares = [
  [492, 43, 53, 55], [386, 96, 33, 33], [459, 114, 32, 32],
  [409, 161, 51, 51], [495, 171, 36, 38], [460, 224, 31, 31],
  [386, 225, 28, 27], [426, 259, 21, 21], [487, 272, 48, 49],
] as const;

export function BrandPixels({ symbol = false }: { symbol?: boolean }) {
  return <svg className={`brand-pixels${symbol ? " brand-pixels--symbol" : ""}`} viewBox={symbol ? "350 0 570 356" : "300 -6 1570 368"} preserveAspectRatio="none" aria-hidden="true" focusable="false">
    {squares.map(([x, y, width, height], index) => <rect key={`${x}-${y}`} x={x} y={y} width={width} height={height} rx={Math.min(width, height) * .06} style={{ animationDelay: `${index * -.34}s` }} />)}
  </svg>;
}
