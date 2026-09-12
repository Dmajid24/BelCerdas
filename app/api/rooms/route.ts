import { NextResponse } from "next/server";
import { createRoom } from "@/lib/buzzer";

export async function POST() {
  try {
    return NextResponse.json(await createRoom(), { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Room gagal dibuat. Periksa konfigurasi server." }, { status: 500 });
  }
}
