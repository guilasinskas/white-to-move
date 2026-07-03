import { ExerciseNode, ExerciseTree } from "@/types/exercises";
import { Chess, DEFAULT_POSITION, Move } from "chess.js";

export const EXERCISE_ROOT_ID = "root";

export const createEmptyExerciseTree = (
  startingFen: string = DEFAULT_POSITION
): ExerciseTree => {
  const rootNode: ExerciseNode = {
    id: EXERCISE_ROOT_ID,
    parentId: null,
    children: [],
    beforeFen: startingFen,
    afterFen: startingFen,
    ply: 0,
    isMainline: true,
  };

  return {
    rootId: EXERCISE_ROOT_ID,
    rootFen: startingFen,
    nextId: 1,
    nodes: { [EXERCISE_ROOT_ID]: rootNode },
    mainlineNodeIds: [],
  };
};

export const getExerciseChess = (
  tree: ExerciseTree,
  nodeId: string = EXERCISE_ROOT_ID
): Chess => {
  const chess = new Chess(tree.rootFen);

  const path: ExerciseNode[] = [];
  let currentId: string | null = nodeId;
  while (currentId && currentId !== tree.rootId) {
    const node: ExerciseNode | undefined = tree.nodes[currentId];
    if (!node) break;
    path.unshift(node);
    currentId = node.parentId;
  }

  for (const node of path) {
    if (!node.san) continue;
    try {
      chess.move(node.san);
    } catch {
      return chess;
    }
  }

  return chess;
};

export const findChildByUci = (
  tree: ExerciseTree,
  parentId: string,
  uci: string
): string | undefined =>
  tree.nodes[parentId]?.children.find(
    (childId) => tree.nodes[childId]?.uci === uci
  );

export const addMoveToTree = (
  tree: ExerciseTree,
  parentId: string,
  move: Move
): { tree: ExerciseTree; nodeId: string; created: boolean } => {
  const uci = move.from + move.to + (move.promotion || "");
  const existingId = findChildByUci(tree, parentId, uci);

  if (existingId) {
    return { tree, nodeId: existingId, created: false };
  }

  const nodeId = `node-${tree.nextId}`;
  const parent = tree.nodes[parentId];
  const isFirstChild = parent.children.length === 0;
  const newNode: ExerciseNode = {
    id: nodeId,
    parentId,
    children: [],
    san: move.san,
    uci,
    beforeFen: move.before,
    afterFen: move.after,
    ply: parent.ply + 1,
    color: move.color,
    isMainline: parent.isMainline && isFirstChild,
  };

  const newTree: ExerciseTree = {
    ...tree,
    nextId: tree.nextId + 1,
    nodes: {
      ...tree.nodes,
      [parentId]: {
        ...parent,
        children: [...parent.children, nodeId],
      },
      [nodeId]: newNode,
    },
    mainlineNodeIds:
      parent.isMainline && isFirstChild
        ? [...tree.mainlineNodeIds, nodeId]
        : tree.mainlineNodeIds,
  };

  return { tree: newTree, nodeId, created: true };
};

export const deleteSubtree = (
  tree: ExerciseTree,
  nodeId: string
): { tree: ExerciseTree; newCurrentId: string } => {
  if (nodeId === EXERCISE_ROOT_ID) return { tree, newCurrentId: nodeId };

  const node: ExerciseNode | undefined = tree.nodes[nodeId];
  if (!node || !node.parentId) return { tree, newCurrentId: nodeId };

  const toDelete = new Set<string>();
  const stack = [nodeId];
  while (stack.length) {
    const id = stack.pop()!;
    if (toDelete.has(id)) continue;
    toDelete.add(id);
    const n: ExerciseNode | undefined = tree.nodes[id];
    if (n) stack.push(...n.children);
  }

  const newNodes: Record<string, ExerciseNode> = {};
  for (const [id, n] of Object.entries(tree.nodes)) {
    if (toDelete.has(id)) continue;
    newNodes[id] = n;
  }

  const parent = newNodes[node.parentId];
  if (parent) {
    newNodes[node.parentId] = {
      ...parent,
      children: parent.children.filter((c) => !toDelete.has(c)),
    };
  }

  return {
    tree: {
      ...tree,
      nodes: newNodes,
      mainlineNodeIds: tree.mainlineNodeIds.filter((id) => !toDelete.has(id)),
    },
    newCurrentId: node.parentId,
  };
};

export const getNextNodeId = (
  tree: ExerciseTree,
  currentNodeId: string
): string | undefined => tree.nodes[currentNodeId]?.children[0];

export const getParentNodeId = (
  tree: ExerciseTree,
  currentNodeId: string
): string => tree.nodes[currentNodeId]?.parentId ?? tree.rootId;

export const getLastReachableNodeId = (
  tree: ExerciseTree,
  currentNodeId: string
): string => {
  let nodeId = currentNodeId;

  while (tree.nodes[nodeId]?.children[0]) {
    nodeId = tree.nodes[nodeId].children[0];
  }

  return nodeId;
};
