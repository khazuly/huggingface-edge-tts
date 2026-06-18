import {
  DEFAULT_VOICE,
  EdgeTTS,
  type SaveResult,
  type SynthesisResult,
  type Voice,
} from "../index.js";

const client = new EdgeTTS({ timeoutMs: 30_000 });

const voices: Promise<Voice[]> = client.listVoices({ locale: "id-ID" });
const speech: Promise<SynthesisResult> = client.synthesize({
  text: "Halo dunia",
  voice: DEFAULT_VOICE,
  rate: 5,
  pitch: 0,
});
const file: Promise<SaveResult> = client.save("speech.mp3", {
  text: "Halo dunia",
});

void voices;
void speech;
void file;
