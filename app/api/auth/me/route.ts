import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ role: null }, { status: 401 });
  }
  return NextResponse.json({ role: user.role });
}
