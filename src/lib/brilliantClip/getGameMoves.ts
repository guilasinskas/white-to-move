import { AnalysisTree } from "@/types/analysis";
import { PositionEval } from "@/types/eval";
import { MoveClassification } from "@/types/enums";

export interface GameMove {
  nodeId: string;
  san: string;
  beforeFen: string;
  afterFen: string;
  from: string;
  to: string;
  color: "w" | "b";
  moveNumber: number;
  isBrilliant: boolean;
}

export const getGameMoves = (
  tree: AnalysisTree,
  positions?: PositionEval[]
): GameMove[] => {
  const moves: GameMove[] = [];

  for (const nodeId of tree.mainlineNodeIds) {
    const node = tree.nodes[nodeId];
    if (!node?.san || !node.uci || !node.color) continue;

    const classification = positions?.[node.ply]?.moveClassification;

    moves.push({
      nodeId,
      san: node.san,
      beforeFen: node.beforeFen,
      afterFen: node.afterFen,
      from: node.uci.slice(0, 2),
      to: node.uci.slice(2, 4),
      color: node.color,
      moveNumber: Math.ceil(node.ply / 2),
      isBrilliant: classification === MoveClassification.Splendid,
    });
  }

  return moves;
};

export const countBrilliantMoves = (
  tree: AnalysisTree,
  positions?: PositionEval[]
): number =>
  getGameMoves(tree, positions).filter((move) => move.isBrilliant).length;
