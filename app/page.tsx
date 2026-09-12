"use client";

import { FormEvent, type ButtonHTMLAttributes, type InputHTMLAttributes, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Copy, Crown, Flag, Radio, RefreshCw, Share2, Sparkles, Trophy, Users, Wifi, WifiOff, Zap } from "lucide-react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "ghost" | "outline" };

function Button({ className = "", variant, ...props }: ButtonProps) {
  const variantClass = variant ? `ui-${variant}` : "";
  return <button className={`ui-button ${variantClass} ${className}`.trim()} {...props} />;
}

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />;
}

type Role = "home" | "host" | "team";
type RoomStatus = "waiting" | "open" | "locked";
type Room = { code: string; status: RoomStatus; round: number; winnerTeamId: string | null; winnerTeam: string | null; responseTime: number | null; teamCount: number };
type TeamSession = { code: string; teamId: string; teamName: string };
type HostSession = { code: string; hostToken: string };
type WebTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: Record<string, unknown>) => unknown | Promise<unknown>;
};
type WebMcpDocument = Document & {
  modelContext?: { registerTool: (tool: WebTool, options?: { signal?: AbortSignal }) => void | Promise<void> };
};

const statusCopy: Record<RoomStatus, { label: string; detail: string }> = {
  waiting: { label: "Menunggu aba-aba", detail: "Bel belum dibuka panitia" },
  open: { label: "Bel dibuka!", detail: "Tekan untuk membela regumu" },
  locked: { label: "Babak selesai", detail: "Regu tercepat telah ditemukan" },
};

async function jsonRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Terjadi kesalahan.");
  return data;
}

function formatMs(value: number | null) {
  if (value === null) return "—";
  return value < 1000 ? `${value} ms` : `${(value / 1000).toFixed(2)} detik`;
}

function useRoom(code?: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [connected, setConnected] = useState(true);
  const refresh = useCallback(async () => {
    if (!code) return;
    try {
      const data = await jsonRequest<{ room: Room }>(`/api/rooms/${code}`);
      setRoom(data.room);
      setConnected(true);
    } catch { setConnected(false); }
  }, [code]);
  useEffect(() => {
    if (!code) return;
    void refresh();
    const timer = window.setInterval(refresh, 1500);
    return () => window.clearInterval(timer);
  }, [code, refresh]);
  return { room, setRoom, connected };
}

export default function Home() {
  const [role, setRole] = useState<Role>("home");
  const [teamSession, setTeamSession] = useState<TeamSession | null>(null);
  const [hostSession, setHostSession] = useState<HostSession | null>(null);
  useEffect(() => {
    const roomCode = new URLSearchParams(window.location.search).get("room")?.toUpperCase();
    const savedTeam = window.localStorage.getItem("belcerdas:team");
    const savedHost = window.localStorage.getItem("belcerdas:host");
    if (roomCode) {
      try {
        if (savedTeam) {
          const parsed = JSON.parse(savedTeam) as TeamSession;
          if (parsed.code === roomCode) setTeamSession(parsed);
        }
      } catch { window.localStorage.removeItem("belcerdas:team"); }
      setRole("team");
    } else if (savedHost) {
      try {
        const parsed = JSON.parse(savedHost) as HostSession;
        setHostSession(parsed);
        setRole("host");
      } catch { window.localStorage.removeItem("belcerdas:host"); }
    }
  }, []);
  useEffect(() => {
    const context = (document as WebMcpDocument).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tools: WebTool[] = [
      {
        name: "start_hosting_quiz",
        title: "Buka panel panitia",
        description: "Membuka alur panitia untuk membuat dan mengendalikan room cerdas cermat.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: () => { setRole("host"); return { screen: "host" }; },
      },
      {
        name: "start_joining_quiz",
        title: "Gabung sebagai peserta",
        description: "Membuka formulir peserta dan dapat mengisi kode room yang diberikan panitia.",
        inputSchema: {
          type: "object",
          properties: { roomCode: { type: "string", description: "Kode room enam karakter." } },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: (input) => {
          const roomCode = String(input.roomCode ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
          if (roomCode) window.history.replaceState({}, "", `?room=${roomCode}`);
          setRole("team");
          return { screen: "team", roomCode: roomCode || null };
        },
      },
    ];
    for (const tool of tools) {
      try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined); }
      catch { /* WebMCP is optional in unsupported browsers. */ }
    }
    return () => lifecycle.abort();
  }, []);
  const goHome = () => {
    setRole("home"); setTeamSession(null); setHostSession(null);
    window.localStorage.removeItem("belcerdas:team");
    window.localStorage.removeItem("belcerdas:host");
    window.history.replaceState({}, "", window.location.pathname);
  };
  const updateTeamSession = (value: TeamSession | null) => {
    setTeamSession(value);
    if (value) window.localStorage.setItem("belcerdas:team", JSON.stringify(value));
    else window.localStorage.removeItem("belcerdas:team");
  };
  const updateHostSession = (value: HostSession | null) => {
    setHostSession(value);
    if (value) window.localStorage.setItem("belcerdas:host", JSON.stringify(value));
    else window.localStorage.removeItem("belcerdas:host");
  };

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <header className="topbar">
        <button className="brand" onClick={goHome} aria-label="Kembali ke halaman awal">
          <span className="brand-mark"><Flag size={20} fill="currentColor" /></span><span><b>SUMPAH</b> PEMUDA</span>
        </button>
        <div className="live-pill"><span /> ARENA 28</div>
      </header>
      {role === "home" && <RolePicker onChoose={setRole} />}
      {role === "team" && <TeamView session={teamSession} onSession={updateTeamSession} onBack={goHome} />}
      {role === "host" && <HostView session={hostSession} onSession={updateHostSession} onBack={goHome} />}
    </main>
  );
}

function RolePicker({ onChoose }: { onChoose: (role: Role) => void }) {
  return (
    <section className="home-screen">
      <div className="date-stamp">28 • OKTOBER</div>
      <div className="eyebrow"><Sparkles size={16} /> Lomba Cerdas Cermat Sumpah Pemuda</div>
      <h1>Adu cepat.<br /><em>Adu cerdas.</em><br /><span>Untuk Indonesia.</span></h1>
      <p className="lead">Satu arena untuk para pemuda yang berani berpikir cepat. Masuk tanpa akun, satukan regu, dan rebut kehormatan sebagai yang tercepat.</p>
      <div className="role-grid">
        <button className="role-card host-card" onClick={() => onChoose("host")}>
          <span className="card-number">01</span><span className="role-icon"><Radio /></span><span className="role-kicker">POS KOMANDO</span>
          <strong>Saya Panitia</strong><small>Buat gelanggang, buka bel, dan tentukan jalannya setiap babak.</small>
          <span className="role-action">Buka panel <span>→</span></span>
        </button>
        <button className="role-card team-card" onClick={() => onChoose("team")}>
          <span className="card-number">02</span><span className="role-icon"><Users /></span><span className="role-kicker">BARISAN PEMUDA</span>
          <strong>Saya Peserta</strong><small>Masukkan kode gelanggang dan nama regumu untuk bertanding.</small>
          <span className="role-action">Masuk arena <span>→</span></span>
        </button>
      </div>
      <div className="pledge-strip" aria-label="Semangat Sumpah Pemuda">
        <span><b>01</b> Satu Tanah Air</span><span><b>02</b> Satu Bangsa</span><span><b>03</b> Satu Bahasa</span>
      </div>
      <div className="trust-row"><Wifi size={17} /> Terhubung lintas HP dan jaringan • Satu arena, satu pemenang</div>
    </section>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return <Button variant="ghost" className="back-button" onClick={onClick}><ArrowLeft size={18} /> Kembali</Button>;
}

function TeamView({ session, onSession, onBack }: { session: TeamSession | null; onSession: (value: TeamSession | null) => void; onBack: () => void }) {
  const params = typeof window === "undefined" ? null : new URLSearchParams(window.location.search);
  const [code, setCode] = useState(params?.get("room")?.toUpperCase() ?? "");
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [buzzing, setBuzzing] = useState(false);
  const { room, setRoom, connected } = useRoom(session?.code);
  const isWinner = Boolean(room?.winnerTeamId && room.winnerTeamId === session?.teamId);

  const join = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const cleanCode = code.replace(/[^a-z0-9]/gi, "").toUpperCase();
      const data = await jsonRequest<TeamSession>(`/api/rooms/${cleanCode}/join`, { method: "POST", body: JSON.stringify({ teamName }) });
      onSession(data); window.history.replaceState({}, "", `?room=${data.code}`);
    } catch (joinError) { setError(joinError instanceof Error ? joinError.message : "Gagal bergabung."); }
    finally { setLoading(false); }
  };

  const buzz = async () => {
    if (!session || !room || room.status !== "open" || buzzing) return;
    setBuzzing(true); setError(""); navigator.vibrate?.(70);
    try {
      const data = await jsonRequest<{ accepted: boolean; room: Room }>(`/api/rooms/${session.code}/buzz`, {
        method: "POST", body: JSON.stringify({ teamId: session.teamId }),
      });
      setRoom(data.room); playTone(data.accepted ? 740 : 260);
    } catch (buzzError) { setError(buzzError instanceof Error ? buzzError.message : "Bel gagal dikirim."); }
    finally { setBuzzing(false); }
  };

  if (!session) return (
    <section className="form-screen">
      <BackButton onClick={onBack} />
      <div className="form-card">
        <span className="mini-icon"><Users /></span><p className="section-kicker">BARISAN PESERTA</p>
        <h2>Masuk gelanggang</h2><p>Masukkan kode dari panitia dan kibarkan nama regumu.</p>
        <form onSubmit={join} className="join-form">
          <label htmlFor="room-code">Kode gelanggang</label>
          <Input id="room-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase().slice(0, 6))} placeholder="Contoh: A7K9P2" autoCapitalize="characters" required />
          <label htmlFor="team-name">Nama regu</label>
          <Input id="team-name" value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="Contoh: Pemuda Nusantara" maxLength={32} required />
          {error && <p className="error-box">{error}</p>}
          <Button className="primary-button" type="submit" disabled={loading}>
            {loading ? <RefreshCw className="spin" /> : <Flag />}{loading ? "Menghubungkan..." : "Masuk arena"}
          </Button>
        </form>
      </div>
    </section>
  );

  return (
    <section className={`buzzer-screen ${isWinner ? "winner-screen" : ""}`}>
      <div className="participant-bar">
        <div><span className="tiny-label">REGU ANDA</span><strong>{session.teamName}</strong></div>
        <div className="room-chip">KODE <b>{session.code}</b></div>
      </div>
      <div className="round-line">
        <span>BABAK {room?.round ?? 1}</span>
        <span className={connected ? "connection good" : "connection bad"}>
          {connected ? <Wifi size={15} /> : <WifiOff size={15} />}{connected ? "Terhubung" : "Menghubungkan..."}
        </span>
      </div>
      <div className="buzzer-content">
        <div className={`status-banner status-${room?.status ?? "waiting"}`}>
          <span className="status-dot" /><div><strong>{statusCopy[room?.status ?? "waiting"].label}</strong><small>{statusCopy[room?.status ?? "waiting"].detail}</small></div>
        </div>
        {room?.status === "locked" ? (
          <div className={`winner-result ${isWinner ? "mine" : "other"}`}>
            <div className="crown-wrap"><Trophy size={42} /></div><p>{isWinner ? "REGUMU YANG TERCEPAT!" : "BABAK DIMENANGKAN OLEH"}</p>
            <h2>{room.winnerTeam}</h2><span>{formatMs(room.responseTime)}</span>
          </div>
        ) : (
          <div className={`buzzer-wrap ${room?.status === "open" ? "is-ready" : ""}`}>
            <span className="pulse-ring pulse-one" /><span className="pulse-ring pulse-two" />
            <button className="buzzer-button" onClick={buzz} disabled={room?.status !== "open" || buzzing || !connected} aria-label="Tekan bel">
              <span className="buzzer-shine" /><Zap size={54} fill="currentColor" /><strong>{buzzing ? "MENGIRIM" : "TEKAN!"}</strong>
            </button>
          </div>
        )}
        {error && <p className="error-box compact">{error}</p>}
      </div>
      <button className="leave-link" onClick={() => onSession(null)}>Keluar dari gelanggang</button>
    </section>
  );
}

function HostView({ session, onSession, onBack }: { session: HostSession | null; onSession: (value: HostSession | null) => void; onBack: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const { room, setRoom, connected } = useRoom(session?.code);
  const shareUrl = useMemo(() => !session || typeof window === "undefined" ? "" : `${window.location.origin}${window.location.pathname}?room=${session.code}`, [session]);

  const createRoom = async () => {
    setLoading(true); setError("");
    try {
      const data = await jsonRequest<HostSession>("/api/rooms", { method: "POST", body: "{}" });
      onSession(data);
    } catch (createError) { setError(createError instanceof Error ? createError.message : "Room gagal dibuat."); }
    finally { setLoading(false); }
  };
  const control = async (action: "open" | "next" | "close") => {
    if (!session) return;
    setLoading(true); setError("");
    try {
      const data = await jsonRequest<{ room: Room }>(`/api/rooms/${session.code}/control`, {
        method: "POST", body: JSON.stringify({ hostToken: session.hostToken, action }),
      });
      setRoom(data.room); if (action !== "close") playTone(520);
    } catch (controlError) { setError(controlError instanceof Error ? controlError.message : "Perintah gagal."); }
    finally { setLoading(false); }
  };
  const copyLink = async () => { await navigator.clipboard.writeText(shareUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1600); };
  const share = async () => navigator.share ? navigator.share({ title: "Gabung Cerdas Cermat", text: `Kode room: ${session?.code}`, url: shareUrl }) : copyLink();

  if (!session) return (
    <section className="form-screen">
      <BackButton onClick={onBack} />
      <div className="form-card host-start">
        <span className="mini-icon"><Flag /></span><p className="section-kicker">POS KOMANDO PANITIA</p>
        <h2>Siapkan gelanggang</h2><p>Buat kode pertandingan dan bagikan kepada seluruh regu peserta.</p>
        {error && <p className="error-box">{error}</p>}
        <Button className="primary-button" onClick={createRoom} disabled={loading}>
          {loading ? <RefreshCw className="spin" /> : <Flag />}{loading ? "Menyiapkan arena..." : "Mulai lomba"}
        </Button>
      </div>
    </section>
  );

  return (
    <section className="host-screen">
      <div className="host-heading"><BackButton onClick={onBack} />
        <div className={connected ? "connection good" : "connection bad"}>{connected ? <Wifi size={16} /> : <WifiOff size={16} />}{connected ? "Panel tersambung" : "Menghubungkan..."}</div>
      </div>
      <div className="host-grid">
        <article className="room-board">
          <p className="section-kicker">KODE GELANGGANG</p><div className="room-code-display">{session.code}</div>
          <p className="share-hint">Bagikan tautan atau tampilkan kode ini kepada seluruh regu.</p>
          <div className="share-buttons">
            <Button variant="outline" onClick={copyLink}>{copied ? <Check /> : <Copy />} {copied ? "Tersalin" : "Salin link"}</Button>
            <Button variant="outline" onClick={share}><Share2 /> Bagikan</Button>
          </div>
          <div className="team-count"><Users size={19} /><b>{room?.teamCount ?? 0}</b> regu siap bertanding</div>
        </article>
        <article className="control-board">
          <div className="control-top">
            <div><span className="tiny-label">BABAK</span><b>{room?.round ?? 1}</b></div>
            <div className={`host-status status-${room?.status ?? "waiting"}`}><span /> {statusCopy[room?.status ?? "waiting"].label}</div>
          </div>
          {room?.status === "locked" ? (
            <div className="host-winner"><Trophy /><p>REGU TERCEPAT</p><h2>{room.winnerTeam}</h2><span>{formatMs(room.responseTime)}</span></div>
          ) : (
            <div className="host-waiting"><div className="radar"><span /><Radio size={34} /></div>
              <h3>{room?.status === "open" ? "Menanti regu tercepat" : "Menunggu aba-aba"}</h3>
              <p>{room?.status === "open" ? "Sistem akan mengunci regu pertama secara otomatis." : "Buka bel setelah soal selesai dibacakan."}</p>
            </div>
          )}
          <div className="control-actions">
            {room?.status === "waiting" && <Button className="open-button" onClick={() => control("open")} disabled={loading}><Flag /> Mulai babak</Button>}
            {room?.status === "open" && <Button className="close-button" onClick={() => control("close")} disabled={loading}>Tutup bel</Button>}
            {room?.status === "locked" && <Button className="next-button" onClick={() => control("next")} disabled={loading}><RefreshCw /> Babak berikutnya</Button>}
          </div>
          {error && <p className="error-box compact">{error}</p>}
        </article>
      </div>
    </section>
  );
}

function playTone(frequency: number) {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass(); const oscillator = context.createOscillator(); const gain = context.createGain();
    oscillator.frequency.setValueAtTime(frequency, context.currentTime); oscillator.type = "sine";
    gain.gain.setValueAtTime(0.14, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.3);
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.3);
  } catch { /* Audio feedback is optional. */ }
}
