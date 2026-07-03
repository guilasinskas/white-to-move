import { Exercise, ExerciseUpdate, NewExercise } from "@/types/exercises";
import fs from "fs";
import { NextApiRequest, NextApiResponse } from "next";
import path from "path";

const DATA_PATH = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, "exercises.json")
  : path.join(process.cwd(), "data", "exercises.json");

const readExercises = (): Exercise[] => {
  if (!fs.existsSync(DATA_PATH)) {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    fs.writeFileSync(DATA_PATH, "[]", "utf-8");
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8")) as Exercise[];
  } catch {
    return [];
  }
};

const writeExercises = (items: Exercise[]) => {
  fs.writeFileSync(DATA_PATH, JSON.stringify(items, null, 2), "utf-8");
};

export const config = {
  api: { bodyParser: { sizeLimit: "5mb" } },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    return res.status(200).json(readExercises());
  }

  if (req.method === "POST") {
    const items = readExercises();
    const body = req.body as NewExercise;
    if (!body || !body.name || !body.startingFen || !body.tree) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const maxId = items.length > 0 ? Math.max(...items.map((g) => g.id)) : 0;
    const now = new Date().toISOString();
    const added: Exercise = {
      ...body,
      id: maxId + 1,
      attempts: [],
      createdAt: now,
      updatedAt: now,
    };

    writeExercises([...items, added]);
    return res.status(201).json(added);
  }

  if (req.method === "PUT") {
    const id = parseInt(req.query.id as string);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const items = readExercises();
    const idx = items.findIndex((g) => g.id === id);
    if (idx === -1)
      return res.status(404).json({ error: "Exercise not found" });

    const update = req.body as ExerciseUpdate;
    items[idx] = {
      ...items[idx],
      ...update,
      updatedAt: new Date().toISOString(),
    };
    writeExercises(items);
    return res.status(200).json(items[idx]);
  }

  if (req.method === "DELETE") {
    const id = parseInt(req.query.id as string);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const items = readExercises();
    writeExercises(items.filter((g) => g.id !== id));
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: "Method not allowed" });
}
