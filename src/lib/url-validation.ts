const INVALID = "URL inválida";

export interface UrlValidationResult {
  valid: boolean;
  url: string;
  error?: string;
}

export function validateUrl(input: string): UrlValidationResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return { valid: false, url: trimmed, error: INVALID };
  }

  let normalized = trimmed;
  if (!/^https?:\/\//i.test(normalized)) {
    if (/^[^\s]+\.[^\s]+/.test(normalized)) {
      normalized = `https://${normalized}`;
    } else {
      return { valid: false, url: trimmed, error: INVALID };
    }
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return { valid: false, url: trimmed, error: INVALID };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { valid: false, url: trimmed, error: INVALID };
  }

  if (!parsed.hostname.includes(".")) {
    return { valid: false, url: trimmed, error: INVALID };
  }

  return { valid: true, url: normalized };
}
