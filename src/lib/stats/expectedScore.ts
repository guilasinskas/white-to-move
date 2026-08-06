// Standard Elo expected-score formula: probability (as a 0-1 fraction) that
// `ratingSelf` beats `ratingOpp` in a single game.
export function expectedScore(ratingSelf: number, ratingOpp: number): number {
  return 1 / (1 + Math.pow(10, (ratingOpp - ratingSelf) / 400));
}

// Inverse of the expected-score formula: the rating gap that would produce
// `scoreFraction` as an expected score against a fixed baseline. This is the
// same 400-point logistic curve chess rating systems use to turn a score
// fraction into a performance rating.
export function scoreToRatingDiff(scoreFraction: number): number {
  const clamped = Math.min(0.999, Math.max(0.001, scoreFraction));
  return 400 * Math.log10(clamped / (1 - clamped));
}

// "How many rating points better/worse than expected" a sample of games was,
// expressed in the same units as scoreToRatingDiff. This is a standard,
// well-defined equivalent — not Plyscope's literal (undisclosed, closed-
// source) formula for its "vs expected" column, but the same kind of number.
export function vsExpectedRatingPoints(
  actualScoreFraction: number,
  expectedScoreFraction: number
): number {
  return Math.round(
    scoreToRatingDiff(actualScoreFraction) -
      scoreToRatingDiff(expectedScoreFraction)
  );
}
