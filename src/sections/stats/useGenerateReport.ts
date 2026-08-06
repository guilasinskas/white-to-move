import { useCallback, useRef, useState } from "react";
import { UciEngine } from "@/lib/engine/uciEngine";
import { getRecommendedWorkersNb } from "@/lib/engine/worker";
import { getLichessUserGames } from "@/lib/lichess";
import { getChessComUserGamesForRange } from "@/lib/chessCom";
import { analyzeGames } from "@/lib/playerReport/analyzeGames";
import {
  AggregatedReport,
  buildAggregatedReport,
} from "@/lib/playerReport/aggregate";
import {
  getCachedAnalyses,
  getCachedGames,
  putAnalyses,
  putGames,
  getCachedReport,
  putCachedReport,
  reportMetaKey,
} from "@/lib/playerReport/db";
import {
  GameAnalysis,
  ReportGame,
  ReportPlatform,
  ReportTimeControl,
} from "@/types/playerReport";

export interface GenerateReportParams {
  platform: ReportPlatform;
  username: string;
  timeControl: ReportTimeControl;
  since: number;
  until: number;
  engineDepth: number;
  maxGames: number;
}

export type ReportStatus = "idle" | "fetching" | "analyzing" | "done" | "error";

export interface ReportProgressState {
  status: ReportStatus;
  fetchedCount: number;
  analyzedCount: number;
  analyzeTotal: number;
  error?: string;
}

const IDLE: ReportProgressState = {
  status: "idle",
  fetchedCount: 0,
  analyzedCount: 0,
  analyzeTotal: 0,
};

// Chess.com's monthly archives only expose bullet/blitz/rapid/daily as
// `time_class`. Lichess's ultraBullet/classical selections have no Chess.com
// equivalent, so they fall back to "no filter" on that platform.
function toChessComTimeClass(tc: ReportTimeControl): string | undefined {
  switch (tc) {
    case "bullet":
    case "blitz":
    case "rapid":
      return tc;
    case "correspondence":
      return "daily";
    default:
      return undefined;
  }
}

export function useGenerateReport(engine: UciEngine | null) {
  const [progress, setProgress] = useState<ReportProgressState>(IDLE);
  const [report, setReport] = useState<AggregatedReport | null>(null);
  const gamesByIdRef = useRef<Map<string, ReportGame>>(new Map());

  const generate = useCallback(
    async (params: GenerateReportParams) => {
      setReport(null);
      gamesByIdRef.current = new Map();
      setProgress({
        status: "fetching",
        fetchedCount: 0,
        analyzedCount: 0,
        analyzeTotal: 0,
      });

      const key = reportMetaKey(params);

      try {
        const cached = await getCachedReport(key);
        if (cached) {
          const ids = collectGameIds(cached);
          gamesByIdRef.current = await getCachedGames(params.platform, ids);
          setReport(cached);
          setProgress({
            status: "done",
            fetchedCount: cached.totalGames,
            analyzedCount: cached.totalGames,
            analyzeTotal: cached.totalGames,
          });
          return;
        }

        if (!engine || !engine.getIsReady()) {
          throw new Error("Engine is still loading — try again in a moment.");
        }

        const games =
          params.platform === "lichess"
            ? await getLichessUserGames(
                params.username,
                {
                  since: params.since,
                  until: params.until,
                  perfType: params.timeControl,
                  max: params.maxGames,
                },
                undefined,
                (count) => setProgress((p) => ({ ...p, fetchedCount: count }))
              )
            : await getChessComUserGamesForRange(
                params.username,
                {
                  since: params.since,
                  until: params.until,
                  timeClass: toChessComTimeClass(params.timeControl),
                  max: params.maxGames,
                },
                undefined,
                (count) => setProgress((p) => ({ ...p, fetchedCount: count }))
              );

        for (const g of games) gamesByIdRef.current.set(g.id, g);
        await putGames(games);

        const ids = games.map((g) => g.id);
        const cachedAnalyses = await getCachedAnalyses(
          params.platform,
          ids,
          params.engineDepth
        );
        const gamesNeedingAnalysis = games.filter(
          (g) => !cachedAnalyses.has(g.id)
        );

        setProgress((p) => ({
          ...p,
          status: "analyzing",
          analyzeTotal: gamesNeedingAnalysis.length,
        }));

        const freshAnalyses = gamesNeedingAnalysis.length
          ? await analyzeGames(gamesNeedingAnalysis, {
              engine,
              username: params.username,
              engineDepth: params.engineDepth,
              workersNb: getRecommendedWorkersNb(),
              onProgress: (completed, total) =>
                setProgress((p) => ({
                  ...p,
                  analyzedCount: completed,
                  analyzeTotal: total,
                })),
            })
          : [];

        if (freshAnalyses.length) await putAnalyses(freshAnalyses);

        const allAnalyses: GameAnalysis[] = [
          ...cachedAnalyses.values(),
          ...freshAnalyses,
        ];
        const aggregated = buildAggregatedReport(allAnalyses);

        await putCachedReport(key, aggregated);
        setReport(aggregated);
        setProgress({
          status: "done",
          fetchedCount: games.length,
          analyzedCount: allAnalyses.length,
          analyzeTotal: allAnalyses.length,
        });
      } catch (error) {
        setProgress({
          status: "error",
          fetchedCount: 0,
          analyzedCount: 0,
          analyzeTotal: 0,
          error:
            error instanceof Error
              ? error.message
              : "Failed to generate report",
        });
      }
    },
    [engine]
  );

  return { progress, report, generate, gamesById: gamesByIdRef.current };
}

function collectGameIds(report: AggregatedReport): string[] {
  const ids = new Set<string>();
  for (const family of report.openings) {
    for (const group of family.colorGroups) {
      for (const variation of group.variations) {
        variation.gameIds.forEach((id) => ids.add(id));
      }
    }
  }
  for (const endgame of report.endgames) {
    endgame.gameIds.forEach((id) => ids.add(id));
  }
  return [...ids];
}
