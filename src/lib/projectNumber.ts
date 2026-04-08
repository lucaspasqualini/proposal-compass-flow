export function parseProjectNumber(value: string | null | undefined) {
  if (!value) return null;

  const match = value.trim().match(/^MA_(\d+)_(\d{2})(?:_(\d+))?$/i);
  if (!match) return null;

  return {
    sequence: Number.parseInt(match[1], 10) || 0,
    year: Number.parseInt(match[2], 10) || 0,
    subproject: Number.parseInt(match[3] ?? "0", 10) || 0,
  };
}

export function compareProjectNumbers(a: string | null | undefined, b: string | null | undefined) {
  const left = a ?? "";
  const right = b ?? "";

  if (left === right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  if (left === "(vazio)") return 1;
  if (right === "(vazio)") return -1;

  const parsedLeft = parseProjectNumber(left);
  const parsedRight = parseProjectNumber(right);

  if (parsedLeft && parsedRight) {
    if (parsedLeft.year !== parsedRight.year) return parsedLeft.year - parsedRight.year;
    if (parsedLeft.sequence !== parsedRight.sequence) return parsedLeft.sequence - parsedRight.sequence;
    return parsedLeft.subproject - parsedRight.subproject;
  }

  if (parsedLeft) return -1;
  if (parsedRight) return 1;

  return left.localeCompare(right, "pt-BR", { numeric: true, sensitivity: "base" });
}