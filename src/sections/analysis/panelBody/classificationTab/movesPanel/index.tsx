import { Grid2 as Grid } from "@mui/material";
import MovesBranch from "./movesLine";
import { useAtomValue } from "jotai";
import { analysisTreeAtom, gameEvalAtom } from "../../../states";

export default function MovesPanel() {
  const gameEval = useAtomValue(gameEvalAtom);
  const analysisTree = useAtomValue(analysisTreeAtom);

  const mainlineStartId = analysisTree.nodes[analysisTree.rootId]?.children[0];
  const rootVariationIds =
    analysisTree.nodes[analysisTree.rootId]?.children.slice(1) ?? [];

  if (!mainlineStartId && rootVariationIds.length === 0) return null;

  return (
    <Grid
      container
      justifyContent="center"
      alignItems="start"
      gap={0.5}
      paddingY={1}
      sx={{ scrollbarWidth: "thin", overflowY: "auto" }}
      maxHeight="100%"
      size={12}
      id="moves-panel"
    >
      {mainlineStartId && (
        <MovesBranch
          gameEvalPositions={gameEval?.positions}
          startNodeId={mainlineStartId}
          tree={analysisTree}
        />
      )}

      {rootVariationIds.map((variationId) => (
        <MovesBranch
          key={variationId}
          gameEvalPositions={gameEval?.positions}
          indent={1}
          startNodeId={variationId}
          tree={analysisTree}
        />
      ))}
    </Grid>
  );
}
