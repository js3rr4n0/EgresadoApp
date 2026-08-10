/**
 * Auth Server Actions — login and logout.
 */
"use server";

import { redirect } from "next/navigation";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { usuarios } from "@/lib/schema";
import { createSession, deleteSession, getDashboardPath, type UserRole } from "@/lib/session";

export interface LoginState {
  error?: string;
}

export async function login(
  _prevState: LoginState | undefined,
  formData: FormData
): Promise<LoginState> {
  const correo = formData.get("correo") as string;
  const password = formData.get("password") as string;

  if (!correo || !password) {
    return { error: "Correo y contraseña son requeridos." };
  }

  // Find user by email
  const [user] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.correo, correo))
    .limit(1);

  if (!user || !user.activo) {
    return { error: "Credenciales inválidas." };
  }

  // Verify password
  const passwordMatch = await compare(password, user.passwordHash);
  if (!passwordMatch) {
    return { error: "Credenciales inválidas." };
  }

  // Create session
  await createSession({
    id: user.id,
    rol: user.rol,
    nombreCompleto: user.nombreCompleto,
    correo: user.correo,
  });

  // Redirect to role-specific dashboard
  redirect(getDashboardPath(user.rol as UserRole));
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
