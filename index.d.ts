export interface Voice {
  id: string;
  locale: string | null;
  gender: string | null;
  label: string;
  value: string;
}

export interface EdgeTTSOptions {
  spaceId?: string;
  spaceUrl?: string;
  apiName?: string;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
  createGradioClient?: (spaceId: string) => Promise<GradioApp> | GradioApp;
}

export interface GradioApp {
  predict(
    apiName: string,
    payload: {
      text: string;
      voice: string;
      rate: number;
      pitch: number;
    },
  ): Promise<{
    data?: [
      {
        url?: string;
        orig_name?: string;
      } | null,
      string | null,
    ];
  }>;
}

export interface ListVoiceOptions {
  refresh?: boolean;
  locale?: string;
  gender?: string;
}

export interface SynthesisOptions {
  text: string;
  voice?: string;
  rate?: number;
  pitch?: number;
}

export interface SynthesisResult {
  audio: Buffer;
  mimeType: string;
  extension: "mp3";
  filename: string;
  voice: Voice;
  rate: number;
  pitch: number;
  warning: string | null;
  sourceUrl: string;
}

export interface SaveResult {
  path: string;
  size: number;
  mimeType: string;
  filename: string;
  voice: Voice;
  rate: number;
  pitch: number;
  warning: string | null;
  sourceUrl: string;
}

export class EdgeTTSError extends Error {
  code: string;
  status?: number;
}

export class EdgeTTS {
  constructor(options?: EdgeTTSOptions);
  readonly spaceId: string;
  readonly spaceUrl: string;
  readonly apiName: string;
  readonly timeoutMs: number;

  clearCache(): void;
  listVoices(options?: ListVoiceOptions): Promise<Voice[]>;
  synthesize(options: SynthesisOptions): Promise<SynthesisResult>;
  save(outputPath: string, options: SynthesisOptions): Promise<SaveResult>;
}

export const DEFAULT_SPACE_ID: string;
export const DEFAULT_SPACE_URL: string;
export const DEFAULT_API_NAME: string;
export const DEFAULT_VOICE: string;
export const DEFAULT_TIMEOUT_MS: number;
export const RATE_RANGE: Readonly<{ minimum: number; maximum: number }>;
export const PITCH_RANGE: Readonly<{ minimum: number; maximum: number }>;

export function createEdgeTTS(options?: EdgeTTSOptions): EdgeTTS;
export function listVoices(options?: ListVoiceOptions): Promise<Voice[]>;
export function synthesize(
  options: SynthesisOptions,
): Promise<SynthesisResult>;
export function save(
  outputPath: string,
  options: SynthesisOptions,
): Promise<SaveResult>;
export function parseVoice(value: string): Voice;
export function resolveVoice(requestedVoice: string, voices: Voice[]): Voice;
export function filterVoices(
  voices: Voice[],
  options?: Pick<ListVoiceOptions, "locale" | "gender">,
): Voice[];
