export interface ExerciseNode {
  id: string;
  parentId: string | null;
  children: string[];
  san?: string;
  uci?: string;
  beforeFen: string;
  afterFen: string;
  ply: number;
  color?: "w" | "b";
  isMainline: boolean;
}

export interface ExerciseTree {
  rootId: string;
  rootFen: string;
  nextId: number;
  nodes: Record<string, ExerciseNode>;
  mainlineNodeIds: string[];
}

export interface ExerciseAttempt {
  date: string;
  correct: boolean;
  timeTakenSeconds?: number;
  timedOut?: boolean;
}

export interface Exercise {
  id: number;
  name: string;
  description?: string;
  startingFen: string;
  tree: ExerciseTree;
  timeLimitSeconds?: number;
  attempts: ExerciseAttempt[];
  createdAt: string;
  updatedAt: string;
}

export type NewExercise = Omit<
  Exercise,
  "id" | "createdAt" | "updatedAt" | "attempts"
>;

export interface ExerciseUpdate {
  name?: string;
  description?: string;
  startingFen?: string;
  tree?: ExerciseTree;
  timeLimitSeconds?: number;
  attempts?: ExerciseAttempt[];
}
