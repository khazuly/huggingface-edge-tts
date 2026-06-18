import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  EdgeTTS,
  EdgeTTSError,
  filterVoices,
  parseVoice,
} from "../src/index.js";

const VOICE_VALUES = [
  "",
  "id-ID-ArdiNeural - id-ID (Male)",
  "id-ID-GadisNeural - id-ID (Female)",
  "en-US-AvaNeural - en-US (Female)",
];

function createFixture() {
  const calls = [];
  const audio = Buffer.from("fake-mp3-data");

  const fetch = async (url) => {
    calls.push({ type: "fetch", url });

    if (url.endsWith("/gradio_api/info")) {
      return new Response(
        JSON.stringify({
          named_endpoints: {
            "/tts_interface": {
              parameters: [
                {
                  parameter_name: "voice",
                  type: { enum: VOICE_VALUES },
                },
              ],
            },
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }

    if (url === "https://example.test/audio.mp3") {
      return new Response(audio, {
        status: 200,
        headers: { "content-type": "audio/mpeg" },
      });
    }

    return new Response("not found", { status: 404 });
  };

  const createGradioClient = async () => ({
    async predict(apiName, payload) {
      calls.push({ type: "predict", apiName, payload });
      return {
        data: [
          {
            url: "https://example.test/audio.mp3",
            orig_name: "generated.mp3",
          },
          null,
        ],
      };
    },
  });

  return {
    audio,
    calls,
    client: new EdgeTTS({
      fetch,
      createGradioClient,
      timeoutMs: 1_000,
    }),
  };
}

test("parseVoice extracts voice metadata", () => {
  assert.deepEqual(parseVoice("id-ID-GadisNeural - id-ID (Female)"), {
    id: "id-ID-GadisNeural",
    locale: "id-ID",
    gender: "Female",
    label: "id-ID-GadisNeural - id-ID (Female)",
    value: "id-ID-GadisNeural - id-ID (Female)",
  });
});

test("filterVoices filters locale and gender case-insensitively", () => {
  const voices = VOICE_VALUES.filter(Boolean).map(parseVoice);
  const result = filterVoices(voices, {
    locale: "ID-id",
    gender: "female",
  });

  assert.deepEqual(result.map((voice) => voice.id), ["id-ID-GadisNeural"]);
});

test("listVoices caches metadata and supports locale filters", async () => {
  const fixture = createFixture();
  const first = await fixture.client.listVoices({ locale: "id-ID" });
  const second = await fixture.client.listVoices({ locale: "id-ID" });

  assert.equal(first.length, 2);
  assert.equal(second.length, 2);
  assert.equal(
    fixture.calls.filter((call) => call.type === "fetch").length,
    1,
  );
});

test("synthesize accepts a short voice ID and returns an audio buffer", async () => {
  const fixture = createFixture();
  const result = await fixture.client.synthesize({
    text: "Halo dunia",
    voice: "id-ID-GadisNeural",
    rate: 10,
    pitch: -2,
  });

  assert.deepEqual(result.audio, fixture.audio);
  assert.equal(result.mimeType, "audio/mpeg");
  assert.equal(result.voice.id, "id-ID-GadisNeural");

  const prediction = fixture.calls.find((call) => call.type === "predict");
  assert.deepEqual(prediction.payload, {
    text: "Halo dunia",
    voice: "id-ID-GadisNeural - id-ID (Female)",
    rate: 10,
    pitch: -2,
  });
});

test("save creates parent directories and writes the generated MP3", async () => {
  const fixture = createFixture();
  const directory = await mkdtemp(join(tmpdir(), "edge-tts-"));

  try {
    const output = join(directory, "nested", "speech");
    const result = await fixture.client.save(output, {
      text: "Halo dunia",
    });

    assert.equal(result.path, `${output}.mp3`);
    assert.deepEqual(await readFile(result.path), fixture.audio);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("invalid rate is rejected before a generation request", async () => {
  const fixture = createFixture();

  await assert.rejects(
    fixture.client.synthesize({
      text: "Halo",
      rate: 51,
    }),
    (error) =>
      error instanceof EdgeTTSError &&
      error.code === "EDGE_TTS_INVALID_ARGUMENT",
  );
});

test("unknown voices return a typed error", async () => {
  const fixture = createFixture();

  await assert.rejects(
    fixture.client.synthesize({
      text: "Halo",
      voice: "not-a-real-voice",
    }),
    (error) =>
      error instanceof EdgeTTSError &&
      error.code === "EDGE_TTS_VOICE_NOT_FOUND",
  );
});
