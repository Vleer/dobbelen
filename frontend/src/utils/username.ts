export const MAX_USERNAME_LENGTH = 12;

export function sanitizeUsername(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').slice(0, MAX_USERNAME_LENGTH);
}
