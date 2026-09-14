export function cookieSecure(request?: Request): boolean {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;
  const proto = request?.headers.get("x-forwarded-proto");
  if (proto === "https") return true;
  if (proto === "http") return false;
  const origin = request?.headers.get("origin") ?? process.env.APP_ORIGIN ?? "";
  return origin.startsWith("https://") || process.env.NODE_ENV === "production";
}
