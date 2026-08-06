import { Frame } from "./buildFrames";

export interface VideoResult {
  blob: Blob;
  extension: "mp4" | "webm";
  mimeType: string;
}

// Preferred first — most chat apps (WhatsApp included) handle mp4 natively.
// Falls back to webm when the browser can't record mp4 (most Chromium
// builds today), which is still accepted as a video attachment almost
// everywhere.
const CANDIDATE_MIME_TYPES = [
  "video/mp4;codecs=avc1",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

export const isVideoRecordingSupported = (): boolean =>
  typeof MediaRecorder !== "undefined" && !!pickSupportedMimeType();

const pickSupportedMimeType = (): string | undefined => {
  if (typeof MediaRecorder === "undefined") return undefined;
  return CANDIDATE_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export const encodeVideo = async (
  frames: Frame[],
  boardSize: number
): Promise<VideoResult> => {
  const mimeType = pickSupportedMimeType();
  if (!mimeType) {
    throw new Error("Video recording is not supported in this browser");
  }
  if (frames.length === 0) {
    throw new Error("No frames to encode");
  }

  const canvas = document.createElement("canvas");
  canvas.width = boardSize;
  canvas.height = boardSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  // frameRequestRate 0 — frames are pushed manually via requestFrame(),
  // one per rendered board frame, instead of on a fixed timer.
  const stream = canvas.captureStream(0);
  const [track] = stream.getVideoTracks() as CanvasCaptureMediaStreamTrack[];

  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start();

  for (const frame of frames) {
    ctx.drawImage(frame.canvas, 0, 0);
    track.requestFrame();
    await sleep(frame.delayMs);
  }

  recorder.stop();
  await stopped;

  return {
    blob: new Blob(chunks, { type: mimeType }),
    extension: mimeType.startsWith("video/mp4") ? "mp4" : "webm",
    mimeType,
  };
};
