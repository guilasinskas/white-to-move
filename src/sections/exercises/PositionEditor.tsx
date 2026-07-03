import {
  Box,
  Button,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from "@mui/material";
import { Icon } from "@iconify/react";
import { Chessboard } from "react-chessboard";
import { CustomPieces, Square } from "react-chessboard/dist/chessboard/types";
import { useAtomValue } from "jotai";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_POSITION } from "chess.js";
import { CC } from "@/constants";
import { PIECE_CODES } from "@/components/board";
import { pieceSetAtom } from "@/components/board/states";
import { fenFromSquareMap, isValidFen, squareMapFromFen } from "@/lib/fen";

interface Props {
  initialFen?: string;
  onChange: (fen: string) => void;
  boardSize?: number;
}

export default function PositionEditor({
  initialFen = DEFAULT_POSITION,
  onChange,
  boardSize = 320,
}: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const pieceSet = useAtomValue(pieceSetAtom);

  const [position, setPosition] = useState<Record<string, string>>(() =>
    squareMapFromFen(initialFen)
  );
  const [turn, setTurn] = useState<"w" | "b">(
    () => (initialFen.split(" ")[1] as "w" | "b") || "w"
  );
  const [armedPiece, setArmedPiece] = useState<string | null>(null);
  const [showFenInput, setShowFenInput] = useState(false);
  const [fenDraft, setFenDraft] = useState("");

  const fen = useMemo(() => fenFromSquareMap(position, turn), [position, turn]);
  const valid = useMemo(() => isValidFen(fen), [fen]);

  useEffect(() => {
    onChange(fen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen]);

  const onSquareClick = (square: Square) => {
    setPosition((prev) => {
      const next = { ...prev };
      if (armedPiece) {
        next[square] = armedPiece;
      } else if (next[square]) {
        delete next[square];
      }
      return next;
    });
  };

  const onPieceDrop = (source: Square, target: Square): boolean => {
    if (source === target) return false;
    setPosition((prev) => {
      const next = { ...prev };
      const piece = next[source];
      if (!piece) return prev;
      delete next[source];
      next[target] = piece;
      return next;
    });
    return true;
  };

  const customPieces = useMemo(
    () =>
      PIECE_CODES.reduce<CustomPieces>((acc, piece) => {
        acc[piece] = ({ squareWidth }) => (
          <Box
            width={squareWidth}
            height={squareWidth}
            sx={{
              backgroundImage: `url(/piece/${pieceSet}/${piece}.svg)`,
              backgroundSize: "contain",
            }}
          />
        );
        return acc;
      }, {}),
    [pieceSet]
  );

  const handleFenSubmit = () => {
    if (!isValidFen(fenDraft)) return;
    setPosition(squareMapFromFen(fenDraft));
    setTurn((fenDraft.split(" ")[1] as "w" | "b") || "w");
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
        {PIECE_CODES.map((piece) => (
          <Box
            key={piece}
            onClick={() =>
              setArmedPiece((prev) => (prev === piece ? null : piece))
            }
            sx={{
              width: 34,
              height: 34,
              cursor: "pointer",
              borderRadius: "6px",
              border: `2px solid ${
                armedPiece === piece ? CC.primary : "transparent"
              }`,
              backgroundColor: isDark ? CC.bg2 : CC.lBg1,
              backgroundImage: `url(/piece/${pieceSet}/${piece}.svg)`,
              backgroundSize: "70%",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
            }}
          />
        ))}
        <Box
          onClick={() => setArmedPiece(null)}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 34,
            height: 34,
            cursor: "pointer",
            borderRadius: "6px",
            border: `2px solid ${
              armedPiece === null ? CC.primary : "transparent"
            }`,
            backgroundColor: isDark ? CC.bg2 : CC.lBg1,
            color: CC.textSub,
          }}
        >
          <Icon icon="material-symbols:ink-eraser-outline" width={18} />
        </Box>
      </Box>
      <Typography sx={{ fontSize: 11, color: CC.textSub }}>
        Click a piece then click a square to place it. Click an empty selection
        then a square to erase it. Drag pieces already on the board to
        reposition them.
      </Typography>

      <Box sx={{ width: boardSize }}>
        <Chessboard
          id="PositionEditor"
          position={position}
          onPieceDrop={onPieceDrop}
          onSquareClick={onSquareClick}
          isDraggablePiece={() => true}
          customPieces={customPieces}
          customBoardStyle={{ borderRadius: "12px", boxShadow: "none" }}
          customLightSquareStyle={{ backgroundColor: "#e8e4d7" }}
          customDarkSquareStyle={{ backgroundColor: "#55624d" }}
          animationDuration={0}
        />
      </Box>

      <ToggleButtonGroup
        fullWidth
        size="small"
        exclusive
        value={turn}
        onChange={(_, v) => v && setTurn(v)}
      >
        <ToggleButton value="w">White to move</ToggleButton>
        <ToggleButton value="b">Black to move</ToggleButton>
      </ToggleButtonGroup>

      <Box sx={{ display: "flex", gap: 1 }}>
        <Button
          size="small"
          variant="outlined"
          onClick={() => {
            setPosition(squareMapFromFen(DEFAULT_POSITION));
            setTurn("w");
          }}
        >
          Starting position
        </Button>
        <Button size="small" variant="outlined" onClick={() => setPosition({})}>
          Clear board
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          size="small"
          variant="text"
          onClick={() => {
            setShowFenInput((v) => !v);
            setFenDraft(fen);
          }}
        >
          {showFenInput ? "Hide FEN" : "Paste FEN"}
        </Button>
      </Box>

      {showFenInput && (
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            value={fenDraft}
            onChange={(e) => setFenDraft(e.target.value)}
            placeholder="Paste a FEN string"
          />
          <Button
            size="small"
            variant="contained"
            onClick={handleFenSubmit}
            disabled={!isValidFen(fenDraft)}
          >
            Apply
          </Button>
        </Box>
      )}

      {!valid && (
        <Typography sx={{ fontSize: 12, color: "#c45c5c" }}>
          This position is not a legal chess position yet (check that each side
          has exactly one king).
        </Typography>
      )}
    </Box>
  );
}
