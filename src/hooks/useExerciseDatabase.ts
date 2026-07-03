import { Exercise, ExerciseUpdate, NewExercise } from "@/types/exercises";
import { atom, useAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";

const exercisesAtom = atom<Exercise[]>([]);
const fetchExercisesAtom = atom<boolean>(false);

export const useExerciseDatabase = (shouldFetch?: boolean) => {
  const [exercises, setExercises] = useAtom(exercisesAtom);
  const [fetchFlag, setFetchFlag] = useAtom(fetchExercisesAtom);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (shouldFetch !== undefined) {
      setFetchFlag(shouldFetch);
    }
  }, [shouldFetch, setFetchFlag]);

  const reload = useCallback(async () => {
    if (!fetchFlag) {
      if (shouldFetch === false || shouldFetch === undefined) {
        setIsReady(true);
      }
      return;
    }
    try {
      const res = await fetch("/api/exercises");
      const data: Exercise[] = await res.json();
      setExercises(data);
    } catch (err) {
      console.error("Failed to load exercises", err);
    } finally {
      setIsReady(true);
    }
  }, [fetchFlag, setExercises, shouldFetch]);

  useEffect(() => {
    reload();
  }, [reload]);

  const addExercise = useCallback(
    async (data: NewExercise) => {
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create exercise");
      const added: Exercise = await res.json();
      setExercises((prev) => [...prev, added]);
      return added;
    },
    [setExercises]
  );

  const updateExercise = useCallback(
    async (id: number, update: ExerciseUpdate) => {
      const res = await fetch(`/api/exercises?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      if (!res.ok) throw new Error("Failed to update exercise");
      const updated: Exercise = await res.json();
      setExercises((prev) => prev.map((e) => (e.id === id ? updated : e)));
      return updated;
    },
    [setExercises]
  );

  const deleteExercise = useCallback(
    async (id: number) => {
      const res = await fetch(`/api/exercises?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete exercise");
      setExercises((prev) => prev.filter((e) => e.id !== id));
    },
    [setExercises]
  );

  const getExercise = useCallback(
    (id: number) => exercises.find((e) => e.id === id),
    [exercises]
  );

  return {
    exercises,
    isReady,
    addExercise,
    updateExercise,
    deleteExercise,
    getExercise,
    reload,
  };
};
