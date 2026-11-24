type Position = { slug: string; section: number };
const key = (userId: string) => `powerlab:reading-position:${userId}`;

export function readPosition(userId: string): Position | null {
  try {
    const value = JSON.parse(localStorage.getItem(key(userId)) ?? 'null');
    return value && typeof value.slug === 'string' && Number.isInteger(value.section) && value.section >= 0 ? value : null;
  } catch {
    return null;
  }
}

export function savePosition(userId: string, position: Position) {
  try { localStorage.setItem(key(userId), JSON.stringify(position)); } catch { /* Storage is optional. */ }
}
