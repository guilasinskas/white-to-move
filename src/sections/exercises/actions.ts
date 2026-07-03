import { atom } from "jotai";
import { type Move } from "chess.js";
import {
  EXERCISE_ROOT_ID,
  addMoveToTree,
  deleteSubtree,
  getExerciseChess,
  getLastReachableNodeId,
  getNextNodeId,
  getParentNodeId,
} from "@/lib/exerciseTree";
import { playIllegalMoveSound, playSoundFromMove } from "@/lib/sounds";
import { Color } from "@/types/enums";
import { Exercise } from "@/types/exercises";
import {
  currentNodeIdAtom,
  exerciseBoardAtom,
  exerciseBoardOrientationAtom,
  exerciseDescriptionAtom,
  exerciseModeAtom,
  exerciseNameAtom,
  exerciseTimeLimitSecondsAtom,
  exerciseTreeAtom,
  hasUnsavedChangesAtom,
  solutionRevealedAtom,
} from "./states";

export const playExerciseMoveAction = atom(
  null,
  (
    get,
    set,
    params: { from: string; to: string; promotion?: string }
  ): Move | null => {
    const tree = get(exerciseTreeAtom);
    const currentNodeId = get(currentNodeIdAtom);
    const board = getExerciseChess(tree, currentNodeId);

    let result: Move | null = null;
    try {
      result = board.move(params);
    } catch {
      playIllegalMoveSound();
      return null;
    }
    if (!result) return null;

    const { tree: newTree, nodeId } = addMoveToTree(
      tree,
      currentNodeId,
      result
    );

    if (newTree !== tree) {
      set(exerciseTreeAtom, newTree);
      set(hasUnsavedChangesAtom, true);
    }
    set(currentNodeIdAtom, nodeId);
    set(exerciseBoardAtom, board);
    playSoundFromMove(result);
    return result;
  }
);

export const goToExerciseNodeAction = atom(null, (get, set, nodeId: string) => {
  const tree = get(exerciseTreeAtom);
  set(currentNodeIdAtom, nodeId);
  set(exerciseBoardAtom, getExerciseChess(tree, nodeId));
});

export const goPrevExerciseAction = atom(null, (get, set) => {
  const tree = get(exerciseTreeAtom);
  const currentNodeId = get(currentNodeIdAtom);
  const parentId = getParentNodeId(tree, currentNodeId);
  if (parentId === currentNodeId) return;
  set(currentNodeIdAtom, parentId);
  set(exerciseBoardAtom, getExerciseChess(tree, parentId));
});

export const goNextExerciseAction = atom(null, (get, set) => {
  const tree = get(exerciseTreeAtom);
  const currentNodeId = get(currentNodeIdAtom);
  const nextId = getNextNodeId(tree, currentNodeId);
  if (!nextId) return;
  set(currentNodeIdAtom, nextId);
  set(exerciseBoardAtom, getExerciseChess(tree, nextId));
});

export const goLastExerciseAction = atom(null, (get, set) => {
  const tree = get(exerciseTreeAtom);
  const currentNodeId = get(currentNodeIdAtom);
  const lastId = getLastReachableNodeId(tree, currentNodeId);
  if (lastId === currentNodeId) return;
  set(currentNodeIdAtom, lastId);
  set(exerciseBoardAtom, getExerciseChess(tree, lastId));
});

export const goStartExerciseAction = atom(null, (get, set) => {
  const tree = get(exerciseTreeAtom);
  if (get(currentNodeIdAtom) === EXERCISE_ROOT_ID) return;
  set(currentNodeIdAtom, EXERCISE_ROOT_ID);
  set(exerciseBoardAtom, getExerciseChess(tree, EXERCISE_ROOT_ID));
});

export const deleteExerciseSubtreeAction = atom(
  null,
  (get, set, nodeId: string) => {
    const tree = get(exerciseTreeAtom);
    const { tree: next, newCurrentId } = deleteSubtree(tree, nodeId);
    if (next === tree) return;
    set(exerciseTreeAtom, next);
    set(currentNodeIdAtom, newCurrentId);
    set(exerciseBoardAtom, getExerciseChess(next, newCurrentId));
    set(hasUnsavedChangesAtom, true);
  }
);

export const initializeExerciseAction = atom(
  null,
  (_get, set, exercise: Exercise) => {
    set(exerciseTreeAtom, exercise.tree);
    set(currentNodeIdAtom, EXERCISE_ROOT_ID);
    set(exerciseBoardAtom, getExerciseChess(exercise.tree, EXERCISE_ROOT_ID));
    set(exerciseNameAtom, exercise.name);
    set(exerciseDescriptionAtom, exercise.description ?? "");
    set(exerciseTimeLimitSecondsAtom, exercise.timeLimitSeconds);
    set(hasUnsavedChangesAtom, false);
    set(exerciseModeAtom, "solve");
    set(solutionRevealedAtom, false);
    set(exerciseBoardOrientationAtom, Color.White);
  }
);

export const markExerciseSavedAction = atom(null, (_get, set) => {
  set(hasUnsavedChangesAtom, false);
});

export const setExerciseModeAction = atom(
  null,
  (get, set, mode: "edit" | "solve") => {
    const tree = get(exerciseTreeAtom);
    set(exerciseModeAtom, mode);
    set(solutionRevealedAtom, false);
    set(currentNodeIdAtom, EXERCISE_ROOT_ID);
    set(exerciseBoardAtom, getExerciseChess(tree, EXERCISE_ROOT_ID));
  }
);

export const revealExerciseSolutionAction = atom(null, (_get, set) => {
  set(solutionRevealedAtom, true);
});

export const setExerciseNameAction = atom(null, (_get, set, name: string) => {
  set(exerciseNameAtom, name);
  set(hasUnsavedChangesAtom, true);
});

export const setExerciseDescriptionAction = atom(
  null,
  (_get, set, description: string) => {
    set(exerciseDescriptionAtom, description);
    set(hasUnsavedChangesAtom, true);
  }
);

export const setExerciseTimeLimitAction = atom(
  null,
  (_get, set, timeLimitSeconds: number | undefined) => {
    set(exerciseTimeLimitSecondsAtom, timeLimitSeconds);
    set(hasUnsavedChangesAtom, true);
  }
);

export const resetExerciseAttemptAction = atom(null, (get, set) => {
  const tree = get(exerciseTreeAtom);
  set(solutionRevealedAtom, false);
  set(currentNodeIdAtom, EXERCISE_ROOT_ID);
  set(exerciseBoardAtom, getExerciseChess(tree, EXERCISE_ROOT_ID));
});
