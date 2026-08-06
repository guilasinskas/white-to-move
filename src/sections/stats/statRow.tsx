import { ReactNode } from "react";
import { Box, Typography, Tooltip } from "@mui/material";
import { Icon } from "@iconify/react";
import { ConfidenceInterval } from "@/lib/stats/confidenceInterval";
import { QualityStats } from "@/lib/playerReport/aggregate";
import { ReportColor } from "@/types/playerReport";
import { CC } from "@/constants";
import {
  formatCIMain,
  formatCISub,
  formatQualityMain,
  formatQualitySub,
  formatVsExpectedMain,
  formatVsExpectedSub,
} from "./formatters";
import {
  DivergingBar,
  ProportionBar,
  SplitBar,
  toneBackground,
  toneColor,
  toneFromValue,
} from "./heatmap";

export interface StatRowData {
  key: string;
  label: string;
  colors?: ReportColor[];
  descriptor?: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  scorePct: number;
  vsExpectedPoints?: number;
  vsExpectedMarginPoints?: number;
  quality?: QualityStats;
  fromBetter?: ConfidenceInterval;
  fromEqual?: ConfidenceInterval;
  fromWorse?: ConfidenceInterval;
}

const COL_LABELS = {
  better: "W from better",
  equal: "W/D from equal",
  worse: "W/D from worse",
};

// Baseline/spread pairs for the performance heatmap — the color reflects how
// far a value sits from what's "expected" for that column, not a flat >50%
// rule. E.g. converting a better position should happen often (high
// baseline), while saving anything at all from a worse position is already a
// good outcome (low baseline). These are this app's own defensible
// approximation, not Plyscope's undisclosed thresholds.
const SCORE_BASELINE = 50;
const SCORE_SPREAD = 30;
const VS_EXPECTED_SPREAD = 100;
const QUALITY_SPREAD = 1.0;
const BETTER_BASELINE = 65;
const BETTER_SPREAD = 35;
const EQUAL_BASELINE = 50;
const EQUAL_SPREAD = 30;
const WORSE_BASELINE = 25;
const WORSE_SPREAD = 35;

export function StatRow({
  data,
  depth,
  index,
  maxGames,
  totalGames,
  expandable,
  expanded,
  onToggle,
  columnLabels = COL_LABELS,
  showRecordColumns = true,
}: {
  data: StatRowData;
  depth: number;
  index?: number;
  maxGames: number;
  totalGames: number;
  expandable: boolean;
  expanded: boolean;
  onToggle?: () => void;
  columnLabels?: { better: string; equal: string; worse: string };
  showRecordColumns?: boolean;
}) {
  const winPct = data.games > 0 ? (data.wins / data.games) * 100 : 0;
  const lossPct = data.games > 0 ? (data.losses / data.games) * 100 : 0;
  const gamesPct =
    totalGames > 0 ? Math.round((data.games / totalGames) * 100) : 0;

  const scoreTone = toneFromValue(
    data.games ? data.scorePct : undefined,
    SCORE_BASELINE,
    SCORE_SPREAD
  );
  const vsExpectedTone = toneFromValue(
    data.vsExpectedPoints,
    0,
    VS_EXPECTED_SPREAD
  );
  const qualityTone = toneFromValue(data.quality?.avgCp, 0, QUALITY_SPREAD);
  const betterTone = toneFromValue(
    data.fromBetter?.rate,
    BETTER_BASELINE,
    BETTER_SPREAD
  );
  const equalTone = toneFromValue(
    data.fromEqual?.rate,
    EQUAL_BASELINE,
    EQUAL_SPREAD
  );
  const worseTone = toneFromValue(
    data.fromWorse?.rate,
    WORSE_BASELINE,
    WORSE_SPREAD
  );

  return (
    <Box
      onClick={expandable ? onToggle : undefined}
      sx={{
        display: "flex",
        alignItems: "stretch",
        gap: 1.5,
        pl: 2 + depth * 2.5,
        pr: 2,
        py: 1.5,
        borderBottom: `1px solid ${CC.border}`,
        cursor: expandable ? "pointer" : "default",
        "&:hover": expandable
          ? { backgroundColor: "var(--cc-surface-container-low)" }
          : undefined,
        flexWrap: "wrap",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", pt: 0.25 }}>
        {expandable ? (
          <Icon
            icon={expanded ? "mdi:chevron-down" : "mdi:chevron-right"}
            width={16}
            color={CC.textMuted}
          />
        ) : (
          <Box sx={{ width: 16 }} />
        )}
      </Box>

      <Box sx={{ flex: 1, minWidth: 160 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: CC.text }}>
          {index !== undefined ? `${index}. ` : ""}
          {data.label}
        </Typography>
        {(data.colors?.length || data.descriptor) && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              mt: 0.5,
              flexWrap: "wrap",
            }}
          >
            {data.colors?.map((color) => (
              <ColorPill key={color} color={color} />
            ))}
            {data.descriptor && (
              <Typography sx={{ fontSize: 11, color: CC.textSub }}>
                {data.descriptor}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      <Cell width={90} tint={undefined}>
        <Typography
          sx={{
            fontSize: 14,
            fontWeight: 700,
            color: CC.text,
            textAlign: "right",
          }}
        >
          {data.games}
        </Typography>
        <Typography
          sx={{ fontSize: 11, color: CC.textSub, textAlign: "right" }}
        >
          {gamesPct}% of games
        </Typography>
        <ProportionBar
          pct={maxGames > 0 ? (data.games / maxGames) * 100 : 0}
          color={CC.primary}
        />
      </Cell>

      {showRecordColumns && (
        <Cell
          width={130}
          tint={toneBackground(scoreTone.tone, scoreTone.intensity)}
        >
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 700,
              color: toneColor(scoreTone.tone),
              textAlign: "right",
            }}
          >
            {data.wins} / {data.losses} / {data.draws}
          </Typography>
          <Typography
            sx={{ fontSize: 11, color: CC.textSub, textAlign: "right" }}
          >
            {data.games > 0 ? `${data.scorePct}% score` : "—"}
          </Typography>
          <SplitBar winPct={winPct} lossPct={lossPct} />
        </Cell>
      )}

      {showRecordColumns && (
        <Cell
          width={100}
          tint={toneBackground(vsExpectedTone.tone, vsExpectedTone.intensity)}
        >
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 700,
              color: toneColor(vsExpectedTone.tone),
              textAlign: "right",
            }}
          >
            {formatVsExpectedMain(data.vsExpectedPoints)}
          </Typography>
          <Typography
            sx={{ fontSize: 11, color: CC.textSub, textAlign: "right" }}
          >
            {formatVsExpectedSub(data.vsExpectedMarginPoints) ?? " "}
          </Typography>
          {data.vsExpectedPoints !== undefined && (
            <DivergingBar
              value={data.vsExpectedPoints}
              spread={VS_EXPECTED_SPREAD}
              color={toneColor(vsExpectedTone.tone)}
            />
          )}
        </Cell>
      )}

      {showRecordColumns && (
        <Tooltip title="Engine verdict at the point the game left known theory">
          <Box sx={{ display: "contents" }}>
            <Cell
              width={150}
              tint={toneBackground(qualityTone.tone, qualityTone.intensity)}
            >
              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: toneColor(qualityTone.tone),
                  textAlign: "right",
                }}
              >
                {formatQualityMain(data.quality)}
              </Typography>
              <Typography
                sx={{ fontSize: 11, color: CC.textSub, textAlign: "right" }}
              >
                {formatQualitySub(data.quality) ?? " "}
              </Typography>
              {data.quality?.avgCp !== undefined && (
                <DivergingBar
                  value={data.quality.avgCp}
                  spread={QUALITY_SPREAD}
                  color={toneColor(qualityTone.tone)}
                />
              )}
            </Cell>
          </Box>
        </Tooltip>
      )}

      <RateCell
        title={columnLabels.better}
        width={130}
        ci={data.fromBetter}
        tone={betterTone}
      />
      <RateCell
        title={columnLabels.equal}
        width={130}
        ci={data.fromEqual}
        tone={equalTone}
      />
      <RateCell
        title={columnLabels.worse}
        width={130}
        ci={data.fromWorse}
        tone={worseTone}
      />
    </Box>
  );
}

function ColorPill({ color }: { color: ReportColor }) {
  const isWhite = color === "white";
  return (
    <Box
      sx={{
        px: 1,
        py: 0.25,
        borderRadius: "4px",
        backgroundColor: isWhite ? "#e8eaf4" : "#2a2a2a",
        border: isWhite ? "1px solid #aaa" : "1px solid #555",
      }}
    >
      <Typography
        sx={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.05em",
          color: isWhite ? "#333" : "#eee",
        }}
      >
        {isWhite ? "WHITE" : "BLACK"}
      </Typography>
    </Box>
  );
}

function RateCell({
  title,
  width,
  ci,
  tone,
}: {
  title: string;
  width: number;
  ci?: ConfidenceInterval;
  tone: { tone: "green" | "red" | "neutral"; intensity: number };
}) {
  return (
    <Tooltip title={title}>
      <Box sx={{ display: "contents" }}>
        <Cell width={width} tint={toneBackground(tone.tone, tone.intensity)}>
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 700,
              color: toneColor(tone.tone),
              textAlign: "right",
            }}
          >
            {formatCIMain(ci)}
          </Typography>
          <Typography
            sx={{ fontSize: 11, color: CC.textSub, textAlign: "right" }}
          >
            {formatCISub(ci) ?? " "}
          </Typography>
          {ci && ci.total > 0 && (
            <ProportionBar pct={ci.rate} color={toneColor(tone.tone)} />
          )}
        </Cell>
      </Box>
    </Tooltip>
  );
}

function Cell({
  children,
  width,
  tint,
}: {
  width: number;
  tint?: string;
  children: ReactNode;
}) {
  return (
    <Box
      sx={{
        width,
        flexShrink: 0,
        px: 1,
        py: 0.5,
        borderRadius: "6px",
        backgroundColor: tint,
      }}
    >
      {children}
    </Box>
  );
}
