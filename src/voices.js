import { EdgeTTSError } from "./errors.js";

const VOICE_PATTERN = /^(.+?) - ([^(]+?) \(([^)]+)\)$/;

export function parseVoice(value) {
  const match = VOICE_PATTERN.exec(value);

  if (!match) {
    return {
      id: value,
      locale: null,
      gender: null,
      label: value,
      value,
    };
  }

  return {
    id: match[1],
    locale: match[2],
    gender: match[3],
    label: value,
    value,
  };
}

export function resolveVoice(requestedVoice, voices) {
  const normalized = requestedVoice.trim().toLowerCase();
  const exact = voices.find(
    (voice) => voice.value.toLowerCase() === normalized,
  );

  if (exact) {
    return exact;
  }

  const byId = voices.find((voice) => voice.id.toLowerCase() === normalized);
  if (byId) {
    return byId;
  }

  const suggestions = voices
    .filter(
      (voice) =>
        voice.id.toLowerCase().includes(normalized) ||
        voice.label.toLowerCase().includes(normalized),
    )
    .slice(0, 8)
    .map((voice) => voice.id);

  const suggestionText = suggestions.length
    ? ` Suggestions: ${suggestions.join(", ")}.`
    : "";

  throw new EdgeTTSError(
    `Voice "${requestedVoice}" was not found.${suggestionText}`,
    { code: "EDGE_TTS_VOICE_NOT_FOUND" },
  );
}

export function filterVoices(voices, options = {}) {
  const locale = options.locale?.toLowerCase();
  const gender = options.gender?.toLowerCase();

  return voices.filter((voice) => {
    if (locale && voice.locale?.toLowerCase() !== locale) {
      return false;
    }

    if (gender && voice.gender?.toLowerCase() !== gender) {
      return false;
    }

    return true;
  });
}
