/**
 * RBAC Proxy — Next.js 16 (replaces middleware.ts)
 *
 * Routes:
 *   /admin/**    → only role 'admin'
 *   /decanato/** → only role 'decanato'
 *   /asesor/**   → only role 'asesor'
 *   /egresado/** → only role 'egresado'
 *   /login       → public (redirects to dashboard if already logged in)
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const encodedKey = new TextEncoder().encode(process.env.AUTH_SECRET!);

// Role → allowed path prefix
const ROLE_PATHS: Record<string, string> = {
  admin: "/admin",
  decanato: "/decanato",
  asesor: "/asesor",
  egresado: "/egresado",
};

const PROTECTED_PREFIXES = ["/admin", "/decanato", "/asesor", "/egresado"];
const PUBLIC_PATHS = ["/login", "/"];

async function getSessionFromCookie(
  request: NextRequest
): Promise<{ userId: number; rol: string } | null> {
  const session = request.cookies.get("session")?.value;
  if (!session) return null;

  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    });
    return {
      userId: payload.userId as number,
      rol: payload.rol as string,
    };
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const session = await getSessionFromCookie(request);

  // Check if this is a protected route
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    path.startsWith(prefix)
  );
  const isPublic = PUBLIC_PATHS.includes(path);

  // Protected route without session → redirect to login
  if (isProtected && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", path);
    return NextResponse.redirect(loginUrl);
  }

  // Protected route with session → check role
  if (isProtected && session) {
    const allowedPrefix = ROLE_PATHS[session.rol];
    if (!allowedPrefix || !path.startsWith(allowedPrefix)) {
      // Wrong role → redirect to their own dashboard
      const correctPath = ROLE_PATHS[session.rol] || "/login";
      return NextResponse.redirect(new URL(correctPath, request.url));
    }
  }

  // Public route (login, /) with session → redirect to dashboard
  if (isPublic && session) {
    const dashboardPath = ROLE_PATHS[session.rol] || "/login";
    return NextResponse.redirect(new URL(dashboardPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - api routes
     * - static files
     * - image optimization
     * - favicon, etc.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
