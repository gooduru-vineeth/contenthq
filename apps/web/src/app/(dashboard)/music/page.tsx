"use client";

import { useState } from "react";
import { Music, Plus, Trash2, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function MusicPage() {
  const { data: tracks, isLoading, refetch } = trpc.music.list.useQuery();
  const createMutation = trpc.music.create.useMutation({ onSuccess: () => { refetch(); setShowForm(false); } });
  const deleteMutation = trpc.music.delete.useMutation({ onSuccess: () => refetch() });

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [genre, setGenre] = useState("");
  const [mood, setMood] = useState("");

  function handleCreate() {
    if (!name.trim()) return;
    createMutation.mutate({ name, genre: genre || undefined, mood: mood || undefined });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Music Library</h1>
          <p className="text-sm text-muted-foreground">Manage background music tracks</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" /> Add Track
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Music Track</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Track Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Background Music" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Genre</Label>
                <Input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Ambient" />
              </div>
              <div className="space-y-2">
                <Label>Mood</Label>
                <Input value={mood} onChange={(e) => setMood(e.target.value)} placeholder="Calm" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Track
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!tracks || tracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Music className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No music tracks</h3>
          <p className="mt-1 text-sm text-muted-foreground">Add background music for your video projects.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tracks.map((track) => (
            <Card key={track.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Music className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{track.name}</p>
                    <div className="flex items-center gap-2">
                      {track.genre && <Badge variant="secondary" className="text-xs">{track.genre}</Badge>}
                      {track.mood && <span className="text-xs text-muted-foreground">{track.mood}</span>}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate({ id: track.id })}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
