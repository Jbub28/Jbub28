export type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

export type SpeechRecognitionResultEventLike = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

type SpeechWindow = {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

export function joinSpokenText(existing: string, spoken: string): string {
  const current = existing.trim();
  const incoming = spoken.trim();
  if (!incoming) return existing;
  if (!current) return incoming;
  return `${current} ${incoming}`;
}

export function getSpeechRecognitionConstructor(win: SpeechWindow): (new () => SpeechRecognitionLike) | null {
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export function speechSupportMessage(input: {
  online: boolean;
  supported: boolean;
}): string | null {
  if (!input.supported) {
    return "Talk to text is not available in this browser. Type instead.";
  }
  if (!input.online) {
    return "Talk to text needs a connection here. You can still type.";
  }
  return null;
}

export function permissionMessage(error: string): string {
  if (error === "not-allowed" || error === "service-not-allowed" || error === "permission_denied") {
    return "Microphone permission is needed to talk. You can type instead.";
  }
  if (error === "no-speech" || error === "audio-capture") {
    return "We could not hear that. Try again or type instead.";
  }
  if (error === "network") {
    return "Talk to text needs a connection. You can still type.";
  }
  return "We could not hear that. Try again or type instead.";
}
