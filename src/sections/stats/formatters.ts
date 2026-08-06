import { ConfidenceInterval } from "@/lib/stats/confidenceInterval";
import { QualityStats } from "@/lib/playerReport/aggregate";

export function formatVsExpectedMain(points?: number): string {
  if (points === undefined) return "—";
  return points > 0 ? `+${points}` : `${points}`;
}

export function formatVsExpectedSub(marginPoints?: number): string | undefined {
  if (marginPoints === undefined) return undefined;
  return `±${marginPoints}`;
}

export function formatQualityMain(quality?: QualityStats): string {
  if (!quality || quality.avgCp === undefined) return "—";
  const sign = quality.avgCp > 0 ? "+" : "";
  return `${sign}${quality.avgCp.toFixed(1)}`;
}

export function formatQualitySub(quality?: QualityStats): string | undefined {
  if (!quality) return undefined;
  const parts: string[] = [];
  if (quality.rangeCp) {
    const fmt = (v: number) => (v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1));
    parts.push(`[${fmt(quality.rangeCp[0])}..${fmt(quality.rangeCp[1])}]`);
  }
  if (quality.matesFor || quality.matesAgainst) {
    parts.push(`M ${quality.matesFor}/${quality.matesAgainst}`);
  }
  return parts.length ? parts.join(" ") : undefined;
}

export function formatCIMain(ci?: ConfidenceInterval): string {
  if (!ci || ci.total === 0) return "—";
  return `${ci.rate}%`;
}

export function formatCISub(ci?: ConfidenceInterval): string | undefined {
  if (!ci || ci.total === 0) return undefined;
  return `±${ci.marginPct} · ${ci.count}/${ci.total}`;
}
