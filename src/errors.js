export class EdgeTTSError extends Error {
  constructor(message, options = {}) {
    super(message, options);
    this.name = "EdgeTTSError";
    this.code = options.code || "EDGE_TTS_ERROR";
    this.status = options.status;
  }
}

export function toEdgeTTSError(error, message, code) {
  if (error instanceof EdgeTTSError) {
    return error;
  }

  return new EdgeTTSError(message, {
    cause: error,
    code,
  });
}
