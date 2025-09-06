export function getCookie(key: string): string | null {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [k, v] = cookie.trim().split('=');
    if (k === key) {
      return decodeURIComponent(v);
    }
  }
  return null;
}

export function setCookie(key: string, value: string, days = 7): void {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${key}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}
