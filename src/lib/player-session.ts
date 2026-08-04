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
