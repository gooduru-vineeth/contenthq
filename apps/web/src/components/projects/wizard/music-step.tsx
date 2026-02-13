"use client";

import { useFormContext } from "react-hook-form";
import type { CreateProjectInput } from "@contenthq/shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export function MusicStep() {
  const form = useFormContext<CreateProjectInput>();
  const selectedTrackId = form.watch("musicTrackId");

  // Try to fetch music tracks from API - gracefully handle if not available
  const musicQuery = trpc.music.list.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const tracks = musicQuery.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Background Music</CardTitle>
        <CardDescription>
          Choose background music for your video (optional).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* No music option */}
        <button
          type="button"
          className={cn(
            "w-full rounded-lg border p-3 text-left transition-colors",
            !selectedTrackId
              ? "border-primary bg-primary/5"
              : "hover:bg-muted"
          )}
          onClick={() => form.setValue("musicTrackId", null)}
        >
          <p className="text-sm font-medium">No Background Music</p>
          <p className="text-xs text-muted-foreground">
            Video will only have voiceover narration
          </p>
        </button>

        {/* Track list */}
        {tracks.length > 0 ? (
          <div className="space-y-2">
            <Label>Available Tracks</Label>
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {tracks.map(
                (track: {
                  id: string;
                  name: string;
                  genre?: string | null;
                  mood?: string | null;
                }) => (
                  <button
                    key={track.id}
                    type="button"
                    className={cn(
                      "w-full rounded-md border px-3 py-2 text-left transition-colors",
                      selectedTrackId === track.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted"
                    )}
                    onClick={() => form.setValue("musicTrackId", track.id)}
                  >
                    <p className="text-sm font-medium">{track.name}</p>
                    {track.genre && (
                      <p className="text-xs text-muted-foreground">
                        {track.genre}
                      </p>
                    )}
                  </button>
                ),
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No music tracks available. You can add tracks later from the Music
            Library.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
