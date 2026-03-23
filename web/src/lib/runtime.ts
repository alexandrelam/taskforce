function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

export function buildApiUrl(path: string): string {
  return normalizePath(path);
}

export function buildWebSocketUrl(path: string, searchParams?: URLSearchParams): string {
  const normalizedPath = normalizePath(path);
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const query = searchParams?.toString();
  const suffix = query ? `${normalizedPath}?${query}` : normalizedPath;

  return `${protocol}//${window.location.host}${suffix}`;
}
