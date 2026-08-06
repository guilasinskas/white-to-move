import { openings } from "@/data/openings";

export interface OpeningMatch {
  name: string;
  family: string;
  variation: string;
  exitPly: number;
}

// Same lookup data + matching convention as getMovesClassification (piece-placement
// field only, i.e. fen.split(" ")[0]) — but built once into a Map instead of a
// linear scan, since the player report matches thousands of games instead of one.
let openingsByFen: Map<string, string> | undefined;

function getOpeningsByFen(): Map<string, string> {
  if (!openingsByFen) {
    openingsByFen = new Map(openings.map((o) => [o.fen, o.name]));
  }
  return openingsByFen;
}

// fens[i] is the position after i plies have been played (fens[0] = start).
// Finds the deepest ply still inside known opening theory and returns the name
// reached at that ply, split into "family" (before the first ":") and the full
// "variation" name, matching Plyscope's grouping convention.
export function matchOpening(fens: string[]): OpeningMatch | undefined {
  const byFen = getOpeningsByFen();
  let lastName: string | undefined;
  let lastPly = 0;

  for (let ply = 0; ply < fens.length; ply++) {
    const piecePlacement = fens[ply].split(" ")[0];
    const name = byFen.get(piecePlacement);
    if (name) {
      lastName = name;
      lastPly = ply;
    }
  }

  if (!lastName) return undefined;

  const colonIndex = lastName.indexOf(":");
  const family = colonIndex === -1 ? lastName : lastName.slice(0, colonIndex);

  return {
    name: lastName,
    family: family.trim(),
    variation: lastName,
    exitPly: lastPly,
  };
}
