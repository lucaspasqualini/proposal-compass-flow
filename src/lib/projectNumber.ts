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

/**
 * Try to infer the 2-digit year from a non-standard project number.
 * Looks for patterns like "25", "2025", etc. Returns null if no year found.
 */
function inferYear(value: string): number | null {
  // Try 4-digit year first (e.g. "2025")
  const fourDigit = value.match(/20(\d{2})/);
  if (fourDigit) return Number.parseInt(fourDigit[1], 10);
  // Try 2-digit year preceded by _ or - (e.g. "_25")
  const twoDigit = value.match(/[_\-](\d{2})(?:\b|[_\-])/);
  if (twoDigit) return Number.parseInt(twoDigit[1], 10);
  return null;
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

  // Both standard: compare by year > sequence > subproject
  if (parsedLeft && parsedRight) {
    if (parsedLeft.year !== parsedRight.year) return parsedLeft.year - parsedRight.year;
    if (parsedLeft.sequence !== parsedRight.sequence) return parsedLeft.sequence - parsedRight.sequence;
    return parsedLeft.subproject - parsedRight.subproject;
  }

  // Non-standard numbers: place at the beginning of their inferred year
  if (parsedLeft && !parsedRight) {
    const inferredYear = inferYear(right);
    if (inferredYear !== null) {
      if (parsedLeft.year !== inferredYear) return parsedLeft.year - inferredYear;
      // Same year: non-standard goes first (sequence = -1)
      return 1;
    }
    return 1; // no year inferred: non-standard goes to very beginning
  }

  if (!parsedLeft && parsedRight) {
    const inferredYear = inferYear(left);
    if (inferredYear !== null) {
      if (inferredYear !== parsedRight.year) return inferredYear - parsedRight.year;
      return -1; // same year: non-standard goes first
    }
    return -1;
  }

  // Both non-standard: try to compare by inferred year, then alphabetically
  const yearLeft = inferYear(left);
  const yearRight = inferYear(right);
  if (yearLeft !== null && yearRight !== null && yearLeft !== yearRight) {
    return yearLeft - yearRight;
  }

  return left.localeCompare(right, "pt-BR", { numeric: true, sensitivity: "base" });
}