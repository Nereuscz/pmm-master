import { NextRequest, NextResponse } from "next/server";
import { kbSearchSchema } from "@/lib/schemas";
import { retrieveTopChunks } from "@/lib/rag";
import { getAuthUser, unauthorized, canReadKb, forbidden } from "@/lib/auth-guard";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!canReadKb(user)) return forbidden();

  const payload = await request.json();
  const parsed = kbSearchSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Neplatný search payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const chunks = await retrieveTopChunks({
    projectId: "00000000-0000-0000-0000-000000000000",
    queryText: parsed.data.query,
    limit: parsed.data.limit
  });

  return NextResponse.json({ chunks });
}
