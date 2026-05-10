import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id?: string;
    };
  }
}

const authSecret =
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  (process.env.NODE_ENV === "production" ? undefined : "wire-local-dev-secret");
const googleConfigured = Boolean(authSecret && process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret,
  providers: googleConfigured ? [Google] : [],
  pages: {
    signIn: "/login"
  },
  callbacks: {
    session({ session, token }) {
      if (session.user && typeof token.sub === "string") {
        session.user.id = token.sub;
      }
      return session;
    }
  }
});

export function isGoogleAuthConfigured(): boolean {
  return googleConfigured;
}
