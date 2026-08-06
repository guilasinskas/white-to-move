import { Box, Typography } from "@mui/material";
import { Icon } from "@iconify/react";
import { ReportGame } from "@/types/playerReport";
import { CC } from "@/constants";

export function GameRow({
  game,
  username,
  onClick,
}: {
  game: ReportGame;
  username: string;
  onClick: () => void;
}) {
  const isWhite =
    game.white.name.toLowerCase() === username.trim().toLowerCase();
  const opponent = isWhite ? game.black : game.white;

  const result =
    game.result === "1/2-1/2"
      ? "draw"
      : (game.result === "1-0") === isWhite
        ? "win"
        : "loss";

  const resultColor =
    result === "win" ? CC.primary : result === "loss" ? CC.error : CC.textMuted;

  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1.5,
        py: 0.75,
        borderRadius: "4px",
        cursor: "pointer",
        "&:hover": { backgroundColor: "var(--cc-surface-container-low)" },
      }}
    >
      <Icon icon="mdi:chess-pawn" width={14} color={resultColor} />
      <Typography
        sx={{ fontSize: 13, fontWeight: 700, color: resultColor, width: 40 }}
      >
        {result === "win" ? "Win" : result === "loss" ? "Loss" : "Draw"}
      </Typography>
      <Typography sx={{ fontSize: 13, color: CC.text, flex: 1 }}>
        vs {opponent.name}
        {opponent.rating ? ` (${opponent.rating})` : ""}
      </Typography>
      <Typography sx={{ fontSize: 12, color: CC.textMuted }}>
        {new Date(game.dateMs).toLocaleDateString()}
      </Typography>
    </Box>
  );
}
