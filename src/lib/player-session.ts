export function getToken(code: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(`mw_token_${code.toUpperCase()}`);
}

export function setToken(code: string, token: string) {
  window.localStorage.setItem(`mw_token_${code.toUpperCase()}`, token);
}

export function getNickname(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("mw_nickname") ?? "";
}

export function setNickname(name: string) {
  window.localStorage.setItem("mw_nickname", name);
}

// Persistent, device-local key that owns a host's saved question library.
export function getHostKey(): string {
  if (typeof window === "undefined") return "";
  let key = window.localStorage.getItem("mw_host_key");
  if (!key) {
    key = crypto.randomUUID().replace(/-/g, "");
    window.localStorage.setItem("mw_host_key", key);
  }
  return key;
}
