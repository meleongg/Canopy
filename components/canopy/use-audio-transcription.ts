"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

type RecorderState = {
  recorder: MediaRecorder;
  stream: MediaStream;
};

function subscribeToRecording() {
  return () => undefined;
}

function getRecordingSupport() {
  return (
    typeof MediaRecorder !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

function getRecordingMimeType() {
  const formats = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return formats.find((format) => MediaRecorder.isTypeSupported(format));
}

function getErrorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "Microphone access is off. Allow it in your browser settings, then try again.";
  }
  if (error instanceof DOMException && error.name === "NotFoundError") {
    return "No microphone was found. Connect one or type your reply.";
  }
  return "Your recording could not start. Please try again or type your reply.";
}

export function useAudioTranscription({
  languageCode,
  onTranscript,
}: {
  languageCode: string;
  onTranscript: (transcript: string) => void;
}) {
  const recorderRef = useRef<RecorderState | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const [errorMessage, setErrorMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const isSupported = useSyncExternalStore(
    subscribeToRecording,
    getRecordingSupport,
    () => false,
  );

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const releaseRecorder = useCallback(() => {
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    recorderRef.current = null;
  }, []);

  useEffect(() => releaseRecorder, [releaseRecorder]);

  const startRecording = useCallback(async () => {
    if (recorderRef.current) return;
    if (!getRecordingSupport()) {
      setErrorMessage(
        "Speech input is not available in this browser. You can still type your reply.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getRecordingMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = async () => {
        releaseRecorder();
        setIsRecording(false);
        if (chunks.length === 0) {
          setErrorMessage(
            "No speech was heard. Please try again when you are ready.",
          );
          return;
        }

        setIsTranscribing(true);
        try {
          const formData = new FormData();
          const audio = new Blob(chunks, {
            type: recorder.mimeType || "audio/webm",
          });
          formData.append("audio", audio, "understory-reply.webm");
          formData.append("languageCode", languageCode);
          const response = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });
          if (!response.ok) throw new Error(await response.text());
          const data = (await response.json()) as { text?: string };
          if (!data.text) throw new Error("No transcript returned.");
          onTranscriptRef.current(data.text);
        } catch (error) {
          setErrorMessage(
            error instanceof Error && error.message
              ? error.message
              : "Speech could not be transcribed. Please try again or type your reply.",
          );
        } finally {
          setIsTranscribing(false);
        }
      };

      recorderRef.current = { recorder, stream };
      setErrorMessage("");
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      releaseRecorder();
      setErrorMessage(getErrorMessage(error));
    }
  }, [languageCode, releaseRecorder]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.recorder.state === "recording") {
      recorderRef.current.recorder.stop();
    }
  }, []);

  return {
    errorMessage,
    isRecording,
    isSupported,
    isTranscribing,
    startRecording,
    stopRecording,
  };
}
