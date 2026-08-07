import { AnalysisNode, AnalysisTree } from "@/types/analysis";
import { MoveClassification } from "@/types/enums";
import {
  Box,
  Grid2 as Grid,
  IconButton,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import MoveItem from "./moveItem";
import MoveComment from "./moveComment";
import { Icon } from "@iconify/react";
import { Fragment, memo, useCallback, useMemo, useState } from "react";
import { CC } from "@/constants";
import { useSetAtom } from "jotai";
import {
  promoteVariationAction,
  removeNodeAction,
  setCommentAction,
} from "../../../actions";
import { getCommentClock, getCommentDisplay } from "@/lib/chess";

interface Props {
  gameEvalPositions?: {
    moveClassification?: MoveClassification;
  }[];
  indent?: number;
  startNodeId: string;
  tree: AnalysisTree;
}

interface DisplayMove {
  node: AnalysisNode;
  moveClassification?: MoveClassification;
  comment?: string;
  clock?: string;
}

interface RowEntry {
  white?: DisplayMove;
  black?: DisplayMove;
  whiteVariationIds: string[];
  blackVariationIds: string[];
  whiteIsFirstChild: boolean;
  blackIsFirstChild: boolean;
}

function MovesBranchInner({
  gameEvalPositions,
  indent = 0,
  startNodeId,
  tree,
}: Props) {
  const rows = useMemo(
    () => buildRows(tree, startNodeId, gameEvalPositions),
    [gameEvalPositions, startNodeId, tree]
  );

  return (
    <>
      {rows.map((row, idx) => (
        <Fragment
          key={`${row.white?.node.id ?? "none"}-${row.black?.node.id ?? "none"}-${idx}`}
        >
          <MovesLine
            blackMove={row.black}
            blackVariationIds={row.blackVariationIds}
            blackIsFirstChild={row.blackIsFirstChild}
            gameEvalPositions={gameEvalPositions}
            indent={indent}
            tree={tree}
            whiteMove={row.white}
            whiteVariationIds={row.whiteVariationIds}
            whiteIsFirstChild={row.whiteIsFirstChild}
          />
        </Fragment>
      ))}
    </>
  );
}

const MovesBranch = memo(MovesBranchInner);
export default MovesBranch;

const buildRows = (
  tree: AnalysisTree,
  startNodeId: string,
  gameEvalPositions?: { moveClassification?: MoveClassification }[]
): RowEntry[] => {
  const items: RowEntry[] = [];
  let cursorId: string | undefined = startNodeId;

  while (cursorId) {
    const firstNode: AnalysisNode | undefined = tree.nodes[cursorId];
    if (!firstNode) break;

    if (firstNode.color === "w") {
      const white = buildDisplayMove(firstNode, gameEvalPositions);
      const blackId: string | undefined = firstNode.children[0];
      const blackNode: AnalysisNode | undefined = blackId
        ? tree.nodes[blackId]
        : undefined;
      const whiteVariationIds = firstNode.children.slice(1);
      const whiteIsFirstChild = isFirstChildOf(tree, firstNode);

      if (blackNode?.color === "b") {
        const blackVariationIds = blackNode.children.slice(1);
        const blackIsFirstChild = isFirstChildOf(tree, blackNode);
        items.push({
          white,
          black: buildDisplayMove(blackNode, gameEvalPositions),
          whiteVariationIds,
          blackVariationIds,
          whiteIsFirstChild,
          blackIsFirstChild,
        });
        cursorId = blackNode.children[0];
      } else {
        items.push({
          white,
          whiteVariationIds,
          blackVariationIds: [],
          whiteIsFirstChild,
          blackIsFirstChild: false,
        });
        cursorId = firstNode.children[0];
      }
      continue;
    }

    items.push({
      black: buildDisplayMove(firstNode, gameEvalPositions),
      whiteVariationIds: [],
      blackVariationIds: firstNode.children.slice(1),
      whiteIsFirstChild: false,
      blackIsFirstChild: isFirstChildOf(tree, firstNode),
    });
    cursorId = firstNode.children[0];
  }

  return items;
};

const isFirstChildOf = (tree: AnalysisTree, node: AnalysisNode): boolean =>
  !!node.parentId && tree.nodes[node.parentId]?.children?.[0] === node.id;

interface MoveActionsProps {
  nodeId: string;
  isMainline: boolean;
  isFirstChild: boolean;
  hasParent: boolean;
  onEdit: () => void;
}

const MoveActions = memo(function MoveActions({
  nodeId,
  isMainline,
  isFirstChild,
  hasParent,
  onEdit,
}: MoveActionsProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const removeNode = useSetAtom(removeNodeAction);
  const promoteVariation = useSetAtom(promoteVariationAction);

  const canPromote = !isMainline && hasParent && !isFirstChild;

  return (
    <Box
      className="move-actions"
      sx={{
        display: "inline-flex",
        gap: "1px",
        alignItems: "center",
        flexShrink: 0,
        ml: "2px",
        opacity: 0,
        transition: "opacity 80ms ease",
      }}
    >
      <Tooltip title="Add / edit comment">
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          sx={{
            p: "1px",
            borderRadius: "2px",
            color: isDark ? CC.textMuted : "#a0a09e",
            "&:hover": { color: isDark ? CC.text : CC.lText },
          }}
        >
          <Icon icon="material-symbols:add-comment-outline" width={12} />
        </IconButton>
      </Tooltip>

      {canPromote && (
        <Tooltip title="Promote to main line">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              promoteVariation(nodeId);
            }}
            sx={{
              p: "1px",
              borderRadius: "2px",
              color: isDark ? CC.textMuted : "#a0a09e",
              "&:hover": { color: isDark ? CC.text : CC.lText },
            }}
          >
            <Icon icon="material-symbols:arrow-upward-alt" width={12} />
          </IconButton>
        </Tooltip>
      )}

      <Tooltip title="Delete this branch">
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            removeNode(nodeId);
          }}
          sx={{
            p: "1px",
            borderRadius: "2px",
            color: isDark ? CC.textMuted : "#a0a09e",
            "&:hover": { color: "#e57373" },
          }}
        >
          <Icon icon="material-symbols:delete-outline" width={12} />
        </IconButton>
      </Tooltip>
    </Box>
  );
});

interface MovesLineProps {
  blackMove?: DisplayMove;
  blackVariationIds: string[];
  blackIsFirstChild: boolean;
  gameEvalPositions?: { moveClassification?: MoveClassification }[];
  indent: number;
  tree: AnalysisTree;
  whiteMove?: DisplayMove;
  whiteVariationIds: string[];
  whiteIsFirstChild: boolean;
}

function MovesLine({
  blackMove,
  blackVariationIds,
  blackIsFirstChild,
  gameEvalPositions,
  indent,
  tree,
  whiteMove,
  whiteVariationIds,
  whiteIsFirstChild,
}: MovesLineProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const setCommentRaw = useSetAtom(setCommentAction);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  const setComment = useCallback(
    (nodeId: string, comment: string) => {
      setCommentRaw({ nodeId, comment });
    },
    [setCommentRaw]
  );

  const moveLabel = whiteMove
    ? `${Math.ceil(whiteMove.node.ply / 2)}.`
    : blackMove
      ? `${Math.ceil(blackMove.node.ply / 2)}...`
      : "";

  const hasAnyComment = !!whiteMove?.comment || !!blackMove?.comment;
  const hasAnyVariation =
    whiteVariationIds.length > 0 || blackVariationIds.length > 0;
  const showDetailsSection =
    hasAnyVariation || hasAnyComment || editingNodeId !== null;

  return (
    <Grid
      container
      size={12}
      sx={{
        "&:hover .move-actions": { opacity: 1 },
      }}
    >
      <Grid
        container
        alignItems="center"
        wrap="nowrap"
        size={12}
        sx={{
          minHeight: 28,
          pl: `${indent * 1.25}rem`,
          borderBottom: `1px solid ${isDark ? CC.border : CC.lBorder}`,
        }}
      >
        <Typography
          sx={{
            width: "2.2rem",
            minWidth: "2.2rem",
            fontFamily: "var(--cc-font-mono)",
            fontSize: "0.78rem",
            color: isDark ? CC.textMuted : "#a0a09e",
            fontWeight: 500,
            px: "6px",
            py: "4px",
            flexShrink: 0,
            userSelect: "none",
            textAlign: "center",
          }}
        >
          {moveLabel}
        </Typography>

        {whiteMove ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexGrow: 1,
              flexBasis: 0,
              minWidth: 0,
            }}
          >
            <MoveItem
              moveClassification={whiteMove.moveClassification}
              moveColor="w"
              nodeId={whiteMove.node.id}
              ply={whiteMove.node.ply}
              san={whiteMove.node.san ?? ""}
            />
            {whiteMove.clock && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1px",
                  flexShrink: 0,
                  ml: "2px",
                  color: CC.textMuted,
                }}
              >
                <Icon icon="mdi:clock-outline" width={9} />
                <Typography sx={{ fontSize: "0.6rem", lineHeight: 1 }}>
                  {whiteMove.clock}
                </Typography>
              </Box>
            )}
            <MoveActions
              nodeId={whiteMove.node.id}
              isMainline={whiteMove.node.isMainline}
              isFirstChild={whiteIsFirstChild}
              hasParent={!!whiteMove.node.parentId}
              onEdit={() => setEditingNodeId(whiteMove.node.id)}
            />
          </Box>
        ) : (
          <Box sx={{ flexGrow: 1, flexBasis: 0 }} />
        )}

        {blackMove ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexGrow: 1,
              flexBasis: 0,
              minWidth: 0,
            }}
          >
            <MoveItem
              moveClassification={blackMove.moveClassification}
              moveColor="b"
              nodeId={blackMove.node.id}
              ply={blackMove.node.ply}
              san={blackMove.node.san ?? ""}
            />
            {blackMove.clock && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1px",
                  flexShrink: 0,
                  ml: "2px",
                  color: CC.textMuted,
                }}
              >
                <Icon icon="mdi:clock-outline" width={9} />
                <Typography sx={{ fontSize: "0.6rem", lineHeight: 1 }}>
                  {blackMove.clock}
                </Typography>
              </Box>
            )}
            <MoveActions
              nodeId={blackMove.node.id}
              isMainline={blackMove.node.isMainline}
              isFirstChild={blackIsFirstChild}
              hasParent={!!blackMove.node.parentId}
              onEdit={() => setEditingNodeId(blackMove.node.id)}
            />
          </Box>
        ) : (
          <Box sx={{ flexGrow: 1, flexBasis: 0 }} />
        )}
      </Grid>

      {showDetailsSection && (
        <Grid
          container
          size={12}
          sx={{
            pl: `calc(2.2rem + ${indent * 1.25}rem)`,
            backgroundColor: isDark ? CC.bg0 : CC.lBg2,
            borderBottom: `1px solid ${isDark ? CC.border : CC.lBorder}`,
          }}
        >
          {whiteMove &&
            (editingNodeId === whiteMove.node.id ? (
              <MoveComment
                comment={whiteMove.comment}
                isEditing
                moveColor="w"
                onDelete={() => {
                  setComment(whiteMove.node.id, "");
                  setEditingNodeId(null);
                }}
                onEditEnd={() => setEditingNodeId(null)}
                onSave={(text) => {
                  setComment(whiteMove.node.id, text);
                  setEditingNodeId(null);
                }}
              />
            ) : (
              whiteMove.comment && (
                <MoveComment
                  comment={whiteMove.comment}
                  moveColor="w"
                  onDelete={() => setComment(whiteMove.node.id, "")}
                  onEditEnd={() => setEditingNodeId(null)}
                  onEditStart={() => setEditingNodeId(whiteMove.node.id)}
                  onSave={(text) => setComment(whiteMove.node.id, text)}
                />
              )
            ))}

          {whiteVariationIds.map((variationId) => (
            <MovesBranch
              key={variationId}
              gameEvalPositions={gameEvalPositions}
              indent={indent + 1}
              startNodeId={variationId}
              tree={tree}
            />
          ))}

          {blackMove &&
            (editingNodeId === blackMove.node.id ? (
              <MoveComment
                comment={blackMove.comment}
                isEditing
                moveColor="b"
                onDelete={() => {
                  setComment(blackMove.node.id, "");
                  setEditingNodeId(null);
                }}
                onEditEnd={() => setEditingNodeId(null)}
                onSave={(text) => {
                  setComment(blackMove.node.id, text);
                  setEditingNodeId(null);
                }}
              />
            ) : (
              blackMove.comment && (
                <MoveComment
                  comment={blackMove.comment}
                  moveColor="b"
                  onDelete={() => setComment(blackMove.node.id, "")}
                  onEditEnd={() => setEditingNodeId(null)}
                  onEditStart={() => setEditingNodeId(blackMove.node.id)}
                  onSave={(text) => setComment(blackMove.node.id, text)}
                />
              )
            ))}

          {blackVariationIds.map((variationId) => (
            <MovesBranch
              key={variationId}
              gameEvalPositions={gameEvalPositions}
              indent={indent + 1}
              startNodeId={variationId}
              tree={tree}
            />
          ))}
        </Grid>
      )}
    </Grid>
  );
}

const buildDisplayMove = (
  node: AnalysisNode,
  gameEvalPositions?: {
    moveClassification?: MoveClassification;
  }[]
): DisplayMove => ({
  node,
  moveClassification: node.isMainline
    ? gameEvalPositions?.[node.ply]?.moveClassification
    : undefined,
  comment: node.comment ? getCommentDisplay(node.comment) : undefined,
  clock: node.comment ? getCommentClock(node.comment) : undefined,
});
