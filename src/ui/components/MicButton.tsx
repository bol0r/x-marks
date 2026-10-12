import { useEffect, useRef, useState } from "preact/hooks";
import { speechSupported, startPolishSpeech, type SpeechSession } from "../../core/speech";

export function MicButton({
  onText,
  onStart,
  onStop,
  look,
}: {
  onText: (text: string) => void;
  onStart?: () => void;
  onStop?: () => void;
  look?: string;
}) {
  const [on, setOn] = useState(false);
  const [ok, setOk] = useState<boolean | null>(null);
  const session = useRef<SpeechSession | null>(null);

  useEffect(() => {
    setOk(speechSupported());
    return () => session.current?.stop();
  }, []);

  if (ok == null) return null;
  if (!ok) return <span data-mic="0" hidden />;

  return (
    <button
      type="button"
      class={look || "btn"}
      data-mic="1"
      aria-pressed={on ? "true" : "false"}
      aria-label="Notatka głosowa"
      onClick={() => {
        if (on) {
          session.current?.stop();
          return;
        }
        setOn(true);
        onStart?.();
        const next = startPolishSpeech(onText, () => {
          session.current = null;
          setOn(false);
          onStop?.();
        });
        session.current = next;
        if (!next) {
          setOn(false);
          onStop?.();
        }
      }}
    >
      {on ? "Słucham…" : "Mów"}
    </button>
  );
}
