export type TranscriptResult = {
  text: string;
  status: "ok" | "failed" | "permission_denied" | "offline";
  provider: string;
  message?: string;
};

export interface SpeechProvider {
  name: string;
  transcribe(input: { audioBase64?: string; mimeType?: string; mockPhrase?: string }): Promise<TranscriptResult>;
}

export class MockSpeechProvider implements SpeechProvider {
  name = "mock";
  async transcribe(input: { mockPhrase?: string }): Promise<TranscriptResult> {
    const text = input.mockPhrase?.trim();
    if (!text) {
      return {
        text: "",
        status: "failed",
        provider: this.name,
        message: "We could not hear that. Try again or type the work.",
      };
    }
    return { text, status: "ok", provider: this.name };
  }
}

export class AzureSpeechProvider implements SpeechProvider {
  name = "azure";
  async transcribe(): Promise<TranscriptResult> {
    if (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_REGION) {
      return {
        text: "",
        status: "failed",
        provider: this.name,
        message: "Speech service is not configured. Type the work instead.",
      };
    }
    return {
      text: "",
      status: "failed",
      provider: this.name,
      message: "Azure Speech is configured but live audio decode is not enabled in this environment. Type the work instead.",
    };
  }
}

export function getSpeechProvider(): SpeechProvider {
  const which = process.env.SPEECH_PROVIDER ?? "mock";
  if (which === "azure") return new AzureSpeechProvider();
  return new MockSpeechProvider();
}
