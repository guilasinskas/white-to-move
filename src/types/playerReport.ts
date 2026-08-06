import { Player } from "./game";

export type ReportPlatform = "lichess" | "chessCom";

// Lichess "speed" values / matching perfType query values. Chess.com's
// time_class values are a subset in spirit (bullet/blitz/rapid/daily) — the UI
// maps its own selector onto whichever field the active platform understands.
export type ReportTimeControl =
  | "ultraBullet"
  | "bullet"
  | "blitz"
  | "rapid"
  | "classical"
  | "correspondence";

// A game as fetched from Lichess/Chess.com for report purposes — distinct from
// the shared `LoadedGame` type (used by the load-game dialog) because reports
// need extra fields (per-ply clock, platform, epoch date) that the rest of the
// app has no use for.
export interface ReportGame {
  id: string;
  platform: ReportPlatform;
  pgn: string;
  white: Player;
  black: Player;
  result?: string;
  timeControl?: string;
  dateMs: number;
  movesNb?: number;
  url?: string;
  // Centiseconds remaining after each ply, when available (Lichess: `clocks`
  // field; Chess.com: parsed from `%clk` PGN comments in Phase 4).
  clocksCentis?: number[];
}

export type ReportColor = "white" | "black";
export type ReportResult = "win" | "draw" | "loss";
export type EndgameType = "pawn" | "minor" | "rook" | "queen";

export interface ReportEval {
  cp?: number;
  mate?: number;
}

export interface OpeningRecord {
  family: string;
  variation: string;
  exitPly: number;
}

export interface EndgameRecord {
  type: EndgameType;
  entryPly: number;
  // Eval at the entry ply, from the tracked player's perspective.
  entryEval: ReportEval;
  entryClockCentis?: number;
  // True when the game was already decided by ~3+ pawns at entry — excluded
  // from the winning/equal/losing breakdown, same as Plyscope's footnote.
  alreadyDecided: boolean;
}

// The computed record for one game, from the tracked player's perspective.
// This is what gets cached (Phase 3) and aggregated into table rows (Phase 5).
export interface GameAnalysis {
  gameId: string;
  platform: ReportPlatform;
  engineDepth: number;
  color: ReportColor;
  result: ReportResult;
  playerRating?: number;
  opponentRating?: number;
  dateMs: number;
  opening?: OpeningRecord;
  // Engine verdict at the book-exit position, from the tracked player's
  // perspective — powers "Quality" and the W-from-better/equal/worse columns.
  bookExitEval?: ReportEval;
  endgame?: EndgameRecord;
}
