import { Box } from "@mui/material";
import { CC } from "@/constants";

export type Tone = "green" | "red" | "neutral";

// Every cell's background/bar color reflects how far its value sits from a
// column-specific baseline (e.g. 50% for a coin-flip position, 0 for a
// rating-point delta) — not a fixed "green above X%" rule. `spread` is the
// distance from baseline that reaches full color intensity.
export function toneFromValue(
  value: number | undefined,
  baseline: number,
  spread: number
): { tone: Tone; intensity: number } {
  if (value === undefined) return { tone: "neutral", intensity: 0 };
  const diff = value - baseline;
  if (Math.abs(diff) < 1e-6) return { tone: "neutral", intensity: 0 };
  return {
    tone: diff > 0 ? "green" : "red",
    intensity: Math.min(1, Math.abs(diff) / spread),
  };
}

export function toneBackground(
  tone: Tone,
  intensity: number
): string | undefined {
  if (tone === "neutral" || intensity === 0) return undefined;
  const color = tone === "green" ? "var(--cc-green)" : "var(--cc-error)";
  const pct = Math.round(8 + intensity * 27);
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

export function toneColor(tone: Tone): string {
  if (tone === "green") return CC.green;
  if (tone === "red") return CC.error;
  return CC.text;
}

const trackSx = {
  height: 4,
  borderRadius: "var(--cc-radius-pill)",
  overflow: "hidden",
  mt: 0.75,
  backgroundColor: "color-mix(in srgb, currentColor 12%, transparent)",
};

export function ProportionBar({ pct, color }: { pct: number; color: string }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <Box sx={trackSx}>
      <Box
        sx={{
          width: `${clamped}%`,
          height: "100%",
          backgroundColor: color,
          borderRadius: "var(--cc-radius-pill)",
        }}
      />
    </Box>
  );
}

export function SplitBar({
  winPct,
  lossPct,
}: {
  winPct: number;
  lossPct: number;
}) {
  return (
    <Box sx={{ ...trackSx, display: "flex" }}>
      {winPct > 0 && (
        <Box sx={{ width: `${winPct}%`, backgroundColor: CC.green }} />
      )}
      {lossPct > 0 && (
        <Box sx={{ width: `${lossPct}%`, backgroundColor: CC.error }} />
      )}
    </Box>
  );
}

// A centered track for values that swing around zero (rating-point deltas,
// average eval in pawns) — fill grows from the middle towards the value's
// side, clamped at `spread` for full width.
export function DivergingBar({
  value,
  spread,
  color,
}: {
  value: number;
  spread: number;
  color: string;
}) {
  const clamped = Math.max(-spread, Math.min(spread, value));
  const pct = (Math.abs(clamped) / spread) * 50;
  const isPositive = clamped >= 0;

  return (
    <Box sx={{ ...trackSx, position: "relative" }}>
      <Box
        sx={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: isPositive ? "50%" : `${50 - pct}%`,
          width: `${pct}%`,
          backgroundColor: color,
        }}
      />
      <Box
        sx={{
          position: "absolute",
          left: "50%",
          top: 0,
          bottom: 0,
          width: "1px",
          backgroundColor: CC.textMuted,
        }}
      />
    </Box>
  );
}
