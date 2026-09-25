const REGIONAL_INDICATOR_A = 0x1f1e6;
const LETTER_A = "A".charCodeAt(0);

export function flagEmoji(code: string | null | undefined): string {
  if (typeof code !== "string") {
    return "";
  }

  const normalized = code.trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(normalized)) {
    return "";
  }

  return String.fromCodePoint(
    ...Array.from(normalized, (letter) =>
      REGIONAL_INDICATOR_A + letter.charCodeAt(0) - LETTER_A
    )
  );
}
