import { NextRequest, NextResponse } from "next/server";
import { asanaImportSchema } from "@/lib/schemas";
import { getAuthUser, unauthorized, canProcess, forbidden } from "@/lib/auth-guard";
import { importParentTasksFromAsana } from "@/lib/asana-import";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!canProcess(user)) return forbidden();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Neplatný JSON v těle požadavku." }, { status: 400 });
  }

  const parsed = asanaImportSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Neplatná data.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await importParentTasksFromAsana(
      parsed.data.asanaProjectId,
      user.id
    );

    return NextResponse.json({
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import selhal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
