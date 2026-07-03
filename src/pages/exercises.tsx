import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { Icon } from "@iconify/react";
import { useMemo, useState } from "react";
import { DEFAULT_POSITION } from "chess.js";
import { CC } from "@/constants";
import { PageTitle } from "@/components/pageTitle";
import { useExerciseDatabase } from "@/hooks/useExerciseDatabase";
import { useRouter } from "next/router";
import { createEmptyExerciseTree } from "@/lib/exerciseTree";
import PositionEditor from "@/sections/exercises/PositionEditor";
import MiniBoardPreview from "@/sections/exercises/MiniBoardPreview";
import { isValidFen } from "@/lib/fen";

export default function ExercisesListPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const router = useRouter();
  const { exercises, addExercise, deleteExercise } = useExerciseDatabase(true);

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fen, setFen] = useState(DEFAULT_POSITION);
  const [isSaving, setIsSaving] = useState(false);

  const sorted = useMemo(
    () =>
      [...exercises].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [exercises]
  );

  const handleCreate = async () => {
    if (!name.trim() || !isValidFen(fen)) return;
    setIsSaving(true);
    try {
      const created = await addExercise({
        name: name.trim(),
        description: description.trim() || undefined,
        startingFen: fen,
        tree: createEmptyExerciseTree(fen),
      });
      setCreating(false);
      setName("");
      setDescription("");
      setFen(DEFAULT_POSITION);
      router.push(`/exercises/${created.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box>
      <PageTitle title="Exercises" />

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
          Exercises
        </Typography>
        <Button
          variant="contained"
          startIcon={<Icon icon="material-symbols:add" width={16} />}
          onClick={() => setCreating(true)}
        >
          New exercise
        </Button>
      </Box>

      <Box sx={{ px: { xs: 1, sm: 2, md: 3 }, pt: 3, pb: 4 }}>
        <Typography
          sx={{
            fontFamily: "var(--cc-font-body)",
            color: CC.textSub,
            fontSize: 14,
            mb: 3,
          }}
        >
          {exercises.length} exercise{exercises.length !== 1 && "s"} — set up a
          position, record the solution, and test yourself
        </Typography>

        {sorted.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: 8,
              backgroundColor: "var(--cc-surface-container-lowest)",
              borderRadius: "var(--cc-radius-xl)",
              boxShadow: "var(--cc-shadow-ambient)",
            }}
          >
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                backgroundColor: "var(--cc-primary-fixed)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 2,
              }}
            >
              <Icon icon="mdi:target" width={36} color={CC.primary} />
            </Box>
            <Typography
              sx={{
                fontFamily: "var(--cc-font-headline)",
                fontSize: 22,
                fontWeight: 700,
                color: CC.text,
              }}
            >
              No exercises yet
            </Typography>
            <Typography
              sx={{
                mt: 0.5,
                fontSize: 14,
                color: CC.textSub,
                maxWidth: 360,
                textAlign: "center",
              }}
            >
              Set up a position and record the correct move(s) to create your
              first exercise.
            </Typography>
            <Button
              sx={{ mt: 3 }}
              variant="contained"
              startIcon={<Icon icon="material-symbols:add" width={16} />}
              onClick={() => setCreating(true)}
            >
              Create exercise
            </Button>
          </Box>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "1fr 1fr",
                md: "1fr 1fr 1fr",
              },
              gap: 1.5,
            }}
          >
            {sorted.map((ex) => {
              const variations = Object.values(ex.tree.nodes).filter(
                (n) => !n.isMainline && n.id !== ex.tree.rootId
              ).length;
              const accuracy =
                ex.attempts.length > 0
                  ? Math.round(
                      (ex.attempts.filter((a) => a.correct).length /
                        ex.attempts.length) *
                        100
                    )
                  : null;

              return (
                <Box
                  key={ex.id}
                  sx={{
                    backgroundColor: "var(--cc-surface-container-lowest)",
                    borderRadius: "var(--cc-radius-xl)",
                    boxShadow: "var(--cc-shadow-soft)",
                    p: 2.5,
                    cursor: "pointer",
                    transition: "all 200ms ease",
                    "&:hover": {
                      boxShadow: "var(--cc-shadow-ambient)",
                      transform: "translateY(-2px)",
                    },
                  }}
                  onClick={() => router.push(`/exercises/${ex.id}`)}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 1.5,
                      mb: 1.5,
                    }}
                  >
                    <MiniBoardPreview fen={ex.startingFen} size={44} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontSize: 15,
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {ex.name}
                      </Typography>
                      {ex.timeLimitSeconds !== undefined && (
                        <Typography
                          sx={{
                            fontSize: 12,
                            color: isDark ? CC.textMuted : "#8a8480",
                          }}
                        >
                          {Math.round(ex.timeLimitSeconds / 60)} min limit
                        </Typography>
                      )}
                    </Box>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm(`Delete "${ex.name}"?`))
                            await deleteExercise(ex.id);
                        }}
                        sx={{ color: "#c45c5c" }}
                      >
                        <Icon icon="mdi:delete-outline" width={15} />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {ex.description && (
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: isDark ? CC.textSub : CC.lTextSub,
                        mb: 1.5,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {ex.description}
                    </Typography>
                  )}

                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Chip
                      size="small"
                      label={`${Object.keys(ex.tree.nodes).length - 1} moves`}
                      sx={{
                        backgroundColor: CC.primaryMuted,
                        color: CC.primary,
                        fontWeight: 600,
                      }}
                    />
                    {variations > 0 && (
                      <Chip
                        size="small"
                        label={`${variations} variation${variations !== 1 ? "s" : ""}`}
                        sx={{ fontWeight: 600 }}
                      />
                    )}
                    <Chip
                      size="small"
                      label={
                        ex.attempts.length === 0
                          ? "Not attempted"
                          : `${accuracy}% (${ex.attempts.length})`
                      }
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>New exercise</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Name"
            placeholder="e.g. Mate in 2 — Rook sacrifice"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            minRows={2}
            maxRows={4}
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            sx={{ mb: 2 }}
          />
          <PositionEditor initialFen={fen} onChange={setFen} boardSize={280} />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button variant="text" onClick={() => setCreating(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!name.trim() || !isValidFen(fen) || isSaving}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
