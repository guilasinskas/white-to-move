import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { OpeningFamilyRow } from "@/lib/playerReport/aggregate";
import { ReportGame } from "@/types/playerReport";
import { CC } from "@/constants";
import { StatRow } from "./statRow";
import { GameRow } from "./gameRow";
import { TableColumnHeader } from "./tableColumnHeader";

export default function OpeningTreeTable({
  families,
  gamesById,
  username,
  onOpenGame,
}: {
  families: OpeningFamilyRow[];
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

  if (families.length === 0) {
    return (
      <Box sx={{ px: 3, py: 6, textAlign: "center" }}>
        <Typography sx={{ fontSize: 14, color: CC.textSub }}>
          No games with a recognized opening in this range.
        </Typography>
      </Box>
    );
  }

  const maxGames = Math.max(...families.map((f) => f.games));
  const totalGames = families.reduce((sum, f) => sum + f.games, 0);

  return (
    <Box
      sx={{
        borderRadius: "var(--cc-radius-xl)",
        overflow: "hidden",
        backgroundColor: "var(--cc-surface-container-lowest)",
        boxShadow: "var(--cc-shadow-ambient)",
      }}
    >
      <Box
        sx={{
          px: 3,
          py: 2.5,
          borderBottom: `1px solid ${CC.border}`,
        }}
      >
        <Typography
          sx={{
            fontFamily: "var(--cc-font-headline)",
            fontSize: 22,
            fontWeight: 700,
            color: CC.text,
          }}
        >
          Openings
        </Typography>
        <Typography sx={{ fontSize: 13, color: CC.textSub, mt: 0.5 }}>
          Every family, then its colors and named variations. Open a row to go
          one level deeper, and a variation to list the games behind it.
        </Typography>
      </Box>

      <TableColumnHeader
        firstLabel="Opening"
        betterLabel="W from better"
        equalLabel="W/D from equal"
        worseLabel="W/D from worse"
      />

      {families.map((family, familyIndex) => {
        const familyKey = `f:${family.family}`;
        const familyExpanded = expanded.has(familyKey);
        const colors = family.colorGroups.map((g) => g.color);

        return (
          <Box key={familyKey}>
            <StatRow
              data={{
                key: familyKey,
                label: family.family,
                colors,
                descriptor: colors.length > 1 ? "mixed below" : undefined,
                games: family.games,
                wins: family.wins,
                draws: family.draws,
                losses: family.losses,
                scorePct: family.scorePct,
                vsExpectedPoints: family.vsExpectedPoints,
                vsExpectedMarginPoints: family.vsExpectedMarginPoints,
                quality: family.quality,
                fromBetter: family.fromBetter,
                fromEqual: family.fromEqual,
                fromWorse: family.fromWorse,
              }}
              depth={0}
              index={familyIndex + 1}
              maxGames={maxGames}
              totalGames={totalGames}
              expandable
              expanded={familyExpanded}
              onToggle={() => toggle(familyKey)}
            />

            {familyExpanded &&
              family.colorGroups.map((group) => {
                const groupKey = `${familyKey}:c:${group.color}`;
                const groupExpanded = expanded.has(groupKey);
                const showColorRow = family.colorGroups.length > 1;

                return (
                  <Box key={groupKey}>
                    {showColorRow && (
                      <StatRow
                        data={{
                          key: groupKey,
                          label: group.color === "white" ? "White" : "Black",
                          games: group.games,
                          wins: group.wins,
                          draws: group.draws,
                          losses: group.losses,
                          scorePct: group.scorePct,
                          vsExpectedPoints: group.vsExpectedPoints,
                          vsExpectedMarginPoints: group.vsExpectedMarginPoints,
                          quality: group.quality,
                          fromBetter: group.fromBetter,
                          fromEqual: group.fromEqual,
                          fromWorse: group.fromWorse,
                        }}
                        depth={1}
                        maxGames={maxGames}
                        totalGames={totalGames}
                        expandable
                        expanded={groupExpanded}
                        onToggle={() => toggle(groupKey)}
                      />
                    )}

                    {(groupExpanded || !showColorRow) &&
                      group.variations.map((variation) => {
                        const variationKey = `${groupKey}:v:${variation.name}`;
                        const variationExpanded = expanded.has(variationKey);

                        return (
                          <Box key={variationKey}>
                            <StatRow
                              data={{
                                key: variationKey,
                                label: variation.name,
                                games: variation.games,
                                wins: variation.wins,
                                draws: variation.draws,
                                losses: variation.losses,
                                scorePct: variation.scorePct,
                                vsExpectedPoints: variation.vsExpectedPoints,
                                vsExpectedMarginPoints:
                                  variation.vsExpectedMarginPoints,
                                quality: variation.quality,
                                fromBetter: variation.fromBetter,
                                fromEqual: variation.fromEqual,
                                fromWorse: variation.fromWorse,
                              }}
                              depth={showColorRow ? 2 : 1}
                              maxGames={maxGames}
                              totalGames={totalGames}
                              expandable={variation.gameIds.length > 0}
                              expanded={variationExpanded}
                              onToggle={() => toggle(variationKey)}
                            />

                            {variationExpanded && (
                              <Box
                                sx={{
                                  pl: showColorRow ? 8 : 5.5,
                                  pr: 2,
                                  py: 1,
                                }}
                              >
                                {variation.gameIds.map((gameId) => {
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
                  </Box>
                );
              })}
          </Box>
        );
      })}
    </Box>
  );
}
