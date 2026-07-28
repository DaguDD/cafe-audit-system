import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      username: string;
      role: Role;
      cafeId: number | null;
    };
  }
  interface User {
    username: string;
    role: Role;
    cafeId: number | null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  trustHost: true,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        audience: { label: "Audience", type: "text" },
      },
      async authorize(credentials) {
        const username = String(credentials?.username || "").trim();
        const password = String(credentials?.password || "");
        const audience = String(
          (credentials as { audience?: string } | undefined)?.audience || "cafe"
        ).trim();
        if (!username || !password) return null;

        const user = await prisma.user.findUnique({ where: { username } });
        if (!user || user.status !== "active") return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        if (audience === "platform") {
          if (user.role !== "platform_admin") return null;
        } else if (user.role === "platform_admin") {
          // Cafe login must not accept platform credentials
          return null;
        }

        if (user.role !== "platform_admin" && user.cafeId) {
          const cafe = await prisma.cafe.findUnique({ where: { id: user.cafeId } });
          if (!cafe || cafe.status === "suspended") return null;
        }

        await prisma.loginLog.create({
          data: {
            userId: user.id,
            cafeId: user.cafeId,
            action: "login",
          },
        });

        return {
          id: String(user.id),
          name: user.fullName,
          username: user.username,
          role: user.role,
          cafeId: user.cafeId,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.username = user.username;
        token.role = user.role;
        token.cafeId = user.cafeId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.username = token.username as string;
      session.user.role = token.role as Role;
      session.user.cafeId = (token.cafeId as number | null) ?? null;
      return session;
    },
  },
});
