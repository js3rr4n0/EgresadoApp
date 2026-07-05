/**
 * Session management using JWT (jose) + cookies.
 * Following Next.js 16 auth guide: stateless sessions with encrypted JWTs.
 */
import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export type UserRole = "admin" | "decanato" | "asesor" | "egresado";

export interface SessionPayload {
  userId: number;
  rol: UserRole;
  nombreCompleto: string;
  correo: string;
  expiresAt: Date;
}

const secretKey = process.env.AUTH_SECRET!;
const encodedKey = new TextEncoder().encode(secretKey);
const SESSION_COOKIE = "session";
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload, expiresAt: payload.expiresAt.toISOString() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

export async function decrypt(
  session: string | undefined = ""
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    });
    return {
      userId: payload.userId as number,
      rol: payload.rol as UserRole,
      nombreCompleto: payload.nombreCompleto as string,
      correo: payload.correo as string,
      expiresAt: new Date(payload.expiresAt as string),
    };
  } catch {
    return null;
  }
}

export async function createSession(user: {
  id: number;
  rol: string;
  nombreCompleto: string;
  correo: string;
}): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION);
  const session = await encrypt({
    userId: user.id,
    rol: user.rol as UserRole,
    nombreCompleto: user.nombreCompleto,
    correo: user.correo,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  if (!session) return null;
  return decrypt(session);
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Map role → dashboard path */
export function getDashboardPath(rol: UserRole): string {
  const paths: Record<UserRole, string> = {
    admin: "/admin",
    decanato: "/decanato",
    asesor: "/asesor",
    egresado: "/egresado",
  };
  return paths[rol];
}
