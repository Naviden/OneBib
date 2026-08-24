const INVALID_FILE_NAME_CHARACTERS = /[\\/:*?"<>|]/g;

export function sanitizeBibliographyFileName(fileName: string): string {
  const baseName = fileName.split(/[\\/]/).pop()?.trim() ?? "";
  const cleaned = [...baseName]
    .map((character) => character.charCodeAt(0) <= 31 ? "-" : character)
    .join("")
    .replace(INVALID_FILE_NAME_CHARACTERS, "-");
  const stem = cleaned.toLowerCase().endsWith(".bib")
    ? cleaned.slice(0, -4).replace(/\.+$/g, "").trim()
    : cleaned.replace(/\.+$/g, "").trim();
  return `${stem || "bibliography"}.bib`;
}

export function findAvailableBibliographyPath(
  fileName: string,
  pathExists: (path: string) => boolean,
): string {
  const sanitized = sanitizeBibliographyFileName(fileName);
  if (!pathExists(sanitized)) return sanitized;

  const stem = sanitized.slice(0, -4);
  let suffix = 2;
  while (pathExists(`${stem}-${suffix}.bib`)) suffix += 1;
  return `${stem}-${suffix}.bib`;
}
