import { NextResponse } from "next/server";
import { cleanCode, readRoom } from "@/lib/buzzer";

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code: rawCode } = await context.params;
    const room = await readRoom(cleanCode(rawCode));
    if (!room) return NextResponse.json({ error: "Room tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ room });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Status room gagal dimuat." }, { status: 500 });
  }
}
