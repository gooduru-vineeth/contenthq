export function getAudioContentType(format: string): string {
  const map: Record<string, string> = {
    mp3: "audio/mpeg",
    wav: "audio/wav",
    opus: "audio/opus",
    aac: "audio/aac",
    flac: "audio/flac",
  };
  return map[format] ?? "audio/mpeg";
}

export function getVideoContentType(format: string): string {
  const map: Record<string, string> = {
    mp4: "video/mp4",
    webm: "video/webm",
  };
  return map[format] ?? "video/mp4";
}
