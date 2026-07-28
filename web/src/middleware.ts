import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const path = req.nextUrl.pathname;
  const role = req.auth?.user?.role as string | undefined;
  const isLoggedIn = !!req.auth?.user;

  // Platform login is public — never bounce through cafe /login
  if (path === "/platform/login") {
    if (isLoggedIn && role === "platform_admin") {
      return NextResponse.redirect(new URL("/platform", req.nextUrl.origin));
    }
    if (isLoggedIn && role !== "platform_admin") {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
    }
    return NextResponse.next();
  }

  if (path.startsWith("/platform")) {
    if (!isLoggedIn) {
      const url = new URL("/platform/login", req.nextUrl.origin);
      url.searchParams.set("callbackUrl", path);
      return NextResponse.redirect(url);
    }
    if (role !== "platform_admin") {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
    }
    return NextResponse.next();
  }

  // Cafe app routes
  if (!isLoggedIn) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(url);
  }

  if (role === "platform_admin") {
    return NextResponse.redirect(new URL("/platform", req.nextUrl.origin));
  }

  return NextResponse.next();
});

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
    "/server/:path*",
    "/waste/:path*",
    "/shifts/:path*",
    "/payroll/:path*",
    "/suppliers/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/platform",
    "/platform/:path*",
  ],
};
