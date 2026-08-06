import { useState } from "react";
import { Box, Collapse, Typography } from "@mui/material";
import { Icon } from "@iconify/react";
import { CC } from "@/constants";

const GLOSSARY: [string, string][] = [
  ["Games", "How many games landed in this row, and their share of the total."],
  [
    "W/L/D",
    "Wins/losses/draws and the resulting score, win-green vs loss-red.",
  ],
  [
    "Vs expected",
    "Score compared to what your and your opponents' ratings predicted, in rating points.",
  ],
  ["Quality", "Engine verdict at the point the game left known theory."],
  [
    "W from better",
    "How often a position you left better/winning turned into a win.",
  ],
  ["W/D from equal", "How often a position you left level was at least held."],
  [
    "W/D from worse",
    "How often a position you left worse/losing was still saved.",
  ],
];

export function TableColumnHeader({
  firstLabel,
  betterLabel,
  equalLabel,
  worseLabel,
  showRecordColumns = true,
}: {
  firstLabel: string;
  betterLabel: string;
  equalLabel: string;
  worseLabel: string;
  showRecordColumns?: boolean;
}) {
  const [showGlossary, setShowGlossary] = useState(false);

  return (
    <Box>
      <Box
        onClick={() => setShowGlossary((s) => !s)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          px: 3,
          py: 1,
          cursor: "pointer",
          color: CC.textSub,
          "&:hover": { color: CC.text },
        }}
      >
        <Icon
          icon={showGlossary ? "mdi:chevron-down" : "mdi:chevron-right"}
          width={14}
        />
        <Typography sx={{ fontSize: 12 }}>What these columns mean</Typography>
      </Box>
      <Collapse in={showGlossary}>
        <Box
          sx={{
            px: 3,
            pb: 1.5,
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
          }}
        >
          {GLOSSARY.filter(
            ([label]) =>
              showRecordColumns ||
              !["W/L/D", "Vs expected", "Quality"].includes(label)
          ).map(([label, desc]) => (
            <Typography key={label} sx={{ fontSize: 12, color: CC.textSub }}>
              <Box component="span" sx={{ fontWeight: 700, color: CC.text }}>
                {label}
              </Box>
              {" — "}
              {desc}
            </Typography>
          ))}
        </Box>
      </Collapse>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          pl: 2,
          pr: 2,
          py: 1.25,
          backgroundColor: "var(--cc-surface-container-low)",
          borderTop: `1px solid ${CC.border}`,
          borderBottom: `1px solid ${CC.border}`,
        }}
      >
        <Box sx={{ width: 16 }} />
        <HeaderLabel
          label={firstLabel}
          sx={{ flex: 1, minWidth: 160, textAlign: "left" }}
        />
        <HeaderLabel label="Games" width={90} />
        {showRecordColumns && <HeaderLabel label="W/L/D" width={130} />}
        {showRecordColumns && <HeaderLabel label="Vs expected" width={100} />}
        {showRecordColumns && <HeaderLabel label="Quality" width={150} />}
        <HeaderLabel label={betterLabel} width={130} />
        <HeaderLabel label={equalLabel} width={130} />
        <HeaderLabel label={worseLabel} width={130} />
      </Box>
    </Box>
  );
}

function HeaderLabel({
  label,
  width,
  sx,
}: {
  label: string;
  width?: number;
  sx?: object;
}) {
  return (
    <Typography
      sx={{
        width,
        flexShrink: width ? 0 : undefined,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: CC.textSub,
        textAlign: "right",
        ...sx,
      }}
    >
      {label}
    </Typography>
  );
}
