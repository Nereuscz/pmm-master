import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";

export type UserRole = "Admin" | "PM" | "Viewer";

export type AuthUser = {
  id: string;
  role: UserRole;
  email: string;
};

// Dev fallback: stejné ID jako FALLBACK_OWNER_ID v projects/route.ts
const DEV_FALLBACK: AuthUser = {
  id: "00000000-0000-0000-0000-000000000001",
  role: "Admin",
  email: "dev@pm-assistant.local"
};

const isDevMode = !process.env.AZURE_AD_CLIENT_ID;

/**
 * Vrátí přihlášeného uživatele nebo null.
 * V dev módu (chybí AZURE_AD_CLIENT_ID) vrací fallback Admin uživatele.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  if (isDevMode) {
    return DEV_FALLBACK;
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  return {
    id: session.user.id,
    role: (session.user.role as UserRole) ?? "PM",
    email: session.user.email ?? ""
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
