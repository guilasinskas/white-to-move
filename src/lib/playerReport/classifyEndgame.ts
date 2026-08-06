import { EndgameType } from "@/types/playerReport";

function countPieces(fenPiecePlacement: string) {
  return {
    queens: (fenPiecePlacement.match(/[qQ]/g) ?? []).length,
    rooks: (fenPiecePlacement.match(/[rR]/g) ?? []).length,
    minors: (fenPiecePlacement.match(/[bBnN]/g) ?? []).length,
  };
}

// Structural classification from the piece types remaining on the board.
// Plyscope's exact rule isn't public — this uses the natural reading of "the
// heaviest piece type still on the board": any queen -> queen ending, else
// any rook -> rook ending, else any minor -> minor-piece ending, else pawn
// ending (kings and pawns only).
export function classifyStructure(fen: string): EndgameType {
  const { queens, rooks, minors } = countPieces(fen.split(" ")[0]);
  if (queens > 0) return "queen";
  if (rooks > 0) return "rook";
  if (minors > 0) return "minor";
  return "pawn";
}

// fens[i] = position after i plies (fens[0] = start, fens[length-1] = final).
// Finds the structure that lasted through the end of the game, requiring it
// to have persisted at least `minPlies` before the game ended — matching the
// site's "long enough to be real" description. Returns undefined if no
// structure lasted that long (e.g. the game ended abruptly out of the
// opening/middlegame).
export function findFinalEndgameStructure(
  fens: string[],
  minPlies = 8
): { type: EndgameType; entryPly: number } | undefined {
  if (fens.length === 0) return undefined;

  const lastPly = fens.length - 1;
  const finalType = classifyStructure(fens[lastPly]);

  let entryPly = lastPly;
  while (entryPly > 0 && classifyStructure(fens[entryPly - 1]) === finalType) {
    entryPly--;
  }

  if (lastPly - entryPly < minPlies) return undefined;

  return { type: finalType, entryPly };
}
