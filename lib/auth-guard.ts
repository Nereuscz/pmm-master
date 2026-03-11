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

/** Vrátí přihlášeného uživatele nebo null. V dev módu (bez Asana provideru) vrací fallback Admin. */
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

  // Dev fallback – pokud chybí plná auth konfigurace a jsme v dev, vrať Admin
  const hasFullAuth =
    !!process.env.ASANA_CLIENT_ID &&
    !!process.env.ASANA_CLIENT_SECRET &&
    !!process.env.NEXTAUTH_SECRET;
  if (!hasFullAuth && process.env.NODE_ENV !== "production") {
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
