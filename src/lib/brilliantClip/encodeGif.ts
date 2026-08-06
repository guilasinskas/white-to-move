import GIF from "gif.js";
import { Frame } from "./buildFrames";

export const encodeGif = (
  frames: Frame[],
  boardSize: number,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    if (frames.length === 0) {
      reject(new Error("No frames to encode"));
      return;
    }

    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: boardSize,
      height: boardSize,
      workerScript: "/vendor/gif.worker.js",
    });

    for (const frame of frames) {
      gif.addFrame(frame.canvas, { delay: frame.delayMs });
    }

    gif.on("progress", (progress) => onProgress?.(progress));
    gif.on("finished", (blob) => resolve(blob));
    gif.render();
  });
};
