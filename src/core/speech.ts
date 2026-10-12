export interface SpeechHost {
  SpeechRecognition?: unknown;
  webkitSpeechRecognition?: unknown;
}

export interface SpeechResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0?: { transcript?: string } }>;
}

interface Rec {
  lang: string;
  interimResults: boolean;
  onresult: ((ev: SpeechResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type RecCtor = new () => Rec;

export interface SpeechSession {
  stop: () => void;
}

export function joinNote(note: string, said: string): string {
  const extra = said.replace(/\s+/g, " ").trim();
  if (!extra) return note;
  const base = note.trim();
  return base ? `${base} ${extra}` : extra;
}

export function finalTranscript(ev: SpeechResultEvent): string {
  let said = "";
  for (let i = ev.resultIndex; i < ev.results.length; i++) {
    const row = ev.results[i];
    if (row?.isFinal) said += row[0]?.transcript || "";
  }
  return said.replace(/\s+/g, " ").trim();
}

function ctorOf(host: SpeechHost): RecCtor | null {
  const c = host.SpeechRecognition || host.webkitSpeechRecognition;
  return typeof c === "function" ? (c as RecCtor) : null;
}

export function speechSupported(host: SpeechHost = globalThis as SpeechHost): boolean {
  return ctorOf(host) != null;
}

export function startPolishSpeech(
  onText: (text: string) => void,
  onEnd: () => void,
  host: SpeechHost = globalThis as SpeechHost,
): SpeechSession | null {
  const Ctor = ctorOf(host);
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = "pl-PL";
  rec.interimResults = false;
  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    onEnd();
  };
  rec.onresult = (ev) => {
    const text = finalTranscript(ev);
    if (text) onText(text);
  };
  rec.onerror = finish;
  rec.onend = finish;
  try {
    rec.start();
  } catch {
    return null;
  }
  return {
    stop: () => {
      try {
        rec.stop();
      } catch {
        finish();
      }
    },
  };
}
