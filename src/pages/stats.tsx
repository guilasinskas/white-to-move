import { useRouter } from "next/router";
import {
  Box,
  Typography,
  LinearProgress,
  Alert,
  Grid2 as Grid,
} from "@mui/material";
import { PageTitle } from "@/components/pageTitle";
import { CC, DEFAULT_ENGINE } from "@/constants";
import { useEngine } from "@/hooks/useEngine";
import ReportForm, { ReportQuery } from "@/sections/stats/reportForm";
import OpeningTreeTable from "@/sections/stats/openingTreeTable";
import EndgameTable from "@/sections/stats/endgameTable";
import { useGenerateReport } from "@/sections/stats/useGenerateReport";
import { useState } from "react";

function dateInputToMs(value: string, endOfDay: boolean): number {
  const [year, month, day] = value.split("-").map(Number);
  return endOfDay
    ? Date.UTC(year, month - 1, day, 23, 59, 59, 999)
    : Date.UTC(year, month - 1, day, 0, 0, 0, 0);
}

export default function StatsPage() {
  const router = useRouter();
  const engine = useEngine(DEFAULT_ENGINE);
  const { progress, report, generate, gamesById } = useGenerateReport(engine);
  const [username, setUsername] = useState("");

  const isWorking =
    progress.status === "fetching" || progress.status === "analyzing";

  const handleSubmit = (query: ReportQuery) => {
    setUsername(query.username);
    generate({
      platform: query.platform,
      username: query.username,
      timeControl: query.timeControl,
      since: dateInputToMs(query.since, false),
      until: dateInputToMs(query.until, true),
      engineDepth: query.engineDepth,
      maxGames: query.maxGames,
    });
  };

  const handleOpenGame = (gameId: string) => {
    const game = gamesById.get(gameId);
    if (!game) return;
    sessionStorage.setItem("pendingOpeningPgn", game.pgn);
    router.push("/");
  };

  return (
    <Box>
      <PageTitle title="White to Move — Player Report" />

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          height: 64,
          px: { xs: 2, md: 3 },
          backgroundColor:
            "color-mix(in srgb, var(--cc-surface) 80%, transparent)",
          backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${CC.border}`,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Typography
          sx={{
            fontFamily: "var(--cc-font-headline)",
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: CC.primary,
          }}
        >
          Player Report
        </Typography>
      </Box>

      <Grid
        container
        justifyContent="center"
        sx={{ pt: { xs: 1, lg: 2 }, px: { xs: 1, sm: 2 }, pb: 4 }}
      >
        <Grid container size={12} maxWidth={1000} gap={3} direction="column">
          <ReportForm onSubmit={handleSubmit} disabled={isWorking} />

          {progress.status === "error" && (
            <Alert severity="error">{progress.error}</Alert>
          )}

          {progress.status === "fetching" && (
            <Box>
              <Typography sx={{ fontSize: 13, color: CC.textSub, mb: 0.5 }}>
                Fetching games… {progress.fetchedCount.toLocaleString()}
              </Typography>
              <LinearProgress />
            </Box>
          )}

          {progress.status === "analyzing" && (
            <Box>
              <Typography sx={{ fontSize: 13, color: CC.textSub, mb: 0.5 }}>
                Analyzing… {progress.analyzedCount.toLocaleString()} /{" "}
                {progress.analyzeTotal.toLocaleString()}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={
                  progress.analyzeTotal > 0
                    ? Math.min(
                        100,
                        (progress.analyzedCount / progress.analyzeTotal) * 100
                      )
                    : 0
                }
              />
            </Box>
          )}

          {report && progress.status === "done" && (
            <>
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: "var(--cc-radius-xl)",
                  backgroundColor: "var(--cc-surface-container-lowest)",
                  boxShadow: "var(--cc-shadow-ambient)",
                }}
              >
                <Typography
                  sx={{ fontSize: 18, fontWeight: 700, color: CC.text }}
                >
                  {username}
                </Typography>
                <Typography sx={{ fontSize: 13, color: CC.textSub }}>
                  {report.totalGames.toLocaleString()} games ·{" "}
                  {report.qualifyingEndgameGames.toLocaleString()} qualifying
                  endgames
                </Typography>
              </Box>

              <OpeningTreeTable
                families={report.openings}
                gamesById={gamesById}
                username={username}
                onOpenGame={handleOpenGame}
              />

              <EndgameTable
                report={report}
                gamesById={gamesById}
                username={username}
                onOpenGame={handleOpenGame}
              />
            </>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
