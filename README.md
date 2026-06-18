# huggingface-edge-tts

Node.js library for generating MP3 speech through the
[innoai Edge TTS Hugging Face Space](https://huggingface.co/spaces/innoai/Edge-TTS-Text-to-Speech).

- ESM and CommonJS support
- TypeScript declarations
- More than 300 voices loaded dynamically from the Space
- Voice filtering by locale and gender
- Speech rate and pitch controls
- Buffer and file output APIs
- No OpenAI API key required

> This is an unofficial client for a third-party Hugging Face Space. The Space
> can sleep, change its API, rate-limit requests, or become unavailable.

## Requirements

- Node.js 18.17 or newer

## Installation

```bash
npm install huggingface-edge-tts
```

## Usage

### Save speech to a file

```js
import { EdgeTTS } from "huggingface-edge-tts";

const tts = new EdgeTTS();

const result = await tts.save("speech.mp3", {
  text: "Halo, selamat datang.",
  voice: "id-ID-GadisNeural",
  rate: 5,
  pitch: 0,
});

console.log(result.path);
console.log(result.size);
```

The output directory is created automatically. If the output path has no
extension, `.mp3` is added.

### Generate an audio Buffer

```js
import { writeFile } from "node:fs/promises";
import { synthesize } from "huggingface-edge-tts";

const result = await synthesize({
  text: "Audio ini tersedia sebagai Buffer.",
  voice: "id-ID-ArdiNeural",
});

await writeFile("speech.mp3", result.audio);
console.log(result.mimeType);
```

### CommonJS

```js
const { EdgeTTS } = require("huggingface-edge-tts");

const tts = new EdgeTTS();

const result = await tts.save("speech.mp3", {
  text: "CommonJS juga didukung.",
});

console.log(result.path);
```

## Voices

Use a short voice ID or the full Hugging Face Space label.

```js
const result = await tts.save("speech.mp3", {
  text: "Contoh suara wanita Indonesia.",
  voice: "id-ID-GadisNeural",
});
```

Indonesian voices:

```text
id-ID-ArdiNeural   Male
id-ID-GadisNeural  Female
```

List voices dynamically:

```js
const voices = await tts.listVoices({ locale: "id-ID" });

for (const voice of voices) {
  console.log(voice.id, voice.locale, voice.gender);
}
```

`listVoices()` caches the Space metadata per client instance. Force a refresh
when needed:

```js
await tts.listVoices({ refresh: true });
```

## API

### `new EdgeTTS(options?)`

Creates an isolated client. Voice metadata and the Gradio connection are cached
per instance.

```js
const tts = new EdgeTTS({
  timeoutMs: 180_000,
});
```

Constructor options:

- `spaceId` — Hugging Face Space ID. Default:
  `innoai/Edge-TTS-Text-to-Speech`.
- `spaceUrl` — direct Space URL.
- `apiName` — Gradio endpoint name. Default: `/tts_interface`.
- `timeoutMs` — request timeout in milliseconds.
- `fetch` — custom Fetch API implementation.
- `createGradioClient` — custom Gradio client factory.

### `client.synthesize(options)`

Generates speech and returns an audio buffer plus metadata.

```js
const result = await tts.synthesize({
  text: "Halo dunia.",
  voice: "id-ID-GadisNeural",
  rate: 0,
  pitch: 0,
});
```

Result:

```js
{
  audio,       // Buffer
  mimeType,    // usually "audio/mpeg"
  extension,   // "mp3"
  filename,
  voice,       // resolved voice metadata
  rate,
  pitch,
  warning,
  sourceUrl
}
```

Synthesis options:

- `text` — required non-empty string.
- `voice` — short ID or full Space label. Default: `id-ID-GadisNeural`.
- `rate` — integer from `-50` to `50`.
- `pitch` — integer from `-20` to `20`.

### `client.save(outputPath, options)`

Generates speech, writes it to disk, and returns file metadata.

```js
const result = await tts.save("output/speech.mp3", {
  text: "File akan disimpan sebagai MP3.",
  voice: "id-ID-ArdiNeural",
});

console.log(result.path);
```

### `client.listVoices(options?)`

Returns structured voice objects.

```js
const voices = await tts.listVoices({
  locale: "id-ID",
  gender: "Female",
});
```

Supported filters:

- `locale`, for example `id-ID`.
- `gender`, for example `Female`.
- `refresh`, to bypass the local cache.

Voice object:

```js
{
  id: "id-ID-GadisNeural",
  locale: "id-ID",
  gender: "Female",
  label: "id-ID-GadisNeural - id-ID (Female)",
  value: "id-ID-GadisNeural - id-ID (Female)"
}
```

### Convenience exports

The package also exports singleton-backed functions.

```js
import {
  createEdgeTTS,
  listVoices,
  save,
  synthesize,
} from "huggingface-edge-tts";

await save("speech.mp3", {
  text: "Menggunakan helper save.",
  voice: "id-ID-GadisNeural",
});
```

## Error handling

Errors thrown by the package are instances of `EdgeTTSError` and include a
machine-readable `code`.

```js
import { EdgeTTSError, synthesize } from "huggingface-edge-tts";

try {
  await synthesize({ text: "Hello", rate: 100 });
} catch (error) {
  if (error instanceof EdgeTTSError) {
    console.error(error.code, error.message);
  }
}
```
