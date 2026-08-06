import { useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { ToolbarButton } from "@/components/ToolbarButton";
import { analysisTreeAtom, gameEvalAtom } from "../states";
import { countBrilliantMoves } from "@/lib/brilliantClip/getGameMoves";
import ExportBrilliantClipDialog from "./exportBrilliantClipDialog";

export default function ExportBrilliantClipButton() {
  const [open, setOpen] = useState(false);
  const tree = useAtomValue(analysisTreeAtom);
  const gameEval = useAtomValue(gameEvalAtom);

  const hasMoves = tree.mainlineNodeIds.length > 0;
  const brilliantMovesCount = useMemo(
    () => countBrilliantMoves(tree, gameEval?.positions),
    [tree, gameEval]
  );

  return (
    <>
      <ToolbarButton
        tooltip={
          hasMoves
            ? "Export game as GIF/video"
            : "No moves to export yet — play or load a game first"
        }
        icon="ri:movie-2-line"
        onClick={() => setOpen(true)}
        disabled={!hasMoves}
      />

      {open && (
        <ExportBrilliantClipDialog
          open={open}
          onClose={() => setOpen(false)}
          brilliantMovesCount={brilliantMovesCount}
        />
      )}
    </>
  );
}
