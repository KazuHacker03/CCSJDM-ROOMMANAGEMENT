export const ROLES = ['superadmin', 'admin', 'editor', 'viewer', 'professor'];
export const STATUSES = ['pending', 'approved', 'rejected'];
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const CURRENT_SEMESTER = 'A.Y. 2026-2027 · 1st Semester';

export function normalizeRole(r) {
  const v = String(r || '').toLowerCase();
  return ROLES.includes(v) ? v : 'viewer';
}

// "9:00 AM" -> 540. Returns null if the format is invalid.
export function toMinutes(text) {
  const m = /^\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*$/i.exec(text || '');
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 1 || h > 12 || min > 59) return null;
  let hour24 = h % 12;
  if (m[3].toUpperCase() === 'PM') hour24 += 12;
  return hour24 * 60 + min;
}