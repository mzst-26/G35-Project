const CSRF_COOKIE_NAME = 'csrf-token';

export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const target = `${CSRF_COOKIE_NAME}=`;
  const cookie = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(target));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.slice(target.length));
}
