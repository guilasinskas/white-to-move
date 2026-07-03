import {
  Box,
  Button,
  Typography,
  useTheme,
  CircularProgress,
} from "@mui/material";
import { Icon } from "@iconify/react";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import { CC } from "@/constants";
import { PageTitle } from "@/components/pageTitle";
import { useExerciseDatabase } from "@/hooks/useExerciseDatabase";
import { useAtomValue, useSetAtom } from "jotai";
import {
  exerciseDescriptionAtom,
  exerciseModeAtom,
  exerciseNameAtom,
  exerciseTimeLimitSecondsAtom,
  exerciseTreeAtom,
  hasUnsavedChangesAtom,
  solutionRevealedAtom,
} from "@/sections/exercises/states";
import {
  initializeExerciseAction,
  markExerciseSavedAction,
} from "@/sections/exercises/actions";
import ExerciseBoard from "@/sections/exercises/ExerciseBoard";
import ExerciseMoveTree from "@/sections/exercises/ExerciseMoveTree";
import ExercisePanel from "@/sections/exercises/ExercisePanel";
import PositionEditor from "@/sections/exercises/PositionEditor";
import { createEmptyExerciseTree } from "@/lib/exerciseTree";
import { isValidFen } from "@/lib/fen";

export default function ExerciseEditorPage() {
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { id: idQuery } = router.query;
  const id = useMemo(
    () => (typeof idQuery === "string" ? parseInt(idQuery) : NaN),
    [idQuery]
  );
  const { getExercise, updateExercise, isReady } = useExerciseDatabase(true);

  const exercise = !isNaN(id) ? getExercise(id) : undefined;

  const tree = useAtomValue(exerciseTreeAtom);
  const name = useAtomValue(exerciseNameAtom);
  const description = useAtomValue(exerciseDescriptionAtom);
  const timeLimitSeconds = useAtomValue(exerciseTimeLimitSecondsAtom);
  const hasUnsavedChanges = useAtomValue(hasUnsavedChangesAtom);
  const mode = useAtomValue(exerciseModeAtom);
  const solutionRevealed = useAtomValue(solutionRevealedAtom);
  const initializeExercise = useSetAtom(initializeExerciseAction);
  const markSaved = useSetAtom(markExerciseSavedAction);

  const [isSaving, setIsSaving] = useState(false);
  const [editingPosition, setEditingPosition] = useState(false);
  const [positionDraftFen, setPositionDraftFen] = useState("");

  const loadedExerciseIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!exercise) return;
    if (loadedExerciseIdRef.current === exercise.id) return;

    loadedExerciseIdRef.current = exercise.id;
    initializeExercise(exercise);
  }, [exercise, initializeExercise]);

  const handleSave = async () => {
    if (!exercise) return;
    setIsSaving(true);
    try {
      await updateExercise(exercise.id, {
        name: name.trim() || exercise.name,
        description: description.trim() || undefined,
        timeLimitSeconds,
        tree,
      });
      markSaved();
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecordAttempt = async (
    correct: boolean,
    timeTakenSeconds?: number,
    timedOut?: boolean
  ) => {
    if (!exercise) return;
    await updateExercise(exercise.id, {
      attempts: [
        ...exercise.attempts,
        { date: new Date().toISOString(), correct, timeTakenSeconds, timedOut },
      ],
    });
  };

  const hasSolutionMoves = tree.nodes[tree.rootId]?.children.length > 0;

  const handleStartEditPosition = () => {
    setPositionDraftFen(exercise?.startingFen ?? tree.rootFen);
    setEditingPosition(true);
  };

  const handleSavePosition = async () => {
    if (!exercise || !isValidFen(positionDraftFen)) return;
    setIsSaving(true);
    try {
      const newTree = createEmptyExerciseTree(positionDraftFen);
      const updated = await updateExercise(exercise.id, {
        startingFen: positionDraftFen,
        tree: newTree,
      });
      initializeExercise(updated);
      setEditingPosition(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isReady || !router.isReady) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "60vh",
        }}
      >
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (!exercise) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h3" sx={{ mb: 1 }}>
          Exercise not found
        </Typography>
        <Typography sx={{ color: isDark ? CC.textSub : CC.lTextSub }}>
          It may have been deleted.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: { lg: "100dvh" },
        display: "flex",
        flexDirection: "column",
        overflow: { lg: "hidden" },
      }}
    >
      <PageTitle title={`${exercise.name} — Exercises`} />

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 64,
          px: { xs: 2, md: 3 },
          backgroundColor:
            "color-mix(in srgb, var(--cc-surface) 80%, transparent)",
          backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${CC.border}`,
          position: { xs: "sticky", lg: "static" },
          top: { xs: 0, lg: "auto" },
          zIndex: 10,
          gap: 2,
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            minWidth: 0,
          }}
        >
          <Button
            size="small"
            variant="text"
            onClick={() => router.push("/exercises")}
            sx={{
              minWidth: 0,
              p: "6px",
              borderRadius: "var(--cc-radius-pill)",
              color: CC.textSub,
              "&:hover": {
                color: CC.primary,
                backgroundColor: "var(--cc-primary-fixed)",
              },
            }}
          >
            <Icon icon="material-symbols:arrow-back" width={20} />
          </Button>
          <Typography
            sx={{
              fontFamily: "var(--cc-font-headline)",
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: CC.primary,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {exercise.name}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          py: { xs: 2, lg: 1 },
          px: { xs: 1, sm: 1.5 },
          display: "flex",
          flexDirection: { xs: "column", lg: "row" },
          gap: 2,
          alignItems: { xs: "center", lg: "stretch" },
          justifyContent: { xs: "flex-start", lg: "space-evenly" },
          flex: { lg: 1 },
          minHeight: 0,
          overflow: { lg: "hidden" },
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minWidth: 0,
            flex: { lg: "0 1 auto" },
          }}
        >
          <ExerciseBoard />
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            width: "100%",
            minWidth: 0,
            maxWidth: { xs: "min(100%, 820px)", lg: 460, xl: 520 },
            flex: { lg: "0 1 520px" },
            height: { lg: "100%" },
            overflowY: { lg: "auto" },
            pr: { lg: 0.5 },
            "& > *": { flexShrink: 0 },
          }}
        >
          <ExercisePanel
            exercise={exercise}
            onSave={handleSave}
            isSaving={isSaving}
            hasUnsavedChanges={hasUnsavedChanges}
            onRecordAttempt={handleRecordAttempt}
          />

          {mode === "edit" && !hasSolutionMoves && !editingPosition && (
            <Box
              sx={{
                backgroundColor: isDark ? CC.bg2 : CC.lBg1,
                border: `1px solid ${isDark ? CC.border : CC.lBorder}`,
                borderRadius: "8px",
                p: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
              }}
            >
              <Typography sx={{ fontSize: 12, color: CC.textSub }}>
                No reference solution recorded — that&apos;s optional. Play the
                correct move(s) on the board to record one, or change the
                starting position below.
              </Typography>
              <Button size="small" onClick={handleStartEditPosition}>
                Edit position
              </Button>
            </Box>
          )}

          {mode === "edit" && editingPosition && (
            <Box
              sx={{
                backgroundColor: isDark ? CC.bg2 : CC.lBg1,
                border: `1px solid ${isDark ? CC.border : CC.lBorder}`,
                borderRadius: "8px",
                p: 2,
              }}
            >
              <PositionEditor
                initialFen={positionDraftFen}
                onChange={setPositionDraftFen}
                boardSize={280}
              />
              <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setEditingPosition(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleSavePosition}
                  disabled={!isValidFen(positionDraftFen) || isSaving}
                >
                  Save position
                </Button>
              </Box>
            </Box>
          )}

          {(mode === "edit" || solutionRevealed) && (
            <ExerciseMoveTree
              title={mode === "edit" ? "Solution" : "Revealed solution"}
              readOnly={mode === "solve"}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
}
