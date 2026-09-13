"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSpeechRecognitionConstructor,
  permissionMessage,
  speechSupportMessage,
  type SpeechRecognitionLike,
} from "@/lib/speech/browserSpeech";

type Options = {
  onFinal: (text: string) => void;
  onInterim?: (text: string) => void;
};

type Session = {
  rec: SpeechRecognitionLike;
  clear: () => void;
};

let activeSession: Session | null = null;

export function useSpeechToText(options: Options) {
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("Microphone is off");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const listeningRef = useRef(false);
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const becomeIdle = useCallback(() => {
    recRef.current = null;
    listeningRef.current = false;
    setListening(false);
    setStatus("Microphone is off");
  }, []);

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (rec && activeSession?.rec === rec) {
      activeSession = null;
    }
    if (rec) {
      recRef.current = null;
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    }
    becomeIdle();
  }, [becomeIdle]);

  const start = useCallback(() => {
    setError(null);
    const Ctor = typeof window !== "undefined" ? getSpeechRecognitionConstructor(window) : null;
    const blocked = speechSupportMessage({
      online: typeof navigator === "undefined" ? true : navigator.onLine,
      supported: Boolean(Ctor),
    });
    if (blocked || !Ctor) {
      setError(blocked ?? "Talk to text is not available in this browser. Type instead.");
      setStatus("Microphone is off");
      return;
    }
    if (listeningRef.current && recRef.current) {
      return;
    }
    if (activeSession) {
      activeSession.clear();
    }
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (event) => {
      let interim = "";
      let finals = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i];
        if (piece.isFinal) finals += piece[0].transcript;
        else interim += piece[0].transcript;
      }
      if (interim) optionsRef.current.onInterim?.(interim);
      if (finals.trim()) optionsRef.current.onFinal(finals);
    };
    rec.onerror = (event) => {
      setError(permissionMessage(event.error));
      if (activeSession?.rec === rec) activeSession = null;
      becomeIdle();
    };
    rec.onend = () => {
      if (activeSession?.rec === rec) activeSession = null;
      if (recRef.current === rec) becomeIdle();
    };
    const session: Session = {
      rec,
      clear: () => {
        if (activeSession?.rec === rec) activeSession = null;
        try {
          rec.stop();
        } catch {
          /* already stopped */
        }
        recRef.current = null;
        becomeIdle();
      },
    };
    recRef.current = rec;
    activeSession = session;
    try {
      rec.start();
      listeningRef.current = true;
      setListening(true);
      setStatus("Listening...");
    } catch {
      if (activeSession?.rec === rec) activeSession = null;
      recRef.current = null;
      listeningRef.current = false;
      setError("We could not start the microphone. Type instead.");
      setListening(false);
      setStatus("Microphone is off");
    }
  }, [becomeIdle]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  useEffect(
    () => () => {
      if (recRef.current) stop();
    },
    [stop],
  );

  return { listening, status, error, start, stop, toggle };
}
