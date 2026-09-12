import { randomBytes, randomUUID } from "node:crypto";
import { getRedis } from "@/lib/redis";

export type RoomStatus = "waiting" | "open" | "locked";
export type PublicRoom = {
  code: string;
  status: RoomStatus;
  round: number;
  winnerTeamId: string | null;
  winnerTeam: string | null;
  responseTime: number | null;
  teamCount: number;
};

type StoredRoom = {
  status: "waiting" | "open";
  round: string | number;
  hostToken: string;
  openedAt: string | number;
  createdAt: string | number;
  teamCount: string | number;
};

type Winner = { teamId: string; teamName: string; winnerAt: number };

const ROOM_TTL_SECONDS = 24 * 60 * 60;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const roomKey = (code: string) => `belcerdas:room:${code}`;
const roomClaimKey = (code: string) => `belcerdas:claim:${code}`;
const teamNameKey = (code: string, name: string) => `belcerdas:room:${code}:name:${encodeURIComponent(name)}`;
const teamIdKey = (code: string, id: string) => `belcerdas:room:${code}:team:${id}`;
const winnerKey = (code: string, round: number) => `belcerdas:room:${code}:round:${round}:winner`;

export function cleanCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

function makeCode() {
  const bytes = randomBytes(6);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

function normalizeTeamName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("id-ID");
}

export async function createRoom() {
  const redis = getRedis();

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = makeCode();
    const hostToken = randomUUID();
    const reserved = await redis.set(roomClaimKey(code), hostToken, { nx: true, ex: ROOM_TTL_SECONDS });
    if (!reserved) continue;

    const now = Date.now();
    await redis.hset(roomKey(code), {
      status: "waiting",
      round: 1,
      hostToken,
      openedAt: 0,
      createdAt: now,
      teamCount: 0,
    });
    await redis.expire(roomKey(code), ROOM_TTL_SECONDS);
    return { code, hostToken };
  }

  throw new Error("Kode room gagal dibuat. Silakan coba lagi.");
}

export async function getStoredRoom(code: string) {
  const room = await getRedis().hgetall<StoredRoom>(roomKey(code));
  return room && Object.keys(room).length ? room : null;
}

export async function readRoom(code: string): Promise<PublicRoom | null> {
  const redis = getRedis();
  const room = await getStoredRoom(code);
  if (!room) return null;

  const round = Number(room.round);
  const winner = await redis.get<Winner>(winnerKey(code, round));
  const openedAt = Number(room.openedAt || 0);

  return {
    code,
    status: winner ? "locked" : room.status,
    round,
    winnerTeamId: winner?.teamId ?? null,
    winnerTeam: winner?.teamName ?? null,
    responseTime: winner && openedAt ? Math.max(0, winner.winnerAt - openedAt) : null,
    teamCount: Number(room.teamCount ?? 0),
  };
}

export async function joinRoom(code: string, requestedName: string) {
  const redis = getRedis();
  const room = await getStoredRoom(code);
  if (!room) throw new Error("Room tidak ditemukan atau sudah kedaluwarsa.");

  const teamName = requestedName.trim().replace(/\s+/g, " ");
  if (teamName.length < 2 || teamName.length > 32) throw new Error("Nama tim harus 2–32 karakter.");

  const teamId = randomUUID();
  const claimed = await redis.set(teamNameKey(code, normalizeTeamName(teamName)), teamId, {
    nx: true,
    ex: ROOM_TTL_SECONDS,
  });
  if (!claimed) throw new Error("Nama tim sudah digunakan di room ini.");

  await Promise.all([
    redis.set(teamIdKey(code, teamId), teamName, { ex: ROOM_TTL_SECONDS }),
    redis.hincrby(roomKey(code), "teamCount", 1),
  ]);
  await redis.expire(roomKey(code), ROOM_TTL_SECONDS);

  return { code, teamId, teamName };
}

export async function pressBuzzer(code: string, teamId: string) {
  const redis = getRedis();
  const room = await getStoredRoom(code);
  if (!room) throw new Error("Room tidak ditemukan atau sudah kedaluwarsa.");

  const teamName = await redis.get<string>(teamIdKey(code, teamId));
  if (!teamName) throw new Error("Tim tidak terdaftar di room ini.");

  const round = Number(room.round);
  const winner: Winner = { teamId, teamName, winnerAt: Date.now() };
  const script = `
    if redis.call("HGET", KEYS[1], "status") ~= "open" then return -1 end
    if tonumber(redis.call("HGET", KEYS[1], "round")) ~= tonumber(ARGV[1]) then return -2 end
    local result = redis.call("SET", KEYS[2], ARGV[2], "NX", "EX", ARGV[3])
    if result then return 1 end
    return 0
  `;
  const accepted = Number(await redis.eval(script, [roomKey(code), winnerKey(code, round)], [round, JSON.stringify(winner), ROOM_TTL_SECONDS])) === 1;
  const publicRoom = await readRoom(code);
  if (!publicRoom) throw new Error("Room tidak ditemukan.");
  return { accepted, room: publicRoom };
}

export async function controlRoom(code: string, hostToken: string, action: "open" | "next" | "close") {
  const redis = getRedis();
  const room = await getStoredRoom(code);
  if (!room) throw new Error("Room tidak ditemukan atau sudah kedaluwarsa.");
  if (room.hostToken !== hostToken) throw new Error("Akses panitia tidak valid.");

  if (action === "next") {
    await redis.hincrby(roomKey(code), "round", 1);
    await redis.hset(roomKey(code), { status: "open", openedAt: Date.now() });
  } else if (action === "open") {
    await redis.hset(roomKey(code), { status: "open", openedAt: Date.now() });
  } else {
    await redis.hset(roomKey(code), { status: "waiting" });
  }
  await redis.expire(roomKey(code), ROOM_TTL_SECONDS);

  const publicRoom = await readRoom(code);
  if (!publicRoom) throw new Error("Room tidak ditemukan.");
  return publicRoom;
}
