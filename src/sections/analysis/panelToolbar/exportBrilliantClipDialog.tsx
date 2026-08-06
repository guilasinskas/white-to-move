import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useAtomValue } from "jotai";
import { analysisTreeAtom, boardOrientationAtom, gameAtom, gameEvalAtom } from "../states";
import { pieceSetAtom } from "@/components/board/states";
import { usePlayersData } from "@/hooks/usePlayersData";
import {
  ClipFormat,
  generateClip,
  isVideoRecordingSupported,
} from "@/lib/brilliantClip/generateClip";

interface Props {
  open: boolean;
  onClose: () => void;
  brilliantMovesCount: number;
}

type Status = "idle" | "working" | "done" | "error";

export default function ExportBrilliantClipDialog({
  open,
  onClose,
  brilliantMovesCount,
}: Props) {
  const tree = useAtomValue(analysisTreeAtom);
  const gameEval = useAtomValue(gameEvalAtom);
  const pieceSet = useAtomValue(pieceSetAtom);
  const boardOrientation = useAtomValue(boardOrientationAtom);
  const { white, black } = usePlayersData(gameAtom);

  const [format, setFormat] = useState<ClipFormat>("gif");
  const [status, setStatus] = useState<Status>("idle");
  const [phase, setPhase] = useState<"rendering" | "encoding">("rendering");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>();

  const videoSupported = isVideoRecordingSupported();

  const handleFormatChange = (
    _: React.MouseEvent<HTMLElement>,
    value: ClipFormat | null
  ) => {
    if (value) setFormat(value);
  };

  const handleGenerate = async () => {
    setStatus("working");
    setErrorMessage(undefined);
    setProgress(0);
    setPhase("rendering");

    try {
      const result = await generateClip({
        tree,
        positions: gameEval?.positions,
        pieceSet,
        orientation: boardOrientation ? "white" : "black",
        format,
        onProgress: (currentPhase, value) => {
          setPhase(currentPhase);
          setProgress(value);
        },
      });

      const filename = `${white.name}-vs-${black.name}.${result.extension}`
        .replace(/\s+/g, "_")
        .replace(/[^\w.-]/g, "");

      const url = URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);

      setStatus("done");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong"
      );
      setStatus("error");
    }
  };

  const handleClose = () => {
    if (status === "working") return;
    onClose();
    setStatus("idle");
    setProgress(0);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle variant="h5" sx={{ paddingBottom: 1 }}>
        Export game
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Exports the full game as a clean clip of just the board — no eval
          bar, no move list. Regular moves play fast;{" "}
          {brilliantMovesCount > 0
            ? `the ${brilliantMovesCount} brilliant move${
                brilliantMovesCount > 1 ? "s" : ""
              } slow down and get the brilliant badge`
            : "brilliant moves (none in this game) would slow down and get the brilliant badge"}
          , just like chess.com.
        </Typography>

        <ToggleButtonGroup
          value={format}
          exclusive
          onChange={handleFormatChange}
          disabled={status === "working"}
          fullWidth
          sx={{ mb: 2 }}
        >
          <ToggleButton value="gif">GIF</ToggleButton>
          <ToggleButton value="video" disabled={!videoSupported}>
            {videoSupported ? "Video" : "Video (unsupported)"}
          </ToggleButton>
        </ToggleButtonGroup>

        {status === "working" && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {phase === "rendering" ? "Rendering moves…" : "Encoding…"}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.round(progress * 100)}
            />
          </Box>
        )}

        {status === "done" && (
          <Alert severity="success">
            Downloaded — check your downloads folder.
          </Alert>
        )}

        {status === "error" && errorMessage && (
          <Alert severity="error">{errorMessage}</Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ m: 1 }}>
        <Button onClick={handleClose} disabled={status === "working"}>
          Close
        </Button>
        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={status === "working"}
        >
          Generate
        </Button>
      </DialogActions>
    </Dialog>
  );
}
