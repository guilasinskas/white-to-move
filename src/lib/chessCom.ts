import { ChessComGame } from "@/types/chessCom";
import { getPaddedNumber } from "./helpers";
import { LoadedGame } from "@/types/game";
import { ReportGame } from "@/types/playerReport";

export const getChessComUserRecentGames = async (
  username: string,
  signal?: AbortSignal
): Promise<LoadedGame[]> => {
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const paddedMonth = getPaddedNumber(month);

  const res = await fetch(
    `https://api.chess.com/pub/player/${username}/games/${year}/${paddedMonth}`,
    { method: "GET", signal }
  );

  const data = await res.json();

  if (
    res.status >= 400 &&
    data.message !== "Date cannot be set in the future"
  ) {
    throw new Error("Error fetching games from Chess.com");
  }

  const games: ChessComGame[] = data?.games ?? [];

  if (games.length < 50) {
    const previousMonth = month === 1 ? 12 : month - 1;
    const previousPaddedMonth = getPaddedNumber(previousMonth);
    const yearToFetch = previousMonth === 12 ? year - 1 : year;

    const resPreviousMonth = await fetch(
      `https://api.chess.com/pub/player/${username}/games/${yearToFetch}/${previousPaddedMonth}`
    );

    const dataPreviousMonth = await resPreviousMonth.json();

    games.push(...(dataPreviousMonth?.games ?? []));
  }

  const gamesToReturn = games
    .filter((game) => game.pgn && game.end_time)
    .sort((a, b) => b.end_time - a.end_time)
    .slice(0, 50)
    .map(formatChessComGame);

  return gamesToReturn;
};

export const getChessComUserGamesForStats = async (
  username: string,
  months: number = 3,
  signal?: AbortSignal
): Promise<LoadedGame[]> => {
  const archivesRes = await fetch(
    `https://api.chess.com/pub/player/${encodeURIComponent(username.trim().toLowerCase())}/games/archives`,
    { signal }
  );
  if (!archivesRes.ok) throw new Error("User not found on Chess.com");

  const archivesData = await archivesRes.json();
  const archives: string[] = archivesData?.archives ?? [];
  if (!archives.length) return [];

  const recentArchives = archives.slice(-Math.max(1, months));

  const monthGames = await Promise.all(
    recentArchives.map(async (url) => {
      const res = await fetch(url, { signal });
      const data = await res.json();
      return (data?.games ?? []) as ChessComGame[];
    })
  );

  return monthGames
    .flat()
    .filter((g) => g.pgn && g.end_time)
    .sort((a, b) => b.end_time - a.end_time)
    .map(formatChessComGame);
};

// Date-ranged, time-class-filtered bulk export for the player report, up to
// `max` games. Chess.com only exposes month-granularity archives, so archives
// overlapping [since, until] are fetched (small concurrency batches to be
// polite to the API) and individual games are filtered by exact end_time.
export const getChessComUserGamesForRange = async (
  username: string,
  opts: { since?: number; until?: number; timeClass?: string; max?: number },
  signal?: AbortSignal,
  onProgress?: (count: number) => void
): Promise<ReportGame[]> => {
  const archivesRes = await fetch(
    `https://api.chess.com/pub/player/${encodeURIComponent(username.trim().toLowerCase())}/games/archives`,
    { signal }
  );
  if (!archivesRes.ok) throw new Error("User not found on Chess.com");

  const archivesData = await archivesRes.json();
  const archives: string[] = archivesData?.archives ?? [];
  if (!archives.length) return [];

  const since = opts.since ?? 0;
  const until = opts.until ?? Date.now();

  const archivesInRange = archives.filter((url) => {
    const match = url.match(/\/(\d{4})\/(\d{2})$/);
    if (!match) return false;
    const [, year, month] = match;
    const monthStart = Date.UTC(Number(year), Number(month) - 1, 1);
    const monthEnd = Date.UTC(Number(year), Number(month), 1) - 1;
    return monthEnd >= since && monthStart <= until;
  });

  const max = opts.max ?? 2000;
  const games: ReportGame[] = [];
  const CONCURRENCY = 4;

  for (
    let i = 0;
    i < archivesInRange.length && games.length < max;
    i += CONCURRENCY
  ) {
    const batch = archivesInRange.slice(i, i + CONCURRENCY);
    const monthResults = await Promise.all(
      batch.map(async (url) => {
        const res = await fetch(url, { signal });
        if (!res.ok) return [];
        const data = await res.json();
        return (data?.games ?? []) as ChessComGame[];
      })
    );

    for (const monthGames of monthResults) {
      for (const g of monthGames) {
        if (!g.pgn || !g.end_time) continue;
        const ms = g.end_time * 1000;
        if (ms < since || ms > until) continue;
        if (opts.timeClass && g.time_class !== opts.timeClass) continue;

        games.push(formatChessComReportGame(g));
        onProgress?.(games.length);
        if (games.length >= max) break;
      }
      if (games.length >= max) break;
    }
  }

  games.sort((a, b) => a.dateMs - b.dateMs);
  return games;
};

export const getChessComUserAvatar = async (
  username: string
): Promise<string | null> => {
  const usernameParam = encodeURIComponent(username.trim().toLowerCase());

  const res = await fetch(`https://api.chess.com/pub/player/${usernameParam}`);
  const data = await res.json();
  const avatarUrl = data?.avatar;

  return typeof avatarUrl === "string" ? avatarUrl : null;
};

const formatChessComGame = (data: ChessComGame): LoadedGame => {
  const result = data.pgn.match(/\[Result "(.*?)"]/)?.[1];
  const movesNb = data.pgn.match(/\d+?\. /g)?.length;

  return {
    id: data.uuid || data.url?.split("/").pop() || data.id,
    pgn: data.pgn || "",
    white: {
      name: data.white?.username || "White",
      rating: data.white?.rating || 0,
      title: data.white?.title,
    },
    black: {
      name: data.black?.username || "Black",
      rating: data.black?.rating || 0,
      title: data.black?.title,
    },
    result,
    timeControl: getGameTimeControl(data),
    date: data.end_time
      ? new Date(data.end_time * 1000).toLocaleDateString()
      : new Date().toLocaleDateString(),
    movesNb: movesNb ? movesNb * 2 : undefined,
    url: data.url,
  };
};

const formatChessComReportGame = (data: ChessComGame): ReportGame => {
  const result = data.pgn.match(/\[Result "(.*?)"]/)?.[1];
  const movesNb = data.pgn.match(/\d+?\. /g)?.length;

  return {
    id: data.uuid || data.url?.split("/").pop() || data.id,
    platform: "chessCom",
    pgn: data.pgn || "",
    white: {
      name: data.white?.username || "White",
      rating: data.white?.rating || 0,
      title: data.white?.title,
    },
    black: {
      name: data.black?.username || "Black",
      rating: data.black?.rating || 0,
      title: data.black?.title,
    },
    result,
    timeControl: getGameTimeControl(data),
    dateMs: data.end_time ? data.end_time * 1000 : Date.now(),
    movesNb: movesNb ? movesNb * 2 : undefined,
    url: data.url,
    clocksCentis: parseClockCentisFromPgn(data.pgn),
  };
};

// Chess.com PGNs annotate each move with a `{[%clk H:MM:SS(.D)]}` comment when
// the game had a clock. Lichess exposes the same information as a plain
// `clocks` array on the API response — this recovers the equivalent for
// Chess.com by parsing the comments in move order.
const parseClockCentisFromPgn = (pgn: string): number[] | undefined => {
  const matches = [...pgn.matchAll(/%clk (\d+):(\d{2}):(\d{2}(?:\.\d+)?)/g)];
  if (!matches.length) return undefined;

  return matches.map(([, h, m, s]) => {
    const totalSeconds = Number(h) * 3600 + Number(m) * 60 + Number(s);
    return Math.round(totalSeconds * 100);
  });
};

const getGameTimeControl = (game: ChessComGame): string | undefined => {
  const rawTimeControl = game.time_control;
  if (!rawTimeControl) return undefined;

  const [firstPart, secondPart] = rawTimeControl.split("+");
  if (!firstPart) return undefined;

  const timeControl = Number(firstPart);
  const increment = secondPart ? `+${secondPart}` : "";
  if (timeControl < 60) return `${timeControl}s${increment}`;

  if (timeControl < 3600) {
    const minutes = Math.floor(timeControl / 60);
    const seconds = timeControl % 60;

    return seconds
      ? `${minutes}m${getPaddedNumber(seconds)}s${increment}`
      : `${minutes}m${increment}`;
  }

  const hours = Math.floor(timeControl / 3600);
  const minutes = Math.floor((timeControl % 3600) / 60);
  return minutes
    ? `${hours}h${getPaddedNumber(minutes)}m${increment}`
    : `${hours}h${increment}`;
};
