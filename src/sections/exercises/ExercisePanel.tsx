import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { Icon } from "@iconify/react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { CC } from "@/constants";
import { Exercise } from "@/types/exercises";
import { useCountdown } from "@/hooks/useCountdown";
import {
  exerciseBoardOrientationAtom,
  exerciseDescriptionAtom,
  exerciseModeAtom,
  exerciseNameAtom,
  exerciseTimeLimitSecondsAtom,
  exerciseTreeAtom,
  solutionRevealedAtom,
} from "./states";
import {
  goNextExerciseAction,
  goPrevExerciseAction,
  goStartExerciseAction,
  resetExerciseAttemptAction,
  revealExerciseSolutionAction,
  setExerciseDescriptionAction,
  setExerciseModeAction,
  setExerciseNameAction,
  setExerciseTimeLimitAction,
} from "./actions";
import { Color } from "@/types/enums";

interface Props {
  exercise: Exercise;
  onSave: () => void;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  onRecordAttempt: (
    correct: boolean,
    timeTakenSeconds?: number,
    timedOut?: boolean
  ) => void;
}

export default function ExercisePanel({
  exercise,
  onSave,
  isSaving,
  hasUnsavedChanges,
  onRecordAttempt,
}: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const mode = useAtomValue(exerciseModeAtom);
  const setMode = useSetAtom(setExerciseModeAction);
  const [orientation, setOrientation] = useAtom(exerciseBoardOrientationAtom);

  const name = useAtomValue(exerciseNameAtom);
  const setName = useSetAtom(setExerciseNameAction);
  const description = useAtomValue(exerciseDescriptionAtom);
  const setDescription = useSetAtom(setExerciseDescriptionAction);
  const timeLimitSeconds = useAtomValue(exerciseTimeLimitSecondsAtom);
  const setTimeLimitSeconds = useSetAtom(setExerciseTimeLimitAction);

  const goStart = useSetAtom(goStartExerciseAction);
  const goPrev = useSetAtom(goPrevExerciseAction);
  const goNext = useSetAtom(goNextExerciseAction);

  const solutionRevealed = useAtomValue(solutionRevealedAtom);
  const revealSolution = useSetAtom(revealExerciseSolutionAction);
  const resetAttempt = useSetAtom(resetExerciseAttemptAction);
  const tree = useAtomValue(exerciseTreeAtom);
  const hasSolution = (tree.nodes[tree.rootId]?.children.length ?? 0) > 0;

  const [timerStarted, setTimerStarted] = useState(false);
  const countdown = useCountdown(timeLimitSeconds ?? 0, {
    onExpire: () => revealSolution(),
  });

  useEffect(() => {
    countdown.reset(timeLimitSeconds ?? 0);
    setTimerStarted(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, exercise.id]);

  const attempts = exercise.attempts;
  const accuracy =
    attempts.length > 0
      ? Math.round(
          (attempts.filter((a) => a.correct).length / attempts.length) * 100
        )
      : 0;

  const handleGrade = (correct: boolean) => {
    const timeTakenSeconds =
      timeLimitSeconds !== undefined
        ? timeLimitSeconds - countdown.remaining
        : undefined;
    onRecordAttempt(correct, timeTakenSeconds, countdown.remaining === 0);
  };

  const handleResetAttempt = () => {
    resetAttempt();
    countdown.reset(timeLimitSeconds ?? 0);
    setTimerStarted(false);
  };

  const minutes = Math.floor(countdown.remaining / 60);
  const seconds = countdown.remaining % 60;

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}
    >
      <Box
        sx={{
          backgroundColor: isDark ? CC.bg2 : CC.lBg1,
          border: `1px solid ${isDark ? CC.border : CC.lBorder}`,
          borderRadius: "8px",
          p: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <Icon icon="mdi:target" width={16} color={CC.primary} />
          <Typography sx={{ fontSize: 14, fontWeight: 700, flex: 1 }}>
            {exercise.name}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <Tooltip title="Start">
            <IconButton size="small" onClick={() => goStart()}>
              <Icon icon="material-symbols:first-page" width={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Previous">
            <IconButton size="small" onClick={() => goPrev()}>
              <Icon icon="material-symbols:chevron-left" width={20} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Next">
            <IconButton size="small" onClick={() => goNext()}>
              <Icon icon="material-symbols:chevron-right" width={20} />
            </IconButton>
          </Tooltip>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Flip board">
            <IconButton
              size="small"
              onClick={() =>
                setOrientation(
                  orientation === Color.White ? Color.Black : Color.White
                )
              }
            >
              <Icon icon="material-symbols:swap-vert" width={18} />
            </IconButton>
          </Tooltip>
          {mode === "edit" && (
            <Tooltip
              title={
                hasUnsavedChanges ? "Unsaved changes" : "All changes saved"
              }
            >
              <Box>
                <Button
                  size="small"
                  variant="contained"
                  onClick={onSave}
                  disabled={!hasUnsavedChanges || isSaving}
                  startIcon={
                    <Icon
                      icon={
                        isSaving
                          ? "eos-icons:loading"
                          : "material-symbols:save-outline"
                      }
                      width={14}
                    />
                  }
                >
                  {isSaving ? "Saving" : "Save"}
                </Button>
              </Box>
            </Tooltip>
          )}
        </Box>

        <ToggleButtonGroup
          fullWidth
          size="small"
          exclusive
          value={mode}
          onChange={(_, v) => v && setMode(v)}
          sx={{
            mb: mode === "edit" ? 2 : 1,
            "& .MuiToggleButton-root": {
              fontSize: 12,
              fontWeight: 600,
              border: `1px solid ${isDark ? CC.border : CC.lBorder}`,
            },
          }}
        >
          <ToggleButton value="edit">
            <Icon
              icon="material-symbols:edit-outline"
              width={14}
              style={{ marginRight: 4 }}
            />
            Edit
          </ToggleButton>
          <ToggleButton value="solve">
            <Icon
              icon="streamline:graduation-cap"
              width={14}
              style={{ marginRight: 4 }}
            />
            Solve
          </ToggleButton>
        </ToggleButtonGroup>

        {mode === "edit" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <TextField
              size="small"
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
            />
            <TextField
              size="small"
              label="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              minRows={2}
              maxRows={4}
              fullWidth
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={timeLimitSeconds === undefined}
                  onChange={(e) =>
                    setTimeLimitSeconds(e.target.checked ? undefined : 300)
                  }
                />
              }
              label="No time limit"
            />
            {timeLimitSeconds !== undefined && (
              <TextField
                size="small"
                type="number"
                label="Time limit (minutes)"
                value={Math.round(timeLimitSeconds / 60)}
                onChange={(e) => {
                  const mins = Math.max(1, parseInt(e.target.value) || 1);
                  setTimeLimitSeconds(mins * 60);
                }}
                sx={{ maxWidth: 200 }}
              />
            )}
          </Box>
        )}

        {mode === "solve" && (
          <Box
            sx={{
              backgroundColor: isDark ? CC.bg3 : CC.lBg3,
              borderRadius: "6px",
              p: 1.5,
            }}
          >
            {exercise.description && (
              <Typography sx={{ fontSize: 12, color: CC.textSub, mb: 1 }}>
                {exercise.description}
              </Typography>
            )}

            {timeLimitSeconds !== undefined && (
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
              >
                <Icon icon="material-symbols:timer-outline" width={16} />
                <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
                  {minutes}:{seconds.toString().padStart(2, "0")}
                </Typography>
                {!timerStarted ? (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      setTimerStarted(true);
                      countdown.start();
                    }}
                    disabled={solutionRevealed}
                  >
                    Start
                  </Button>
                ) : (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => countdown.pause()}
                    disabled={!countdown.isRunning}
                  >
                    Pause
                  </Button>
                )}
              </Box>
            )}

            {!hasSolution && (
              <Typography sx={{ fontSize: 12, color: CC.textSub, mb: 1 }}>
                No reference solution recorded for this exercise — play what you
                think is right, then grade yourself.
              </Typography>
            )}

            {hasSolution && !solutionRevealed ? (
              <Button
                size="small"
                variant="contained"
                onClick={() => {
                  countdown.pause();
                  revealSolution();
                }}
              >
                Show solution
              </Button>
            ) : (
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 1 }}>
                  How did you do?
                </Typography>
                <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    onClick={() => handleGrade(true)}
                  >
                    Got it right
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    onClick={() => handleGrade(false)}
                  >
                    Got it wrong
                  </Button>
                </Box>
              </Box>
            )}

            <Button
              size="small"
              variant="text"
              onClick={handleResetAttempt}
              sx={{ mt: 1 }}
            >
              Reset attempt
            </Button>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mt: 1.5,
                pt: 1.5,
                borderTop: `1px solid ${isDark ? CC.border : CC.lBorder}`,
              }}
            >
              <Typography sx={{ fontSize: 12, color: CC.textSub }}>
                {attempts.length} attempt{attempts.length !== 1 && "s"}
              </Typography>
              {attempts.length > 0 && (
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 700,
                    color:
                      accuracy >= 80
                        ? CC.green
                        : accuracy >= 50
                          ? CC.gold
                          : "#c45c5c",
                  }}
                >
                  {accuracy}% correct
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
