import { Icon } from "@iconify/react";
import {
  engineDepthAtom,
  engineMultiPvAtom,
  engineNameAtom,
  engineWorkersNbAtom,
  evaluationProgressAtom,
  gameAtom,
  gameEvalAtom,
  savedEvalsAtom,
} from "../states";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { getEvaluateGameParams } from "@/lib/chess";
import { useGameDatabase } from "@/hooks/useGameDatabase";
import { LoadingButton } from "@mui/lab";
import { useEngine } from "@/hooks/useEngine";
import { logAnalyticsEvent } from "@/lib/firebase";
import { SavedEvals } from "@/types/eval";
import { useEffect, useCallback, useRef } from "react";
import { usePlayersData } from "@/hooks/usePlayersData";
import { Typography } from "@mui/material";
import { useCurrentPosition } from "../hooks/useCurrentPosition";

export default function AnalyzeButton() {
  const engineName = useAtomValue(engineNameAtom);
  const engine = useEngine(engineName);
  useCurrentPosition(engine);
  const engineWorkersNb = useAtomValue(engineWorkersNbAtom);
  const [evaluationProgress, setEvaluationProgress] = useAtom(
    evaluationProgressAtom
  );
  const engineDepth = useAtomValue(engineDepthAtom);
  const engineMultiPv = useAtomValue(engineMultiPvAtom);
  const { setGameEval, gameFromUrl } = useGameDatabase();
  const [gameEval, setEval] = useAtom(gameEvalAtom);
  const game = useAtomValue(gameAtom);
  const setSavedEvals = useSetAtom(savedEvalsAtom);
  const { white, black } = usePlayersData(gameAtom);

  const readyToAnalyse =
    engine?.getIsReady() && game.history().length > 0 && !evaluationProgress;

  // "/" doesn't remount when navigating here from the database with a
  // different game, so a still-running analysis for the previous game isn't
  // torn down — it resolves in the background and, without this guard,
  // would overwrite whatever's now on screen with the old game's results.
  const latestGameRef = useRef(game);
  useEffect(() => {
    latestGameRef.current = game;
  }, [game]);

  const handleAnalyze = useCallback(async () => {
    const gameAtStart = game;
    const params = getEvaluateGameParams(game);
    if (
      !engine?.getIsReady() ||
      params.fens.length === 0 ||
      evaluationProgress
    ) {
      return;
    }

    const newGameEval = await engine.evaluateGame({
      ...params,
      depth: engineDepth,
      multiPv: engineMultiPv,
      setEvaluationProgress,
      playersRatings: {
        white: white?.rating,
        black: black?.rating,
      },
      workersNb: engineWorkersNb,
    });

    if (latestGameRef.current !== gameAtStart) {
      // The active game changed while this analysis was running — discard
      // the stale result instead of clobbering the newer game's state.
      return;
    }

    setEval(newGameEval);
    setEvaluationProgress(0);

    if (gameFromUrl) {
      setGameEval(gameFromUrl.id, newGameEval);
    }

    const gameSavedEvals: SavedEvals = params.fens.reduce((acc, fen, idx) => {
      acc[fen] = { ...newGameEval.positions[idx], engine: engineName };
      return acc;
    }, {} as SavedEvals);
    setSavedEvals((prev) => ({
      ...prev,
      ...gameSavedEvals,
    }));

    logAnalyticsEvent("analyze_game", {
      engine: engineName,
      depth: engineDepth,
      multiPv: engineMultiPv,
      nbPositions: params.fens.length,
    });
  }, [
    engine,
    engineName,
    engineWorkersNb,
    game,
    engineDepth,
    engineMultiPv,
    evaluationProgress,
    setEvaluationProgress,
    setEval,
    gameFromUrl,
    setGameEval,
    setSavedEvals,
    white.rating,
    black.rating,
  ]);

  useEffect(() => {
    setEvaluationProgress(0);
  }, [engine, setEvaluationProgress]);

  // Automatically analyze when a new game is loaded and ready to analyze.
  // Deferred one frame so the freshly-loaded position paints before the
  // (synchronous, per-position) engine dispatch loop starts.
  useEffect(() => {
    if (!gameEval && readyToAnalyse) {
      const frame = requestAnimationFrame(() => handleAnalyze());
      return () => cancelAnimationFrame(frame);
    }
    return undefined;
  }, [gameEval, readyToAnalyse, handleAnalyze]);

  if (evaluationProgress) return null;

  return (
    <LoadingButton
      variant="contained"
      size="small"
      startIcon={<Icon icon="streamline:magnifying-glass-solid" height={12} />}
      onClick={handleAnalyze}
      disabled={!readyToAnalyse}
    >
      <Typography fontSize="0.9em" fontWeight="500" lineHeight="1.4em">
        {gameEval ? "Analyze again" : "Analyze"}
      </Typography>
    </LoadingButton>
  );
}
