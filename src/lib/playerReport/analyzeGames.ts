import { UciEngine } from "@/lib/engine/uciEngine";
import {
  getEvaluateGameParams,
  getGameFromPgn,
  getMaterialDifference,
} from "@/lib/chess";
import { matchOpening } from "@/lib/openingBook";
import { findFinalEndgameStructure } from "./classifyEndgame";
import {
  EndgameRecord,
  EndgameType,
  GameAnalysis,
  OpeningRecord,
  ReportColor,
  ReportEval,
  ReportGame,
  ReportResult,
} from "@/types/playerReport";

export interface AnalyzeGamesOptions {
  engine: UciEngine;
  username: string;
  engineDepth: number;
  workersNb?: number;
  onProgress?: (completed: number, total: number) => void;
}

// Games materially decided by ~3 pawns or more at the point they enter an
// endgame structure are excluded from the winning/equal/losing breakdown —
// same footnote Plyscope shows ("N games were already decided ... excluded").
const DECIDED_MATERIAL_THRESHOLD = 3;
const EVAL_CHUNK_SIZE = 200;

interface PendingGame {
  game: ReportGame;
  color: ReportColor;
  result: ReportResult;
  fens: string[];
  opening?: OpeningRecord;
  endgameEntryPly?: number;
  endgameType?: EndgameType;
  alreadyDecided?: boolean;
}

interface EvalTarget {
  pendingIndex: number;
  kind: "bookExit" | "endgameEntry";
  fen: string;
}

// Two-pass pipeline: (1) cheap structural parsing of every game — opening
// match, endgame structure, material check — done purely with chess.js, no
// engine involved; (2) a single batched engine pass over just the positions
// that actually need a verdict (book-exit + qualifying endgame entries),
// reusing UciEngine's worker pool via evaluatePositionsBatch instead of
// spinning up one evaluation per game.
export async function analyzeGames(
  games: ReportGame[],
  opts: AnalyzeGamesOptions
): Promise<GameAnalysis[]> {
  const pending: PendingGame[] = [];

  for (const game of games) {
    const color = resolveColor(game, opts.username);
    if (!color) continue;
    const result = resolveResult(game.result, color);
    if (!result) continue;

    let fens: string[];
    try {
      const chess = getGameFromPgn(game.pgn);
      fens = getEvaluateGameParams(chess).fens;
    } catch (error) {
      console.error("Player report: failed to parse game", game.id, error);
      continue;
    }
    if (fens.length < 2) continue;

    const opening = matchOpening(fens);
    const endgameStructure = findFinalEndgameStructure(fens);

    pending.push({
      game,
      color,
      result,
      fens,
      opening,
      endgameEntryPly: endgameStructure?.entryPly,
      endgameType: endgameStructure?.type,
    });
  }

  const targets: EvalTarget[] = [];

  pending.forEach((p, pendingIndex) => {
    if (p.opening) {
      targets.push({
        pendingIndex,
        kind: "bookExit",
        fen: p.fens[p.opening.exitPly],
      });
    }

    if (p.endgameEntryPly !== undefined) {
      const entryFen = p.fens[p.endgameEntryPly];
      const materialDiff = getMaterialDifference(entryFen);
      const playerRelativeDiff =
        p.color === "white" ? materialDiff : -materialDiff;
      p.alreadyDecided =
        Math.abs(playerRelativeDiff) >= DECIDED_MATERIAL_THRESHOLD;

      if (!p.alreadyDecided) {
        targets.push({ pendingIndex, kind: "endgameEntry", fen: entryFen });
      }
    }
  });

  const bookExitEvals = new Map<number, ReportEval>();
  const endgameEntryEvals = new Map<number, ReportEval>();

  for (let i = 0; i < targets.length; i += EVAL_CHUNK_SIZE) {
    const chunk = targets.slice(i, i + EVAL_CHUNK_SIZE);
    const results = await opts.engine.evaluatePositionsBatch({
      fens: chunk.map((t) => t.fen),
      depth: opts.engineDepth,
      workersNb: opts.workersNb ?? 1,
    });

    chunk.forEach((target, j) => {
      const line = results[j]?.lines[0];
      const evalValue: ReportEval = { cp: line?.cp, mate: line?.mate };
      const store =
        target.kind === "bookExit" ? bookExitEvals : endgameEntryEvals;
      store.set(target.pendingIndex, evalValue);
    });

    opts.onProgress?.(
      Math.min(i + chunk.length, targets.length),
      targets.length
    );
  }

  return pending.map((p, pendingIndex) => {
    const endgame: EndgameRecord | undefined =
      p.endgameEntryPly !== undefined && p.endgameType
        ? {
            type: p.endgameType,
            entryPly: p.endgameEntryPly,
            entryEval:
              toPlayerRelative(endgameEntryEvals.get(pendingIndex), p.color) ??
              {},
            entryClockCentis: getPlayerClockAtPly(
              p.game.clocksCentis,
              p.endgameEntryPly,
              p.color
            ),
            alreadyDecided: p.alreadyDecided ?? false,
          }
        : undefined;

    const analysis: GameAnalysis = {
      gameId: p.game.id,
      platform: p.game.platform,
      engineDepth: opts.engineDepth,
      color: p.color,
      result: p.result,
      playerRating:
        p.color === "white" ? p.game.white.rating : p.game.black.rating,
      opponentRating:
        p.color === "white" ? p.game.black.rating : p.game.white.rating,
      dateMs: p.game.dateMs,
      opening: p.opening,
      bookExitEval: toPlayerRelative(bookExitEvals.get(pendingIndex), p.color),
      endgame,
    };
    return analysis;
  });
}

function resolveColor(
  game: ReportGame,
  username: string
): ReportColor | undefined {
  const target = username.trim().toLowerCase();
  if (game.white.name.toLowerCase() === target) return "white";
  if (game.black.name.toLowerCase() === target) return "black";
  return undefined;
}

function resolveResult(
  result: string | undefined,
  color: ReportColor
): ReportResult | undefined {
  if (result === "1/2-1/2") return "draw";
  if (result === "1-0") return color === "white" ? "win" : "loss";
  if (result === "0-1") return color === "black" ? "win" : "loss";
  return undefined;
}

function toPlayerRelative(
  evalValue: ReportEval | undefined,
  color: ReportColor
): ReportEval | undefined {
  if (!evalValue) return undefined;
  if (color === "white") return evalValue;
  return {
    cp: evalValue.cp === undefined ? undefined : -evalValue.cp,
    mate: evalValue.mate === undefined ? undefined : -evalValue.mate,
  };
}

// clocksCentis[i] is the remaining time of whoever played ply (i+1),
// immediately after moving (Lichess convention; Chess.com PGN clocks are
// parsed into the same shape in src/lib/chessCom.ts). Finds the tracked
// player's clock reading nearest to the given ply.
function getPlayerClockAtPly(
  clocksCentis: number[] | undefined,
  ply: number,
  color: ReportColor
): number | undefined {
  if (!clocksCentis || ply < 1) return undefined;

  const moverIsWhite = ply % 2 === 1;
  const moverColor: ReportColor = moverIsWhite ? "white" : "black";
  if (moverColor === color) return clocksCentis[ply - 1];

  const priorPly = ply - 1;
  return priorPly >= 1 ? clocksCentis[priorPly - 1] : undefined;
}
