import { Chess } from "chess.js";

// Literal chess board colors — mirrors the light/dark square colors used by
// the live board (src/components/board/index.tsx). Intentionally hardcoded,
// not theme-aware: a chess board's colors don't flip with light/dark mode.
export const LIGHT_SQUARE_COLOR = "#e8e4d7";
export const DARK_SQUARE_COLOR = "#55624d";

export type BoardOrientation = "white" | "black";

export type PieceCode = `${"w" | "b"}${"P" | "N" | "B" | "R" | "Q" | "K"}`;

interface BoardPiece {
  square: string;
  code: PieceCode;
}

export const parseBoardPieces = (fen: string): BoardPiece[] => {
  const board = new Chess(fen).board();
  const pieces: BoardPiece[] = [];

  for (const row of board) {
    for (const cell of row) {
      if (!cell) continue;
      pieces.push({
        square: cell.square,
        code: `${cell.color}${cell.type.toUpperCase()}` as PieceCode,
      });
    }
  }

  return pieces;
};

export const squareToPixel = (
  square: string,
  squareSize: number,
  orientation: BoardOrientation
): { x: number; y: number } => {
  const file = square.charCodeAt(0) - "a".charCodeAt(0);
  const rank = Number(square[1]);

  const col = orientation === "white" ? file : 7 - file;
  const row = orientation === "white" ? 8 - rank : rank - 1;

  return { x: col * squareSize, y: row * squareSize };
};

export const loadPieceImages = async (
  pieceSet: string
): Promise<Record<PieceCode, HTMLImageElement>> => {
  const codes: PieceCode[] = [
    "wP",
    "wN",
    "wB",
    "wR",
    "wQ",
    "wK",
    "bP",
    "bN",
    "bB",
    "bR",
    "bQ",
    "bK",
  ];

  const entries = await Promise.all(
    codes.map(
      (code) =>
        new Promise<[PieceCode, HTMLImageElement]>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve([code, img]);
          img.onerror = () =>
            reject(new Error(`Failed to load piece image: ${code}`));
          img.src = `/piece/${pieceSet}/${code}.svg`;
        })
    )
  );

  return Object.fromEntries(entries) as Record<PieceCode, HTMLImageElement>;
};

export const drawSquares = (
  ctx: CanvasRenderingContext2D,
  squareSize: number
): void => {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const isLight = (row + col) % 2 === 0;
      ctx.fillStyle = isLight ? LIGHT_SQUARE_COLOR : DARK_SQUARE_COLOR;
      ctx.fillRect(col * squareSize, row * squareSize, squareSize, squareSize);
    }
  }
};

interface DrawPositionOptions {
  skipSquare?: string;
}

export const drawPosition = (
  ctx: CanvasRenderingContext2D,
  fen: string,
  images: Record<PieceCode, HTMLImageElement>,
  squareSize: number,
  orientation: BoardOrientation,
  options: DrawPositionOptions = {}
): void => {
  drawSquares(ctx, squareSize);

  for (const piece of parseBoardPieces(fen)) {
    if (piece.square === options.skipSquare) continue;
    const { x, y } = squareToPixel(piece.square, squareSize, orientation);
    ctx.drawImage(images[piece.code], x, y, squareSize, squareSize);
  }
};

export const drawFloatingPiece = (
  ctx: CanvasRenderingContext2D,
  code: PieceCode,
  images: Record<PieceCode, HTMLImageElement>,
  from: { x: number; y: number },
  to: { x: number; y: number },
  progress: number,
  squareSize: number
): void => {
  const eased = 1 - (1 - progress) * (1 - progress);
  const x = from.x + (to.x - from.x) * eased;
  const y = from.y + (to.y - from.y) * eased;
  ctx.drawImage(images[code], x, y, squareSize, squareSize);
};

// Mirrors the live board's "last move" square tint (squareRenderer.tsx's
// previousMoveSquareStyle) — same color, same 0.5 opacity.
export const drawSquareHighlight = (
  ctx: CanvasRenderingContext2D,
  square: string,
  squareSize: number,
  orientation: BoardOrientation,
  color: string,
  opacity = 0.5
): void => {
  const { x, y } = squareToPixel(square, squareSize, orientation);
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, squareSize, squareSize);
  ctx.restore();
};

export const loadClassificationIcon = (
  classification: string
): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error(`Failed to load classification icon: ${classification}`));
    img.src = `/icons/${classification}.png`;
  });

// Mirrors the live board's move-classification badge (squareRenderer.tsx) —
// pinned to the to-square's top-right corner, straddling its edge.
export const drawClassificationIcon = (
  ctx: CanvasRenderingContext2D,
  square: string,
  squareSize: number,
  orientation: BoardOrientation,
  icon: HTMLImageElement
): void => {
  const { x, y } = squareToPixel(square, squareSize, orientation);
  const iconSize = squareSize * 0.48;
  const offset = squareSize * 0.24;
  ctx.drawImage(
    icon,
    x + squareSize - iconSize + offset,
    y - offset,
    iconSize,
    iconSize
  );
};
