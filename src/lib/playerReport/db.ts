import { openDB, DBSchema, IDBPDatabase } from "idb";
import { GameAnalysis, ReportGame, ReportPlatform } from "@/types/playerReport";
import { AggregatedReport } from "./aggregate";

interface PlayerReportDB extends DBSchema {
  games: {
    key: string; // `${platform}:${id}`
    value: ReportGame;
  };
  gameAnalysis: {
    key: string; // `${platform}:${id}:${engineDepth}`
    value: GameAnalysis;
  };
  reportMeta: {
    key: string; // `${platform}:${username}:${timeControl}:${since}:${until}:${engineDepth}`
    value: AggregatedReport;
  };
}

const DB_NAME = "chesskit-player-report";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<PlayerReportDB>> | undefined;

function getDb(): Promise<IDBPDatabase<PlayerReportDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PlayerReportDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("games")) {
          db.createObjectStore("games");
        }
        if (!db.objectStoreNames.contains("gameAnalysis")) {
          db.createObjectStore("gameAnalysis");
        }
        if (!db.objectStoreNames.contains("reportMeta")) {
          db.createObjectStore("reportMeta");
        }
      },
    });
  }
  return dbPromise;
}

const gameKey = (platform: ReportPlatform, id: string) => `${platform}:${id}`;
const analysisKey = (platform: ReportPlatform, id: string, depth: number) =>
  `${platform}:${id}:${depth}`;

export async function getCachedGames(
  platform: ReportPlatform,
  ids: string[]
): Promise<Map<string, ReportGame>> {
  const db = await getDb();
  const tx = db.transaction("games", "readonly");
  const entries = await Promise.all(
    ids.map(
      async (id) => [id, await tx.store.get(gameKey(platform, id))] as const
    )
  );
  await tx.done;
  const found = new Map<string, ReportGame>();
  for (const [id, game] of entries) if (game) found.set(id, game);
  return found;
}

export async function putGames(games: ReportGame[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("games", "readwrite");
  await Promise.all(
    games.map((g) => tx.store.put(g, gameKey(g.platform, g.id)))
  );
  await tx.done;
}

export async function getCachedAnalyses(
  platform: ReportPlatform,
  ids: string[],
  engineDepth: number
): Promise<Map<string, GameAnalysis>> {
  const db = await getDb();
  const tx = db.transaction("gameAnalysis", "readonly");
  const entries = await Promise.all(
    ids.map(
      async (id) =>
        [
          id,
          await tx.store.get(analysisKey(platform, id, engineDepth)),
        ] as const
    )
  );
  await tx.done;
  const found = new Map<string, GameAnalysis>();
  for (const [id, analysis] of entries) if (analysis) found.set(id, analysis);
  return found;
}

export async function putAnalyses(analyses: GameAnalysis[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("gameAnalysis", "readwrite");
  await Promise.all(
    analyses.map((a) =>
      tx.store.put(a, analysisKey(a.platform, a.gameId, a.engineDepth))
    )
  );
  await tx.done;
}

export function reportMetaKey(params: {
  platform: ReportPlatform;
  username: string;
  timeControl: string;
  since: number;
  until: number;
  engineDepth: number;
}): string {
  const { platform, username, timeControl, since, until, engineDepth } = params;
  return `${platform}:${username.toLowerCase()}:${timeControl}:${since}:${until}:${engineDepth}`;
}

export async function getCachedReport(
  key: string
): Promise<AggregatedReport | undefined> {
  const db = await getDb();
  return db.get("reportMeta", key);
}

export async function putCachedReport(
  key: string,
  report: AggregatedReport
): Promise<void> {
  const db = await getDb();
  await db.put("reportMeta", report, key);
}
