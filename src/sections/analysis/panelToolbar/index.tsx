import { Stack, useMediaQuery } from "@mui/material";
import { useAtomValue } from "jotai";
import { boardAtom } from "../states";
import FlipBoardButton from "./flipBoardButton";
import NextMoveButton from "./nextMoveButton";
import GoToLastPositionButton from "./goToLastPositionButton";
import SaveButton from "./saveButton";
import { useEffect } from "react";
import { ToolbarButton } from "@/components/ToolbarButton";
import { CopyPgnButton } from "./copyPgnButton";
import { useAnalysisActions } from "@/hooks/useAnalysisActions";
import ToggleEngineButton from "./toggleEngineButton";
import ExportBrilliantClipButton from "./exportBrilliantClipButton";

export default function PanelToolBar() {
  const board = useAtomValue(boardAtom);
  const { resetBoard, undoBoardMove } = useAnalysisActions();

  const boardHistory = board.history();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (boardHistory.length === 0) return;
      if (e.key === "ArrowLeft") {
        undoBoardMove();
      } else if (e.key === "ArrowDown") {
        resetBoard();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [undoBoardMove, boardHistory, resetBoard, board]);

  const isSmOrGreater = useMediaQuery((theme) => theme.breakpoints.up("sm"));

  return (
    <>
      <Stack
        direction="row"
        justifyContent={{ xs: "center", md: "center" }}
        alignItems="center"
        gap={{ xs: 0.5, sm: 1, md: 2, xl: 3 }}
        width="100%"
        flexWrap="wrap"
        rowGap={0.5}
        sx={{
          minWidth: 0,
          overflow: "visible",
        }}
      >
        {isSmOrGreater && <FlipBoardButton />}

        {isSmOrGreater && <ToggleEngineButton />}

        <ToolbarButton
          tooltip="Reset board"
          onClick={() => resetBoard()}
          icon="ri:skip-back-line"
          disabled={boardHistory.length === 0}
        />

        <ToolbarButton
          tooltip="Go to previous move"
          onClick={() => undoBoardMove()}
          icon="ri:arrow-left-s-line"
          disabled={boardHistory.length === 0}
          iconHeight={30}
        />

        <NextMoveButton />

        <GoToLastPositionButton />

        {isSmOrGreater && (
          <>
            <CopyPgnButton />
            <SaveButton />
            <ExportBrilliantClipButton />
          </>
        )}
      </Stack>

      {!isSmOrGreater && (
        <Stack
          direction="row"
          justifyContent="center"
          alignItems="center"
          gap={0.5}
          width="100%"
          flexWrap="wrap"
          rowGap={0.5}
          sx={{
            minWidth: 0,
            overflow: "visible",
          }}
        >
          <FlipBoardButton />
          <ToggleEngineButton />
          <CopyPgnButton />
          <SaveButton />
          <ExportBrilliantClipButton />
        </Stack>
      )}
    </>
  );
}
