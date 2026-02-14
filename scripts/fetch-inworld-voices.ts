/**
 * Fetch available Inworld TTS voices.
 * Run: npx tsx scripts/fetch-inworld-voices.ts
 * Requires: INWORLD_API_KEY in .env
 */
import "dotenv/config";

async function main() {
  const baseUrl = process.env.INWORLD_API_BASE_URL || "https://api.inworld.ai";
  const apiKey = process.env.INWORLD_API_KEY;

  if (!apiKey) {
    console.error("Set INWORLD_API_KEY in .env");
    process.exit(1);
  }

  const resp = await fetch(`${baseUrl}/voices/v1/voices`, {
    headers: { Authorization: `Basic ${apiKey}` },
  });

  if (!resp.ok) {
    console.error(`Failed: ${resp.status} ${await resp.text()}`);
    process.exit(1);
  }

  const data: any = await resp.json();
  const voices: any[] = data.voices || [];
  console.log(`Found ${voices.length} Inworld voices:\n`);
  voices.forEach((v: any) => {
    console.log(
      `  ID: ${v.voiceId}  |  Name: ${v.displayName}  |  Lang: ${v.langCode}`
    );
  });
  if (voices.length > 0) {
    console.log(`\nRecommended default: ${voices[0]?.voiceId}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
