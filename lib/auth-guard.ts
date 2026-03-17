import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";
import { isDevAuthBypassEnabled } from "./auth-config";

export type UserRole = "Admin" | "PM" | "Viewer";

export type AuthUser = {
  id: string;
  role: UserRole;
  email: string;
  name?: string | null;
};

/** Vrátí přihlášeného uživatele nebo null. Dev fallback funguje jen při explicitním bypassu. */
export async function getAuthUser(): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    return {
      id: session.user.id,
      role: (session.user.role as UserRole) ?? "PM",
      email: session.user.email ?? "",
      name: session.user.name ?? null
    };
  }

  // Dev fallback je explicitní opt-in, aby nechybějící env nevypnuly autentizaci.
  if (isDevAuthBypassEnabled()) {
    return {
      id: "dev-user",
      role: "Admin",
      email: "dev@localhost",
      name: "Dev User"
    };
  }

  return null;
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
