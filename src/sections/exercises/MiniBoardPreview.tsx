import { Box } from "@mui/material";
import { useAtomValue } from "jotai";
import { useMemo } from "react";
import { pieceSetAtom } from "@/components/board/states";
import { squareMapFromFen } from "@/lib/fen";

interface Props {
  fen: string;
  size?: number;
}

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

export default function MiniBoardPreview({ fen, size = 72 }: Props) {
  const pieceSet = useAtomValue(pieceSetAtom);
  const position = useMemo(() => squareMapFromFen(fen), [fen]);

  return (
    <Box
      sx={{
        width: size,
        height: size,
        display: "grid",
        gridTemplateColumns: "repeat(8, 1fr)",
        gridTemplateRows: "repeat(8, 1fr)",
        borderRadius: "6px",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {Array.from({ length: 8 }, (_, rankIdx) => 8 - rankIdx).map((rank) =>
        FILES.map((file, fileIdx) => {
          const square = `${file}${rank}`;
          const piece = position[square];
          const isDark = (fileIdx + rank) % 2 === 0;
          return (
            <Box
              key={square}
              sx={{
                backgroundColor: isDark ? "#55624d" : "#e8e4d7",
                backgroundImage: piece
                  ? `url(/piece/${pieceSet}/${piece}.svg)`
                  : undefined,
                backgroundSize: "80%",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
              }}
            />
          );
        })
      )}
    </Box>
  );
}
