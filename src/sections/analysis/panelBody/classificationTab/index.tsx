import { useRef } from "react";
import { Box, Grid2 as Grid, Grid2Props as GridProps } from "@mui/material";
import { useAtomValue } from "jotai";
import MovesPanel from "./movesPanel";
import MovesClassificationsRecap from "./movesClassificationsRecap";
import ResizeHandle from "./resizeHandle";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { gameEvalAtom, showEngineAtom } from "../../states";

const DEFAULT_MOVES_WIDTH_PCT = 62;

export default function ClassificationTab(props: GridProps) {
  const gameEval = useAtomValue(gameEvalAtom);
  const showEngine = useAtomValue(showEngineAtom);
  const showRecap = !!gameEval?.positions.length && showEngine;

  const [storedPct, setStoredPct] = useLocalStorage<number>(
    "moves-panel-width-pct",
    DEFAULT_MOVES_WIDTH_PCT
  );
  // Recap panel takes no width once hidden — the moves list gets the room
  // back instead of leaving half the tab empty.
  const movesPct = showRecap ? (storedPct ?? DEFAULT_MOVES_WIDTH_PCT) : 100;

  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <Grid
      ref={containerRef}
      container
      justifyContent="center"
      alignItems="start"
      wrap="nowrap"
      size={12}
      flexGrow={1}
      {...props}
      sx={
        props.hidden ? { display: "none" } : { overflow: "hidden", ...props.sx }
      }
    >
      <Box sx={{ width: `${movesPct}%`, flexShrink: 0, minWidth: 0 }}>
        <MovesPanel />
      </Box>

      {showRecap && (
        <>
          <ResizeHandle containerRef={containerRef} onResize={setStoredPct} />
          <Box sx={{ width: `${100 - movesPct}%`, flexShrink: 0, minWidth: 0 }}>
            <MovesClassificationsRecap />
          </Box>
        </>
      )}
    </Grid>
  );
}
