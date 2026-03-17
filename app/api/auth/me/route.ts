import { NextResponse } from "next/server";
import { canManageKb, canProcess, canReadKb, getAuthUser, isAdmin } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ role: null }, { status: 401 });
  }
  return NextResponse.json({
    role: user.role,
    name: user.name,
    email: user.email,
    permissions: {
      isAdmin: isAdmin(user),
      canReadKb: canReadKb(user),
      canManageKb: canManageKb(user),
      canProcess: canProcess(user),
    }
  });
}
