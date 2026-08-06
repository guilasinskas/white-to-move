import { CLASSIFICATION_COLORS } from "@/constants";
import { MoveClassification } from "@/types/enums";
import { GameMove } from "./getGameMoves";
import {
  BoardOrientation,
  PieceCode,
  drawClassificationIcon,
  drawFloatingPiece,
  drawPosition,
  drawSquareHighlight,
  parseBoardPieces,
  squareToPixel,
} from "./canvasBoard";

export interface Frame {
  canvas: HTMLCanvasElement;
  delayMs: number;
}

interface BuildFramesParams {
  moves: GameMove[];
  images: Record<PieceCode, HTMLImageElement>;
  brilliantIcon?: HTMLImageElement;
  boardSize: number;
  orientation: BoardOrientation;
  onProgress?: (done: number, total: number) => void;
}

const SQUARE_SIZE_DIVISOR = 8;

// Regular moves play quickly so a full game stays watchable. Brilliant
// moves slow down and get a highlighted hold so they read as the point
// of the clip — same idea as chess.com's brilliant (!!) badge.
const FAST_SLIDE_FRAME_COUNT = 4;
const FAST_SLIDE_FRAME_DELAY_MS = 22;
const FAST_HOLD_MS = 150;

const BRILLIANT_SLIDE_FRAME_COUNT = 10;
const BRILLIANT_SLIDE_FRAME_DELAY_MS = 40;
const BRILLIANT_HOLD_MS = 1300;

const INITIAL_HOLD_MS = 400;

const BRILLIANT_COLOR = CLASSIFICATION_COLORS[MoveClassification.Splendid];

const cloneCanvas = (source: HTMLCanvasElement): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.drawImage(source, 0, 0);
  return canvas;
};

export const buildFrames = ({
  moves,
  images,
  brilliantIcon,
  boardSize,
  orientation,
  onProgress,
}: BuildFramesParams): Frame[] => {
  const squareSize = boardSize / SQUARE_SIZE_DIVISOR;
  const canvas = document.createElement("canvas");
  canvas.width = boardSize;
  canvas.height = boardSize;
  const ctx = canvas.getContext("2d");
  if (!ctx || moves.length === 0) return [];

  const frames: Frame[] = [];

  drawPosition(ctx, moves[0].beforeFen, images, squareSize, orientation);
  frames.push({ canvas: cloneCanvas(canvas), delayMs: INITIAL_HOLD_MS });

  moves.forEach((move, index) => {
    const slideFrameCount = move.isBrilliant
      ? BRILLIANT_SLIDE_FRAME_COUNT
      : FAST_SLIDE_FRAME_COUNT;
    const slideFrameDelay = move.isBrilliant
      ? BRILLIANT_SLIDE_FRAME_DELAY_MS
      : FAST_SLIDE_FRAME_DELAY_MS;
    const holdMs = move.isBrilliant ? BRILLIANT_HOLD_MS : FAST_HOLD_MS;

    const movingPiece = parseBoardPieces(move.beforeFen).find(
      (p) => p.square === move.from
    );

    if (movingPiece) {
      const fromXY = squareToPixel(move.from, squareSize, orientation);
      const toXY = squareToPixel(move.to, squareSize, orientation);

      for (let i = 1; i <= slideFrameCount; i++) {
        const progress = i / slideFrameCount;
        drawPosition(ctx, move.beforeFen, images, squareSize, orientation, {
          skipSquare: move.from,
        });
        drawFloatingPiece(
          ctx,
          movingPiece.code,
          images,
          fromXY,
          toXY,
          progress,
          squareSize
        );
        frames.push({
          canvas: cloneCanvas(canvas),
          delayMs: slideFrameDelay,
        });
      }
    }

    drawPosition(ctx, move.afterFen, images, squareSize, orientation);

    if (move.isBrilliant) {
      drawSquareHighlight(ctx, move.from, squareSize, orientation, BRILLIANT_COLOR);
      drawSquareHighlight(ctx, move.to, squareSize, orientation, BRILLIANT_COLOR);
      if (brilliantIcon) {
        drawClassificationIcon(ctx, move.to, squareSize, orientation, brilliantIcon);
      }
    }

    frames.push({ canvas: cloneCanvas(canvas), delayMs: holdMs });

    onProgress?.(index + 1, moves.length);
  });

  return frames;
};
