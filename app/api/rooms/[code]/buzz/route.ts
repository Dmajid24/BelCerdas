import { NextResponse } from "next/server";
import { cleanCode, pressBuzzer } from "@/lib/buzzer";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code: rawCode } = await context.params;
    const { teamId } = (await request.json()) as { teamId?: string };
    if (typeof teamId !== "string" || !teamId) return NextResponse.json({ error: "Identitas tim tidak valid." }, { status: 400 });
    return NextResponse.json(await pressBuzzer(cleanCode(rawCode), teamId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bel gagal dikirim.";
    const status = message.includes("tidak ditemukan") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
