import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { EdgeTTS } from "../src/index.js";

const outputPath = resolve("live-smoke-test.mp3");
const client = new EdgeTTS();

try {
  const result = await client.save(outputPath, {
    text: "Halo, ini pengujian langsung library Edge TTS.",
    voice: "id-ID-GadisNeural",
  });

  console.log(`Live test passed: ${result.path} (${result.size} bytes)`);
} finally {
  await rm(outputPath, { force: true });
}
