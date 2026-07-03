import Board from "@/components/board";
import { LAYOUT, useScreenSize } from "@/hooks/useScreenSize";
import { Move } from "chess.js";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useMemo } from "react";
import {
  exerciseBoardAtom,
  exerciseBoardOrientationAtom,
  exerciseModeAtom,
} from "./states";
import { playExerciseMoveAction } from "./actions";

export default function ExerciseBoard() {
  const screenSize = useScreenSize();
  const orientation = useAtomValue(exerciseBoardOrientationAtom);
  const mode = useAtomValue(exerciseModeAtom);
  const playExerciseMove = useSetAtom(playExerciseMoveAction);

  const onPlayMove = useCallback(
    (params: { from: string; to: string; promotion?: string }): Move | null =>
      mode === "edit" ? playExerciseMove(params) : null,
    [mode, playExerciseMove]
  );

  const boardSize = useMemo(() => {
    const { width, height } = screenSize;

    if (width < LAYOUT.bpSideBySide) {
      const verticalBudget =
        height -
        (width < LAYOUT.bpSidebar ? LAYOUT.navbarHeight : 0) -
        LAYOUT.titleBarHeight -
        2 * LAYOUT.pagePaddingY -
        2 * LAYOUT.playerHeaderHeight -
        2 * LAYOUT.boardRowGap;
      const horizontalBudget =
        width -
        (width < LAYOUT.bpSidebar ? 0 : LAYOUT.sidebarWidth) -
        2 * LAYOUT.pagePaddingX;
      return Math.min(horizontalBudget, verticalBudget);
    }

    const verticalBudget =
      height -
      LAYOUT.titleBarHeight -
      2 * LAYOUT.pagePaddingY -
      2 * LAYOUT.playerHeaderHeight -
      2 * LAYOUT.boardRowGap;
    const horizontalBudget =
      width -
      LAYOUT.sidebarWidth -
      2 * LAYOUT.pagePaddingX -
      LAYOUT.boardPanelGap -
      LAYOUT.panelMinWidth;
    return Math.min(verticalBudget, horizontalBudget);
  }, [screenSize]);

  return (
    <Board
      id="ExerciseBoard"
      canPlay={true}
      gameAtom={exerciseBoardAtom}
      boardSize={boardSize}
      whitePlayer={{ name: "White" }}
      blackPlayer={{ name: "Black" }}
      boardOrientation={orientation}
      onPlayMove={mode === "edit" ? onPlayMove : undefined}
    />
  );
}
