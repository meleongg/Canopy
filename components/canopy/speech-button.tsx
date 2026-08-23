"use client";

import { Pause, Play, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getCachedSpeechAudio } from "@/components/canopy/speech-cache";
import type { SpeechSpeaker } from "@/lib/speech";
import { Button } from "@/components/ui/button";

const playbackSpeeds = [0.75, 1, 1.25] as const;

export function SpeechButton({
  disabled,
  label = "Listen",
  speaker,
  showSpeedControls = true,
  text,
}: {
  disabled: boolean;
  label?: string;
  speaker: SpeechSpeaker;
  showSpeedControls?: boolean;
  text: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof playbackSpeeds)[number]>(1);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  async function playAudio() {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      return;
    }

    setErrorMessage("");
    if (!audioRef.current) {
      setIsGenerating(true);
      try {
        const audioUrl = URL.createObjectURL(
          await getCachedSpeechAudio({ speaker, text }),
        );
        audioUrlRef.current = audioUrl;
        const audio = new Audio(audioUrl);
        audio.playbackRate = speed;
        audio.addEventListener("ended", () => setIsPlaying(false));
        audio.addEventListener("pause", () => setIsPlaying(false));
        audioRef.current = audio;
      } catch {
        setErrorMessage("Audio could not be generated. Please try again.");
        return;
      } finally {
        setIsGenerating(false);
      }
    }

    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch {
      setErrorMessage("Audio playback could not start. Please try again.");
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <Button
        disabled={disabled || isGenerating}
        onClick={() => void playAudio()}
        size="sm"
        type="button"
        variant="ghost"
      >
        {isGenerating ? <Volume2 className="animate-pulse" /> : null}
        {isPlaying ? <Pause /> : null}
        {!isGenerating && !isPlaying ? <Play /> : null}
        {isGenerating ? "Preparing audio" : isPlaying ? "Pause" : label}
      </Button>
      {showSpeedControls ? (
        <div
          aria-label="Playback speed"
          className="inline-flex rounded-lg border border-border bg-background p-1"
          role="group"
        >
          {playbackSpeeds.map((value) => (
            <Button
              aria-pressed={speed === value}
              className="h-7 px-2 text-xs"
              key={value}
              onClick={() => setSpeed(value)}
              size="sm"
              type="button"
              variant={speed === value ? "secondary" : "ghost"}
            >
              {value}×
            </Button>
          ))}
        </div>
      ) : null}
      {errorMessage ? (
        <p className="w-full text-xs text-muted-foreground" role="status">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
