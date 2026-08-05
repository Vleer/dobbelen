/** Small, non-sensitive preference keys persisted in localStorage. */

export const PrefKeys = {
  soundMuted: "soundMuted",
  lastUsername: "lastUsername",
  lobbyExpanded: "lobbyExpanded",
  minitutorialEnabled: "minitutorial_enabled",
} as const;

export function getBoolPref(key: string, defaultValue = false): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return raw === "true";
  } catch {
    return defaultValue;
  }
}

export function setBoolPref(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* ignore */
  }
}

export function getStringPref(key: string, defaultValue = ""): string {
  try {
    return localStorage.getItem(key) ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setStringPref(key: string, value: string): void {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
