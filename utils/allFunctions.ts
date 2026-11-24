
// -------------------------
// Validaciones previas (QA/SOC)
// -------------------------

export function looksLikeEmail(user: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.trim());
}

export function normalizeRutInput(raw: string): string {
  // Deja solo dígitos + K/k, y agrega guion antes del DV si hace falta.
  // Soporta: 11111111, 1111111-1, 11111111-1, 1.111.111-1, 11111111-k, 1111111k
  const v = raw.trim().replace(/\./g, "").replace(/\s+/g, "");

  // Si ya viene con guion y DV:
  if (/^\d{7,8}-[0-9kK]$/.test(v)) return v;

  // Si viene sin guion pero con DV al final (ej 11111111k o 11111111K)
  if (/^\d{7,8}[0-9kK]$/.test(v)) {
    return `${v.slice(0, -1)}-${v.slice(-1)}`;
  }

  // Si viene solo números (sin DV) -> inválido para login del portal
  return v;
}


export function isRutAcceptableForPortal(raw: string): { ok: boolean; rut: string; reason?: string } {
  const user = raw.trim();

  if (!user) return { ok: false, rut: "", reason: "User vacío" };
  if (looksLikeEmail(user)) return { ok: false, rut: "", reason: "User es email (se requiere RUT)" };

  const normalized = normalizeRutInput(user);

  // Requisito mínimo: 7-8 dígitos + '-' + DV
  if (!/^\d{7,8}-[0-9kK]$/.test(normalized)) {
    return { ok: false, rut: "", reason: `Formato RUT inválido: "${raw}"` };
  }

  return { ok: true, rut: normalized };
}


export function isValidClaveWeb(clave: string): boolean {
  return /^\d{6}$/.test(clave.trim());
}