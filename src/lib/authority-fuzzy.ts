export function foldAuthorityText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim();
}

export function authorityEditDistance(left: string, right: string): number {
  const a = foldAuthorityText(left).slice(0, 80);
  const b = foldAuthorityText(right).slice(0, 80);
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j];
      row[j] = Math.min(above + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = above;
    }
  }
  return row[b.length];
}
