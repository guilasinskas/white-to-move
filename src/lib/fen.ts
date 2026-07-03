import { Chess } from "chess.js";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

export const squareMapFromFen = (fen: string): Record<string, string> => {
  const placement = fen.trim().split(" ")[0] ?? "";
  const ranks = placement.split("/");
  const map: Record<string, string> = {};

  ranks.forEach((rankStr, rankIdx) => {
    const rank = 8 - rankIdx;
    let fileIdx = 0;
    for (const ch of rankStr) {
      if (/\d/.test(ch)) {
        fileIdx += parseInt(ch, 10);
      } else if (fileIdx < 8) {
        const color = ch === ch.toUpperCase() ? "w" : "b";
        map[`${FILES[fileIdx]}${rank}`] = `${color}${ch.toUpperCase()}`;
        fileIdx += 1;
      }
    }
  });

  return map;
};

const deriveCastlingRights = (map: Record<string, string>): string => {
  let rights = "";
  if (map["e1"] === "wK") {
    if (map["h1"] === "wR") rights += "K";
    if (map["a1"] === "wR") rights += "Q";
  }
  if (map["e8"] === "bK") {
    if (map["h8"] === "bR") rights += "k";
    if (map["a8"] === "bR") rights += "q";
  }
  return rights || "-";
};

export const fenFromSquareMap = (
  map: Record<string, string>,
  turn: "w" | "b"
): string => {
  const ranksOut: string[] = [];

  for (let rank = 8; rank >= 1; rank--) {
    let rankStr = "";
    let emptyCount = 0;
    for (const file of FILES) {
      const code = map[`${file}${rank}`];
      if (!code) {
        emptyCount += 1;
        continue;
      }
      if (emptyCount > 0) {
        rankStr += emptyCount;
        emptyCount = 0;
      }
      const letter = code[1];
      rankStr += code[0] === "w" ? letter.toUpperCase() : letter.toLowerCase();
    }
    if (emptyCount > 0) rankStr += emptyCount;
    ranksOut.push(rankStr);
  }

  const castling = deriveCastlingRights(map);
  return `${ranksOut.join("/")} ${turn} ${castling} - 0 1`;
};

export const isValidFen = (fen: string): boolean => {
  try {
    new Chess(fen);
    return true;
  } catch {
    return false;
  }
};
