import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 30 },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      const isPlatformLogin = path === "/platform/login";
      const isPlatform = path.startsWith("/platform");
      const role = auth?.user?.role as Role | undefined;

      // Public platform login — middleware styles/redirects handle sessions
      if (isPlatformLogin) return true;

      if (!auth?.user) return false;

      if (isPlatform) {
        return role === "platform_admin";
      }

      if (role === "platform_admin" && !isPlatform) {
        // Let middleware redirect platform admins away from cafe routes
        return true;
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.username = (user as { username?: string }).username || "";
        token.role = (user as { role?: string }).role as never;
        token.cafeId = (user as { cafeId?: number | null }).cafeId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.username = token.username as string;
      session.user.role = token.role as never;
      (session.user as { cafeId?: number | null }).cafeId =
        (token.cafeId as number | null) ?? null;
      return session;
    },
  },
} satisfies NextAuthConfig;
