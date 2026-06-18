import { EdgeTTS } from "./client.js";

export { EdgeTTS } from "./client.js";
export {
  DEFAULT_API_NAME,
  DEFAULT_SPACE_ID,
  DEFAULT_SPACE_URL,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_VOICE,
  PITCH_RANGE,
  RATE_RANGE,
} from "./constants.js";
export { EdgeTTSError } from "./errors.js";
export { filterVoices, parseVoice, resolveVoice } from "./voices.js";

let defaultClient;

export function createEdgeTTS(options) {
  return new EdgeTTS(options);
}

function getDefaultClient() {
  if (!defaultClient) {
    defaultClient = new EdgeTTS();
  }
  return defaultClient;
}

export function listVoices(options) {
  return getDefaultClient().listVoices(options);
}

export function synthesize(options) {
  return getDefaultClient().synthesize(options);
}

export function save(outputPath, options) {
  return getDefaultClient().save(outputPath, options);
}
