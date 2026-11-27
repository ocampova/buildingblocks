import { NextResponse, type NextRequest } from "next/server";
import { decodeJwt } from "jose";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * Solo redirige a /login si no hay sesión. La firma se verifica en cada página
 * (requireUser / requireMember), en el servidor, con AUTH_SECRET disponible en tiempo de ejecución.
 */
function hasSession(token: string | undefined) {
  if (!token) return false;
  try {
    const { exp } = decodeJwt(token);
    return !(typeof exp === "number" && exp * 1000 < Date.now());
  } catch {
    return false;
  }
}

export function middleware(req: NextRequest) {
  if (hasSession(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  const url = new URL("/login", req.url);
  const { pathname } = req.nextUrl;
  if (pathname !== "/") url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/", "/p/:path*", "/proyectos"] };
