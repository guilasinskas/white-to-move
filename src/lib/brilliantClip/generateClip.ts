import { AnalysisTree } from "@/types/analysis";
import { PositionEval } from "@/types/eval";
import { MoveClassification } from "@/types/enums";
import { getGameMoves } from "./getGameMoves";
import { buildFrames } from "./buildFrames";
import {
  BoardOrientation,
  loadClassificationIcon,
  loadPieceImages,
} from "./canvasBoard";
import { encodeGif } from "./encodeGif";
import { encodeVideo, isVideoRecordingSupported } from "./encodeVideo";

export type ClipFormat = "gif" | "video";

export interface GenerateClipParams {
  tree: AnalysisTree;
  positions?: PositionEval[];
  pieceSet: string;
  orientation: BoardOrientation;
  format: ClipFormat;
  boardSize?: number;
  onProgress?: (phase: "rendering" | "encoding", progress: number) => void;
}

export interface ClipResult {
  blob: Blob;
  extension: string;
  movesCount: number;
  brilliantMovesCount: number;
}

export { isVideoRecordingSupported };

export const generateClip = async ({
  tree,
  positions,
  pieceSet,
  orientation,
  format,
  boardSize = 480,
  onProgress,
}: GenerateClipParams): Promise<ClipResult> => {
  const moves = getGameMoves(tree, positions);
  if (moves.length === 0) {
    throw new Error("No moves to export");
  }

  const brilliantMovesCount = moves.filter((move) => move.isBrilliant).length;

  const [images, brilliantIcon] = await Promise.all([
    loadPieceImages(pieceSet),
    brilliantMovesCount > 0
      ? loadClassificationIcon(MoveClassification.Splendid)
      : Promise.resolve(undefined),
  ]);

  const frames = buildFrames({
    moves,
    images,
    brilliantIcon,
    boardSize,
    orientation,
    onProgress: (done, total) => onProgress?.("rendering", done / total),
  });

  if (format === "gif") {
    const blob = await encodeGif(frames, boardSize, (progress) =>
      onProgress?.("encoding", progress)
    );
    return { blob, extension: "gif", movesCount: moves.length, brilliantMovesCount };
  }

  const video = await encodeVideo(frames, boardSize);
  return {
    blob: video.blob,
    extension: video.extension,
    movesCount: moves.length,
    brilliantMovesCount,
  };
};
