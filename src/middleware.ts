import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

function isPublicPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/auth/");
}

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    if (user && pathname === "/login") {
      return NextResponse.redirect(new URL("/whatsapp", request.url));
    }
    return response;
  }

  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
