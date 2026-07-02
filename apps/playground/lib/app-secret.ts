const DEV_APP_SECRET = "wire-local-dev-secret";

export function requireAppSecret(purpose: string): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${purpose} requires AUTH_SECRET or NEXTAUTH_SECRET in production.`);
  }
  return DEV_APP_SECRET;
}
