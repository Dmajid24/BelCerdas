import { NextResponse } from "next/server";
import { cleanCode, joinRoom } from "@/lib/buzzer";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code: rawCode } = await context.params;
    const { teamName } = (await request.json()) as { teamName?: string };
    if (typeof teamName !== "string") return NextResponse.json({ error: "Nama tim wajib diisi." }, { status: 400 });
    return NextResponse.json(await joinRoom(cleanCode(rawCode), teamName), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal bergabung.";
    const status = message.includes("tidak ditemukan") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
