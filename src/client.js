import { mkdir, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { Client as GradioClient } from "@gradio/client";
import {
  DEFAULT_API_NAME,
  DEFAULT_SPACE_ID,
  DEFAULT_SPACE_URL,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_VOICE,
  PITCH_RANGE,
  RATE_RANGE,
} from "./constants.js";
import { EdgeTTSError, toEdgeTTSError } from "./errors.js";
import { filterVoices, parseVoice, resolveVoice } from "./voices.js";
import { timeoutSignal, validateInteger, withTimeout } from "./utils.js";

export class EdgeTTS {
  constructor(options = {}) {
    this.spaceId = options.spaceId || DEFAULT_SPACE_ID;
    this.spaceUrl = (options.spaceUrl || DEFAULT_SPACE_URL).replace(/\/$/, "");
    this.apiName = options.apiName || DEFAULT_API_NAME;
    this.timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
    this.fetch = options.fetch || globalThis.fetch;
    this.createGradioClient =
      options.createGradioClient ||
      ((spaceId) => GradioClient.connect(spaceId));

    if (typeof this.fetch !== "function") {
      throw new EdgeTTSError(
        "A Fetch API implementation is required. Use Node.js 18.17 or newer.",
        { code: "EDGE_TTS_FETCH_UNAVAILABLE" },
      );
    }

    this.voiceCache = null;
    this.gradioClientPromise = null;
  }

  clearCache() {
    this.voiceCache = null;
    this.gradioClientPromise = null;
  }

  async listVoices(options = {}) {
    const voices = await this.#loadVoices(Boolean(options.refresh));
    return filterVoices(voices, options);
  }

  async synthesize(options) {
    const normalized = this.#validateSynthesisOptions(options);
    const voices = await this.#loadVoices(false);
    const voice = resolveVoice(normalized.voice, voices);
    const app = await this.#getGradioClient();

    let prediction;
    try {
      prediction = await withTimeout(
        app.predict(this.apiName, {
          text: normalized.text,
          voice: voice.value,
          rate: normalized.rate,
          pitch: normalized.pitch,
        }),
        this.timeoutMs,
        "Speech generation",
      );
    } catch (error) {
      throw toEdgeTTSError(
        error,
        "The Hugging Face Space failed to generate speech.",
        "EDGE_TTS_GENERATION_FAILED",
      );
    }

    const audioFile = prediction?.data?.[0];
    const warning = prediction?.data?.[1] || null;

    if (!audioFile?.url) {
      throw new EdgeTTSError(
        typeof warning === "string" && warning
          ? warning
          : "The Hugging Face Space did not return an audio URL.",
        { code: "EDGE_TTS_INVALID_RESPONSE" },
      );
    }

    const audioResponse = await this.#request(
      audioFile.url,
      {},
      "Audio download",
    );
    const audio = Buffer.from(await audioResponse.arrayBuffer());

    return {
      audio,
      mimeType: audioResponse.headers.get("content-type") || "audio/mpeg",
      extension: "mp3",
      filename: audioFile.orig_name || "speech.mp3",
      voice,
      rate: normalized.rate,
      pitch: normalized.pitch,
      warning,
      sourceUrl: audioFile.url,
    };
  }

  async save(outputPath, options) {
    if (typeof outputPath !== "string" || !outputPath.trim()) {
      throw new EdgeTTSError("outputPath must be a non-empty string.", {
        code: "EDGE_TTS_INVALID_ARGUMENT",
      });
    }

    const result = await this.synthesize(options);
    const requestedPath = extname(outputPath)
      ? outputPath
      : `${outputPath}.${result.extension}`;
    const absolutePath = resolve(requestedPath);

    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, result.audio);

    return {
      path: absolutePath,
      size: result.audio.length,
      mimeType: result.mimeType,
      filename: result.filename,
      voice: result.voice,
      rate: result.rate,
      pitch: result.pitch,
      warning: result.warning,
      sourceUrl: result.sourceUrl,
    };
  }

  async #loadVoices(refresh) {
    if (this.voiceCache && !refresh) {
      return this.voiceCache;
    }

    const response = await this.#request(
      `${this.spaceUrl}/gradio_api/info`,
      {},
      "Voice list request",
    );

    let info;
    try {
      info = await response.json();
    } catch (error) {
      throw toEdgeTTSError(
        error,
        "The Hugging Face Space returned invalid voice metadata.",
        "EDGE_TTS_INVALID_RESPONSE",
      );
    }

    const parameters = info.named_endpoints?.[this.apiName]?.parameters;
    const voiceParameter = parameters?.find(
      (parameter) => parameter.parameter_name === "voice",
    );
    const voiceValues = voiceParameter?.type?.enum;

    if (!Array.isArray(voiceValues) || voiceValues.length === 0) {
      throw new EdgeTTSError(
        `Voice metadata was not found for endpoint ${this.apiName}.`,
        { code: "EDGE_TTS_INVALID_RESPONSE" },
      );
    }

    this.voiceCache = voiceValues.filter(Boolean).map(parseVoice);
    return this.voiceCache;
  }

  async #getGradioClient() {
    if (!this.gradioClientPromise) {
      this.gradioClientPromise = withTimeout(
        Promise.resolve(this.createGradioClient(this.spaceId)),
        this.timeoutMs,
        "Gradio client connection",
      ).catch((error) => {
        this.gradioClientPromise = null;
        throw toEdgeTTSError(
          error,
          "Could not connect to the Hugging Face Space.",
          "EDGE_TTS_CONNECTION_FAILED",
        );
      });
    }

    return this.gradioClientPromise;
  }

  async #request(url, init, operation) {
    let response;

    try {
      response = await this.fetch(url, {
        ...init,
        signal: timeoutSignal(this.timeoutMs),
      });
    } catch (error) {
      throw toEdgeTTSError(
        error,
        `${operation} failed.`,
        "EDGE_TTS_NETWORK_ERROR",
      );
    }

    if (!response.ok) {
      throw new EdgeTTSError(
        `${operation} failed with HTTP ${response.status}.`,
        {
          code: "EDGE_TTS_HTTP_ERROR",
          status: response.status,
        },
      );
    }

    return response;
  }

  #validateSynthesisOptions(options) {
    if (!options || typeof options !== "object") {
      throw new EdgeTTSError("Synthesis options are required.", {
        code: "EDGE_TTS_INVALID_ARGUMENT",
      });
    }

    if (typeof options.text !== "string" || !options.text.trim()) {
      throw new EdgeTTSError("text must be a non-empty string.", {
        code: "EDGE_TTS_INVALID_ARGUMENT",
      });
    }

    const rate = options.rate ?? 0;
    const pitch = options.pitch ?? 0;
    validateInteger(rate, "rate", RATE_RANGE);
    validateInteger(pitch, "pitch", PITCH_RANGE);

    return {
      text: options.text.trim(),
      voice: options.voice || DEFAULT_VOICE,
      rate,
      pitch,
    };
  }
}
