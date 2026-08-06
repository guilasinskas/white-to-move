import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { AggregatedReport } from "@/lib/playerReport/aggregate";
import { ReportGame } from "@/types/playerReport";
import { CC } from "@/constants";
import { StatRow } from "./statRow";
import { GameRow } from "./gameRow";
import { TableColumnHeader } from "./tableColumnHeader";

const ENDGAME_COLUMNS = {
  better: "W from winning",
  equal: "W/D from equal",
  worse: "W/D from losing",
};

export default function EndgameTable({
  report,
  gamesById,
  username,
  onOpenGame,
}: {
  report: AggregatedReport;
  gamesById: Map<string, ReportGame>;
  username: string;
  onOpenGame: (gameId: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  if (report.endgames.length === 0) {
    return (
      <Box sx={{ px: 3, py: 6, textAlign: "center" }}>
        <Typography sx={{ fontSize: 14, color: CC.textSub }}>
          No endgame structure lasted long enough to qualify in this range.
        </Typography>
      </Box>
    );
  }

  const maxGames = Math.max(...report.endgames.map((row) => row.games));
  const totalGames = report.endgames.reduce((sum, row) => sum + row.games, 0);

  return (
    <Box
      sx={{
        borderRadius: "var(--cc-radius-xl)",
        overflow: "hidden",
        backgroundColor: "var(--cc-surface-container-lowest)",
        boxShadow: "var(--cc-shadow-ambient)",
      }}
    >
      <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${CC.border}` }}>
        <Typography
          sx={{
            fontFamily: "var(--cc-font-headline)",
            fontSize: 22,
            fontWeight: 700,
            color: CC.text,
          }}
        >
          Endgames
        </Typography>
        <Typography sx={{ fontSize: 13, color: CC.textSub, mt: 0.5 }}>
          One observation per game: the final structure that lasted at least 8
          plies, judged from the position where you entered it.
        </Typography>
      </Box>

      <TableColumnHeader
        firstLabel="Endgame"
        betterLabel={ENDGAME_COLUMNS.better}
        equalLabel={ENDGAME_COLUMNS.equal}
        worseLabel={ENDGAME_COLUMNS.worse}
        showRecordColumns={false}
      />

      {report.endgames.map((row, index) => {
        const key = `e:${row.type}`;
        const isExpanded = expanded.has(key);

        return (
          <Box key={key}>
            <StatRow
              data={{
                key,
                label: row.label,
                games: row.games,
                wins: 0,
                draws: 0,
                losses: 0,
                scorePct: 0,
                fromBetter: row.fromWinning,
                fromEqual: row.fromEqual,
                fromWorse: row.fromLosing,
              }}
              depth={0}
              index={index + 1}
              maxGames={maxGames}
              totalGames={totalGames}
              expandable={row.gameIds.length > 0}
              expanded={isExpanded}
              onToggle={() => toggle(key)}
              columnLabels={ENDGAME_COLUMNS}
              showRecordColumns={false}
            />

            {isExpanded && (
              <Box sx={{ pl: 5.5, pr: 2, py: 1 }}>
                {row.gameIds.map((gameId) => {
                  const game = gamesById.get(gameId);
                  if (!game) return null;
                  return (
                    <GameRow
                      key={gameId}
                      game={game}
                      username={username}
                      onClick={() => onOpenGame(gameId)}
                    />
                  );
                })}
              </Box>
            )}
          </Box>
        );
      })}

      {(report.underThirtySeconds || report.fromThirtySecondsOrMore) && (
        <Box sx={{ px: 3, py: 1.5 }}>
          <Typography sx={{ fontSize: 12, color: CC.textMuted }}>
            Under 30 seconds on your clock you convert or hold{" "}
            {report.underThirtySeconds?.rate ?? 0}% (
            {report.underThirtySeconds?.total ?? 0}) against{" "}
            {report.fromThirtySecondsOrMore?.rate ?? 0}% (
            {report.fromThirtySecondsOrMore?.total ?? 0}) otherwise.
          </Typography>
        </Box>
      )}

      {report.excludedDecidedGames > 0 && (
        <Box sx={{ px: 3, pb: 2 }}>
          <Typography sx={{ fontSize: 12, color: CC.textMuted }}>
            {report.excludedDecidedGames} game
            {report.excludedDecidedGames !== 1 ? "s were" : " was"} already
            decided by 3 pawns or more at entry and{" "}
            {report.excludedDecidedGames !== 1 ? "are" : "is"} excluded.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
