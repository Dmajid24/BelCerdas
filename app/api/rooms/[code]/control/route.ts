import { NextResponse } from "next/server";
import { cleanCode, controlRoom } from "@/lib/buzzer";

type Action = "open" | "next" | "close";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code: rawCode } = await context.params;
    const { hostToken, action } = (await request.json()) as { hostToken?: string; action?: Action };
    if (!hostToken || !action || !["open", "next", "close"].includes(action)) {
      return NextResponse.json({ error: "Perintah panitia tidak valid." }, { status: 400 });
    }
    return NextResponse.json({ room: await controlRoom(cleanCode(rawCode), hostToken, action) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Perintah gagal.";
    const status = message.includes("Akses") ? 403 : message.includes("tidak ditemukan") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
