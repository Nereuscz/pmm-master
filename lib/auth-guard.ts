import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";

export type UserRole = "Admin" | "PM" | "Viewer";

export type AuthUser = {
  id: string;
  role: UserRole;
  email: string;
  name?: string | null;
};

/** Vrátí přihlášeného uživatele nebo null. */
export async function getAuthUser(): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  return {
    id: session.user.id,
    role: (session.user.role as UserRole) ?? "PM",
    email: session.user.email ?? "",
    name: session.user.name ?? null
  };
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Nepřihlášený uživatel." }, { status: 401 });
}

export function forbidden(): NextResponse {
  return NextResponse.json({ error: "Nedostatečná oprávnění." }, { status: 403 });
}

export function isAdmin(user: AuthUser): boolean {
  return user.role === "Admin";
}

/** Může číst KB dokumenty: Admin nebo PM */
export function canReadKb(user: AuthUser): boolean {
  return user.role === "Admin" || user.role === "PM";
}

/** Může spravovat KB (upload, delete, reindex, sync): jen Admin */
export function canManageKb(user: AuthUser): boolean {
  return user.role === "Admin";
}

/** Může zpracovávat transkripty a exportovat do Asany: Admin nebo PM */
export function canProcess(user: AuthUser): boolean {
  return user.role === "Admin" || user.role === "PM";
}
