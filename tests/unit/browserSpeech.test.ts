import { describe, expect, it } from "vitest";
import {
  getSpeechRecognitionConstructor,
  joinSpokenText,
  permissionMessage,
  speechSupportMessage,
} from "@/lib/speech/browserSpeech";

describe("browser speech helpers", () => {
  it("appends spoken words without discarding typed text", () => {
    expect(joinSpokenText("set a pole", "and transfer wire")).toBe("set a pole and transfer wire");
    expect(joinSpokenText("", "set a pole")).toBe("set a pole");
  });

  it("tells the user to type when speech is unavailable", () => {
    expect(speechSupportMessage({ online: true, supported: false })).toMatch(/type instead/i);
    expect(speechSupportMessage({ online: false, supported: true })).toMatch(/type/i);
    expect(speechSupportMessage({ online: true, supported: true })).toBeNull();
  });

  it("explains microphone permission in plain language", () => {
    expect(permissionMessage("not-allowed")).toMatch(/permission/i);
    expect(permissionMessage("no-speech")).toMatch(/type instead/i);
  });

  it("detects webkit speech recognition", () => {
    const Fake = class {};
    expect(getSpeechRecognitionConstructor({ webkitSpeechRecognition: Fake as never })).toBe(Fake);
    expect(getSpeechRecognitionConstructor({})).toBeNull();
  });
});
