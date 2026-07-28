import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  username: string;
  role: Role;
  cafeId: number | null;
};

export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user as SessionUser;
}

export async function requireCafeUser(): Promise<SessionUser & { cafeId: number }> {
  const user = await requireUser();
  if (user.role === "platform_admin") redirect("/platform");
  // Login page must render this error without bouncing back to cafe routes
  if (user.cafeId == null) redirect("/login?error=cafe");
  return user as SessionUser & { cafeId: number };
}

export async function requireRoles(roles: Role[]) {
  const user = await requireCafeUser();
  if (!roles.includes(user.role)) redirect("/dashboard?denied=1");
  return user;
}

export async function requirePlatformAdmin() {
  const user = await requireUser();
  if (user.role !== "platform_admin") redirect("/dashboard?denied=1");
  return user;
}

export function money(n: number | string | { toString(): string }) {
  return `${Number(n).toFixed(2)} ETB`;
}

export const CAFE_ROLES: Role[] = [
  "admin",
  "manager",
  "auditor",
  "server",
  "kitchen",
  "staff",
];

export const ROLE_LABEL: Record<Role, string> = {
  platform_admin: "Platform",
  admin: "Admin",
  manager: "Manager",
  auditor: "Auditor",
  server: "Waiter",
  kitchen: "Kitchen",
  staff: "Cashier",
};
