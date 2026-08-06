import {
  ConfidenceInterval,
  wilsonInterval,
} from "@/lib/stats/confidenceInterval";
import {
  expectedScore,
  scoreToRatingDiff,
  vsExpectedRatingPoints,
} from "@/lib/stats/expectedScore";
import { EndgameType, GameAnalysis, ReportEval } from "@/types/playerReport";

const ENDGAME_LABELS: Record<EndgameType, string> = {
  queen: "Queen ending",
  rook: "Rook ending",
  minor: "Minor-piece ending",
  pawn: "Pawn ending",
};
const ENDGAME_ORDER: EndgameType[] = ["rook", "queen", "minor", "pawn"];

// A position is "better"/"worse" once the player-relative eval clears this
// threshold; inside the band (and no forced mate) counts as "equal". Used for
// both the opening book-exit verdict and the endgame-entry verdict.
const EQUAL_BAND_CP = 50;

export interface RecordStats {
  games: number;
  wins: number;
  draws: number;
  losses: number;
  scorePct: number;
  vsExpectedPoints?: number;
  vsExpectedMarginPoints?: number;
}

export interface QualityStats {
  avgCp?: number;
  rangeCp?: [number, number];
  matesFor: number;
  matesAgainst: number;
}

export interface OpeningVariationRow extends RecordStats {
  name: string;
  quality?: QualityStats;
  fromBetter?: ConfidenceInterval;
  fromEqual?: ConfidenceInterval;
  fromWorse?: ConfidenceInterval;
  gameIds: string[];
}

export interface OpeningColorGroup extends RecordStats {
  color: "white" | "black";
  quality?: QualityStats;
  fromBetter?: ConfidenceInterval;
  fromEqual?: ConfidenceInterval;
  fromWorse?: ConfidenceInterval;
  variations: OpeningVariationRow[];
}

export interface OpeningFamilyRow extends RecordStats {
  family: string;
  colorLabel: "White" | "Black" | "mixed below" | "no single chooser";
  quality?: QualityStats;
  fromBetter?: ConfidenceInterval;
  fromEqual?: ConfidenceInterval;
  fromWorse?: ConfidenceInterval;
  colorGroups: OpeningColorGroup[];
}

export interface EndgameTypeRow {
  type: EndgameType;
  label: string;
  games: number;
  fromWinning?: ConfidenceInterval;
  fromEqual?: ConfidenceInterval;
  fromLosing?: ConfidenceInterval;
  gameIds: string[];
}

export interface AggregatedReport {
  generatedAtMs: number;
  totalGames: number;
  qualifyingEndgameGames: number;
  excludedDecidedGames: number;
  openings: OpeningFamilyRow[];
  endgames: EndgameTypeRow[];
  underThirtySeconds?: { rate: number; total: number };
  fromThirtySecondsOrMore?: { rate: number; total: number };
}

function recordStats(games: GameAnalysis[]): RecordStats {
  const wins = games.filter((g) => g.result === "win").length;
  const draws = games.filter((g) => g.result === "draw").length;
  const losses = games.filter((g) => g.result === "loss").length;
  const total = games.length;
  const scorePct =
    total > 0 ? Math.round(((wins + draws / 2) / total) * 1000) / 10 : 0;

  const ratedGames = games.filter(
    (g) => g.playerRating !== undefined && g.opponentRating !== undefined
  );
  let vsExpectedPoints: number | undefined;
  let vsExpectedMarginPoints: number | undefined;
  if (ratedGames.length > 0) {
    const actualScore =
      ratedGames.reduce((sum, g) => {
        if (g.result === "win") return sum + 1;
        if (g.result === "draw") return sum + 0.5;
        return sum;
      }, 0) / ratedGames.length;
    const expected =
      ratedGames.reduce(
        (sum, g) => sum + expectedScore(g.playerRating!, g.opponentRating!),
        0
      ) / ratedGames.length;
    vsExpectedPoints = vsExpectedRatingPoints(actualScore, expected);

    // Standard error of the mean score, translated into the same
    // rating-points units as vsExpectedPoints via the local slope of the
    // score->rating curve — a normal-approximation ± margin, not a true CI.
    const standardError = Math.sqrt(
      Math.max(0, actualScore * (1 - actualScore)) / ratedGames.length
    );
    const upperScore = Math.min(0.999, actualScore + 1.96 * standardError);
    vsExpectedMarginPoints = Math.round(
      scoreToRatingDiff(upperScore) - scoreToRatingDiff(actualScore)
    );
  }

  return {
    games: total,
    wins,
    draws,
    losses,
    scorePct,
    vsExpectedPoints,
    vsExpectedMarginPoints,
  };
}

function qualityStats(
  games: GameAnalysis[],
  pickEval: (g: GameAnalysis) => ReportEval | undefined
): QualityStats | undefined {
  const evals = games.map(pickEval).filter((e): e is ReportEval => !!e);
  if (evals.length === 0) return undefined;

  const cps = evals.filter((e) => e.mate === undefined).map((e) => e.cp ?? 0);
  const matesFor = evals.filter((e) => (e.mate ?? 0) > 0).length;
  const matesAgainst = evals.filter((e) => (e.mate ?? 0) < 0).length;

  if (cps.length === 0) {
    return { matesFor, matesAgainst };
  }

  const sorted = [...cps].sort((a, b) => a - b);
  const avgCp =
    Math.round(sorted.reduce((s, v) => s + v, 0) / sorted.length / 10) / 10;
  const p10 = sorted[Math.floor(0.1 * (sorted.length - 1))];
  const p90 = sorted[Math.floor(0.9 * (sorted.length - 1))];

  return {
    avgCp,
    rangeCp: [Math.round(p10) / 100, Math.round(p90) / 100],
    matesFor,
    matesAgainst,
  };
}

type EvalBucket = "better" | "equal" | "worse";

function bucketEval(evalValue: ReportEval | undefined): EvalBucket | undefined {
  if (!evalValue) return undefined;
  if (evalValue.mate !== undefined) {
    return evalValue.mate > 0 ? "better" : "worse";
  }
  if (evalValue.cp === undefined) return undefined;
  if (evalValue.cp > EQUAL_BAND_CP) return "better";
  if (evalValue.cp < -EQUAL_BAND_CP) return "worse";
  return "equal";
}

function bucketedRates(
  games: GameAnalysis[],
  pickEval: (g: GameAnalysis) => ReportEval | undefined
): {
  fromBetter?: ConfidenceInterval;
  fromEqual?: ConfidenceInterval;
  fromWorse?: ConfidenceInterval;
} {
  const buckets: Record<EvalBucket, GameAnalysis[]> = {
    better: [],
    equal: [],
    worse: [],
  };

  for (const game of games) {
    const bucket = bucketEval(pickEval(game));
    if (bucket) buckets[bucket].push(game);
  }

  const winRate = (subset: GameAnalysis[]) =>
    subset.length
      ? wilsonInterval(
          subset.filter((g) => g.result === "win").length,
          subset.length
        )
      : undefined;
  const winOrDrawRate = (subset: GameAnalysis[]) =>
    subset.length
      ? wilsonInterval(
          subset.filter((g) => g.result !== "loss").length,
          subset.length
        )
      : undefined;

  return {
    fromBetter: winRate(buckets.better),
    fromEqual: winOrDrawRate(buckets.equal),
    fromWorse: winOrDrawRate(buckets.worse),
  };
}

function buildVariationRow(
  name: string,
  games: GameAnalysis[]
): OpeningVariationRow {
  return {
    name,
    ...recordStats(games),
    quality: qualityStats(games, (g) => g.bookExitEval),
    ...bucketedRates(games, (g) => g.bookExitEval),
    gameIds: games.map((g) => g.gameId),
  };
}

function colorLabelFor(games: GameAnalysis[]): OpeningFamilyRow["colorLabel"] {
  const hasWhite = games.some((g) => g.color === "white");
  const hasBlack = games.some((g) => g.color === "black");
  if (hasWhite && hasBlack) return "mixed below";
  return hasWhite ? "White" : "Black";
}

export function aggregateOpenings(games: GameAnalysis[]): OpeningFamilyRow[] {
  const withOpening = games.filter((g) => g.opening);

  const byFamily = groupBy(withOpening, (g) => g.opening!.family);

  const families: OpeningFamilyRow[] = Object.entries(byFamily).map(
    ([family, familyGames]) => {
      const byColor = groupBy(familyGames, (g) => g.color);
      const colorGroups: OpeningColorGroup[] = Object.entries(byColor).map(
        ([color, colorGames]) => {
          const byVariation = groupBy(colorGames, (g) => g.opening!.variation);
          const variations = Object.entries(byVariation)
            .map(([name, vGames]) => buildVariationRow(name, vGames))
            .sort((a, b) => b.games - a.games);

          return {
            color: color as "white" | "black",
            ...recordStats(colorGames),
            quality: qualityStats(colorGames, (g) => g.bookExitEval),
            ...bucketedRates(colorGames, (g) => g.bookExitEval),
            variations,
          };
        }
      );
      colorGroups.sort((a, b) => b.games - a.games);

      return {
        family,
        colorLabel: colorLabelFor(familyGames),
        ...recordStats(familyGames),
        quality: qualityStats(familyGames, (g) => g.bookExitEval),
        ...bucketedRates(familyGames, (g) => g.bookExitEval),
        colorGroups,
      };
    }
  );

  return families.sort((a, b) => b.games - a.games);
}

export function aggregateEndgames(games: GameAnalysis[]): EndgameTypeRow[] {
  const withEndgame = games.filter((g) => g.endgame);
  const byType = groupBy(withEndgame, (g) => g.endgame!.type);

  const rows: EndgameTypeRow[] = ENDGAME_ORDER.filter(
    (t) => byType[t]?.length
  ).map((type) => {
    const typeGames = byType[type];
    const qualifying = typeGames.filter((g) => !g.endgame!.alreadyDecided);

    const buckets: Record<"winning" | "equal" | "losing", GameAnalysis[]> = {
      winning: [],
      equal: [],
      losing: [],
    };
    for (const g of qualifying) {
      const bucket = bucketEval(g.endgame!.entryEval);
      if (bucket === "better") buckets.winning.push(g);
      else if (bucket === "worse") buckets.losing.push(g);
      else if (bucket === "equal") buckets.equal.push(g);
    }

    return {
      type,
      label: ENDGAME_LABELS[type],
      games: typeGames.length,
      fromWinning: buckets.winning.length
        ? wilsonInterval(
            buckets.winning.filter((g) => g.result === "win").length,
            buckets.winning.length
          )
        : undefined,
      fromEqual: buckets.equal.length
        ? wilsonInterval(
            buckets.equal.filter((g) => g.result !== "loss").length,
            buckets.equal.length
          )
        : undefined,
      fromLosing: buckets.losing.length
        ? wilsonInterval(
            buckets.losing.filter((g) => g.result !== "loss").length,
            buckets.losing.length
          )
        : undefined,
      gameIds: typeGames.map((g) => g.gameId),
    };
  });

  return rows;
}

export function buildAggregatedReport(games: GameAnalysis[]): AggregatedReport {
  const endgameGames = games.filter((g) => g.endgame);
  const qualifying = endgameGames.filter((g) => !g.endgame!.alreadyDecided);
  const excluded = endgameGames.length - qualifying.length;

  const withClock = qualifying.filter(
    (g) => g.endgame!.entryClockCentis !== undefined
  );
  const underThirty = withClock.filter(
    (g) => (g.endgame!.entryClockCentis ?? 0) < 3000
  );
  const overThirty = withClock.filter(
    (g) => (g.endgame!.entryClockCentis ?? 0) >= 3000
  );
  const heldOrConverted = (subset: GameAnalysis[]) =>
    subset.length
      ? Math.round(
          (subset.filter((g) => g.result !== "loss").length / subset.length) *
            100
        )
      : 0;

  return {
    generatedAtMs: Date.now(),
    totalGames: games.length,
    qualifyingEndgameGames: qualifying.length,
    excludedDecidedGames: excluded,
    openings: aggregateOpenings(games),
    endgames: aggregateEndgames(games),
    underThirtySeconds: underThirty.length
      ? { rate: heldOrConverted(underThirty), total: underThirty.length }
      : undefined,
    fromThirtySecondsOrMore: overThirty.length
      ? { rate: heldOrConverted(overThirty), total: overThirty.length }
      : undefined,
  };
}

function groupBy<T, K extends string>(
  items: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  const result = {} as Record<K, T[]>;
  for (const item of items) {
    const key = keyFn(item);
    (result[key] ??= []).push(item);
  }
  return result;
}
