import { EdgeTTSError } from "./errors.js";

export async function withTimeout(promise, timeoutMs, operation) {
  let timer;

  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new EdgeTTSError(
              `${operation} timed out after ${timeoutMs} milliseconds.`,
              { code: "EDGE_TTS_TIMEOUT" },
            ),
          );
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export function timeoutSignal(timeoutMs) {
  return AbortSignal.timeout(timeoutMs);
}

export function validateInteger(value, name, range) {
  if (
    !Number.isInteger(value) ||
    value < range.minimum ||
    value > range.maximum
  ) {
    throw new EdgeTTSError(
      `${name} must be an integer from ${range.minimum} to ${range.maximum}.`,
      { code: "EDGE_TTS_INVALID_ARGUMENT" },
    );
  }
}
