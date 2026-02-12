"use client";

import { useRef, useState } from "react";
import { Download, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SpeechGenerationPlayerProps {
  audioUrl: string;
  duration?: number;
}

export function SpeechGenerationPlayer({
  audioUrl,
  duration,
}: SpeechGenerationPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration ?? 0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-2">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={() =>
          setCurrentTime(audioRef.current?.currentTime ?? 0)
        }
        onLoadedMetadata={() =>
          setAudioDuration(audioRef.current?.duration ?? duration ?? 0)
        }
        onEnded={() => setIsPlaying(false)}
      />

      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePlay}>
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{
            width: audioDuration > 0
              ? `${(currentTime / audioDuration) * 100}%`
              : "0%",
          }}
        />
      </div>

      <span className="text-xs text-muted-foreground tabular-nums min-w-[40px]">
        {formatTime(currentTime)}/{formatTime(audioDuration)}
      </span>

      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
        <a href={audioUrl} download>
          <Download className="h-4 w-4" />
        </a>
      </Button>
    </div>
  );
}
