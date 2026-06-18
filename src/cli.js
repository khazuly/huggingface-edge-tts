import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { EdgeTTS } from "./client.js";
import { DEFAULT_VOICE } from "./constants.js";

function printHelp() {
  console.log(`
Generate MP3 through the innoai Edge TTS Hugging Face Space.

Usage:
  hf-edge-tts --text "Halo dunia"
  hf-edge-tts --file text.txt --voice id-ID-ArdiNeural --output speech.mp3
  echo "Hello from stdin" | hf-edge-tts

Options:
  -t, --text <text>       Text to synthesize
  -f, --file <path>       Read UTF-8 text from a file
  -v, --voice <id>        Voice ID, default: ${DEFAULT_VOICE}
      --rate <-50..50>    Speech rate adjustment in percent
      --pitch <-20..20>   Pitch adjustment in Hz
  -o, --output <path>     Output path, default: speech.mp3
      --list-voices       Print available voices
      --locale <locale>   Filter --list-voices, for example id-ID
  -h, --help              Show this help
`);
}

function parseArgs(argv) {
  const options = {
    text: "",
    file: "",
    voice: DEFAULT_VOICE,
    rate: 0,
    pitch: 0,
    output: "speech.mp3",
    locale: "",
    help: false,
    listVoices: false,
  };

  const aliases = {
    "-t": "text",
    "--text": "text",
    "-f": "file",
    "--file": "file",
    "-v": "voice",
    "--voice": "voice",
    "--rate": "rate",
    "--pitch": "pitch",
    "-o": "output",
    "--output": "output",
    "--locale": "locale",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "-h" || argument === "--help") {
      options.help = true;
      continue;
    }

    if (argument === "--list-voices") {
      options.listVoices = true;
      continue;
    }

    const key = aliases[argument];
    if (!key) {
      throw new Error(`Unknown option: ${argument}`);
    }

    const value = argv[index + 1];
    if (value === undefined) {
      throw new Error(`Missing value for ${argument}.`);
    }

    options[key] = ["rate", "pitch"].includes(key) ? Number(value) : value;
    index += 1;
  }

  return options;
}

async function readStdin() {
  if (process.stdin.isTTY) {
    return "";
  }

  let text = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) {
    text += chunk;
  }
  return text.trim();
}

async function getText(options) {
  if (options.text) {
    return options.text;
  }

  if (options.file) {
    return (await readFile(resolve(options.file), "utf8")).trim();
  }

  return readStdin();
}

export async function runCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);

  if (options.help) {
    printHelp();
    return;
  }

  const client = new EdgeTTS();

  if (options.listVoices) {
    const voices = await client.listVoices({
      locale: options.locale || undefined,
    });
    console.log(voices.map((voice) => voice.label).join("\n"));
    return;
  }

  const text = await getText(options);
  const result = await client.save(options.output, {
    text,
    voice: options.voice,
    rate: options.rate,
    pitch: options.pitch,
  });

  console.log(`Audio saved to ${result.path}`);
}
