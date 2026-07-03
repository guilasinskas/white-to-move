import { Color } from "@/types/enums";
import { ExerciseTree } from "@/types/exercises";
import { createEmptyExerciseTree, EXERCISE_ROOT_ID } from "@/lib/exerciseTree";
import { Chess } from "chess.js";
import { atom } from "jotai";

export const exerciseTreeAtom = atom<ExerciseTree>(createEmptyExerciseTree());

export const currentNodeIdAtom = atom<string>(EXERCISE_ROOT_ID);

export const exerciseBoardAtom = atom<Chess>(new Chess());

export type ExerciseMode = "edit" | "solve";
export const exerciseModeAtom = atom<ExerciseMode>("edit");

export const solutionRevealedAtom = atom<boolean>(false);

export const exerciseBoardOrientationAtom = atom<Color>(Color.White);

export const hasUnsavedChangesAtom = atom<boolean>(false);

export const exerciseNameAtom = atom<string>("");
export const exerciseDescriptionAtom = atom<string>("");
export const exerciseTimeLimitSecondsAtom = atom<number | undefined>(undefined);
