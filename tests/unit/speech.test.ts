import { describe, expect, it, vi } from "vitest";
import { finalTranscript, joinNote, speechSupported, startPolishSpeech } from "../../src/core/speech";

describe("notatka głosowa", () => {
  it("dokleja tekst do notatki", () => {
    expect(joinNote("", "  polana  ")).toBe("polana");
    expect(joinNote("dojazd", "od południa")).toBe("dojazd od południa");
    expect(joinNote("zostaw", "   ")).toBe("zostaw");
  });

  it("bierze tylko końcowe fragmenty", () => {
    expect(
      finalTranscript({
        resultIndex: 1,
        results: [
          { isFinal: true, 0: { transcript: "stare " } },
          { isFinal: false, 0: { transcript: "szkic" } },
          { isFinal: true, 0: { transcript: "łąka" } },
        ],
      }),
    ).toBe("łąka");
  });

  it("ukrywa się bez Web Speech", () => {
    expect(speechSupported({})).toBe(false);
    expect(
      startPolishSpeech(
        () => {},
        () => {},
        {},
      ),
    ).toBeNull();
  });

  it("oddaje tekst po polsku i kończy nasłuch", () => {
    const heard: string[] = [];
    const ended = vi.fn();
    class Fake {
      lang = "";
      interimResults = true;
      onresult: ((ev: unknown) => void) | null = null;
      onerror: (() => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        expect(this.lang).toBe("pl-PL");
        expect(this.interimResults).toBe(false);
        this.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: "przy moście" } }] });
        this.onend?.();
      }
      stop() {
        this.onend?.();
      }
    }
    const session = startPolishSpeech((t) => heard.push(t), ended, { SpeechRecognition: Fake });
    expect(heard).toEqual(["przy moście"]);
    expect(ended).toHaveBeenCalledOnce();
    session?.stop();
    expect(ended).toHaveBeenCalledOnce();
  });

  it("gdy start rzuca, nie ma sesji", () => {
    class Boom {
      lang = "";
      interimResults = false;
      onresult = null;
      onerror = null;
      onend = null;
      start() {
        throw new Error("brak mikrofonu");
      }
      stop() {}
    }
    expect(
      startPolishSpeech(
        () => {},
        () => {},
        { webkitSpeechRecognition: Boom },
      ),
    ).toBeNull();
  });
});
