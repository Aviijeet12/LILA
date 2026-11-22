import { WorldBounds } from '../../map-explorer/utils/heatmapMath';

/**
 * Maps 64x64 grid coordinates [row, col] to an intuitive human-readable geographic zone.
 */
export function getSectorZoneName(row: number, col: number): string {
  let lat = 'Central';
  if (row < 21) lat = 'North';
  else if (row > 42) lat = 'South';

  let lon = 'Central';
  if (col < 21) lon = 'West';
  else if (col > 42) lon = 'East';

  if (lat === 'Central' && lon === 'Central') {
    return 'Central Core Zone';
  }
  if (lat === 'Central') {
    return `${lon}-Central Zone`;
  }
  if (lon === 'Central') {
    return `${lat}-Central Zone`;
  }
  return `${lat}-${lon} Zone`;
}

/**
 * Formats world bounding coordinates into a clean, human-readable string.
 */
export function formatSectorBoundsText(bounds: WorldBounds): string {
  return `X: ${bounds.xMin}m to ${bounds.xMax}m · Z: ${bounds.zMin}m to ${bounds.zMax}m`;
}

/**
 * Splits and formats raw analytical conclusions into easily digestible, human-readable components.
 */
export interface ParsedConclusion {
  headline: string;
  bulletPoints: string[];
  takeaway?: string;
}

export function parseHumanReadableConclusion(conclusion: string): ParsedConclusion {
  if (!conclusion || conclusion.trim().length === 0) {
    return { headline: 'Analysis Complete', bulletPoints: [] };
  }

  // Split into natural sentences
  const sentences = conclusion
    .split(/(?<=[.!?])s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length <= 1) {
    return {
      headline: sentences[0] || conclusion,
      bulletPoints: [],
    };
  }

  const headline = sentences[0];
  const bulletPoints = sentences.slice(1);

  return {
    headline,
    bulletPoints,
  };
}
