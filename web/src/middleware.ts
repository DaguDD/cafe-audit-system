import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/inventory/:path*",
    "/products/:path*",
    "/audit/:path*",
    "/tables/:path*",
    "/orders/:path*",
    "/kitchen/:path*",
    "/payments/:path*",
    "/sales/:path*",
  ],
};
