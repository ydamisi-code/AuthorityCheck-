import type { Citation } from '../types';

/**
 * Citation extraction. Deliberately regex-based, not AI-based: a hallucination
 * detector that itself hallucinates is worthless. Every citation here is either
 * matched by an explicit pattern or not matched at all.
 */

const COURTS = 'UKSC|UKPC|UKHL|EWCA|EWHC|EWFC|EWCOP|UKUT|UKFTT';

/** [2025] EWHC 1383 (Admin), [2023] EWCA Civ 12, [2019] UKSC 41 */
const NEUTRAL = new RegExp(
  String.raw`\[(1[89]\d{2}|20\d{2})\]\s+(${COURTS})\b(?:\s+(Civ|Crim))?(?:\s+(\d{1,5}))?(?:\s*\((\w{2,6})\))?`,
  'g',
);

/** Words allowed inside an Act's short title between capitalised words. */
const CONNECTOR = 'of|and|the|for|in|to|on|at';

/**
 * An Act's short title is Title Case. Requiring that stops the match running
 * backwards through ordinary prose: "Reserved legal activities are defined by
 * the Legal Services Act 2007" must yield only the last four words.
 */
const ACT_NAME = String.raw`(?:(?:[A-Z][A-Za-z'’\-]+|${CONNECTOR})\s+){1,8}?Act(?:\s+\(Northern Ireland\))?\s+(?:1[6-9]\d{2}|20\d{2})`;

/** "section 188 of the Housing Act 1996" */
const SECTION_FIRST = new RegExp(
  String.raw`\bs(?:ection|s)?\.?\s*(\d{1,4}[A-Z]{0,2})\s+of\s+the\s+(${ACT_NAME})`,
  'g',
);

/** "Housing Act 1996, s 188" and bare "Equality Act 2010" */
const ACT_FIRST = new RegExp(
  String.raw`(${ACT_NAME})(?:\s*,?\s*(?:s(?:ection|s)?\.?)\s*(\d{1,4}[A-Z]{0,2}))?`,
  'g',
);

/** Sentence openers that sit in front of a case name in prose. */
const OPENERS = new Set([
  'see', 'also', 'compare', 'cf', 'following', 'applying', 'but', 'and', 'in',
  'at', 'under', 'pursuant', 'citing', 'held', 'approved', 'distinguished',
  'considered', 'the', 'a', 'an', 'per', 'further', 'contrary', 'accordingly',
  'relies', 'relied',
]);

/** A citation never begins with a lowercase word. Drop any that lead. */
function trimToCapital(phrase: string): string {
  const words = phrase.split(/\s+/);
  while (words.length > 1 && !/^[A-Z]/.test(words[0])) words.shift();
  return words.join(' ');
}

/** Drops capitalised sentence openers too, e.g. "Compare Smith v Jones". */
function trimName(phrase: string): string {
  const words = trimToCapital(phrase).split(/\s+/);
  while (words.length > 1 && OPENERS.has(words[0].toLowerCase().replace(/[^a-z]/g, ''))) {
    words.shift();
  }
  return trimToCapital(words.join(' '));
}

/** Scans backwards from a neutral citation for an "X v Y" party name. */
function findCaseName(text: string, index: number): string | undefined {
  const window = text.slice(Math.max(0, index - 140), index);
  const match = window.match(
    /([A-Za-z'’.\-()]+(?:\s+[A-Za-z'’.\-()&]+){0,8}\s+v\s+[A-Z][A-Za-z'’.\-()]*(?:\s+[A-Za-z'’.\-()&]+){0,8})\s*$/,
  );
  if (!match) return undefined;
  const trimmed = trimName(match[1].trim());
  return / v /.test(trimmed) && /^[A-Z]/.test(trimmed) ? trimmed : undefined;
}

/** A case citation broken into its parts, for URL construction. */
export interface CaseParts {
  year: string;
  court: string;
  division?: string;
  number?: string;
  suffix?: string;
}

/** A statutory reference broken into its parts, for lookup. */
export interface StatuteParts {
  title: string;
  section?: string;
}

export interface ExtractedCitation extends Citation {
  caseParts?: CaseParts;
  statuteParts?: StatuteParts;
  /** True when the format is recognisable but incomplete, e.g. no judgment number. */
  malformed: boolean;
}

/**
 * Extracts every case and legislation citation from free text.
 * Matches are non-overlapping; earlier passes claim their ranges first.
 */
export function extractCitations(text: string): ExtractedCitation[] {
  const results: ExtractedCitation[] = [];
  const claimed: Array<[number, number]> = [];
  const overlaps = (start: number, end: number) =>
    claimed.some(([a, b]) => start < b && end > a);

  let counter = 0;
  const nextId = () => `c${++counter}`;

  for (const match of text.matchAll(NEUTRAL)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    claimed.push([start, end]);

    const [, year, court, division, number, suffix] = match;
    const name = findCaseName(text, start);

    results.push({
      id: nextId(),
      kind: 'case',
      raw: (name ? `${name} ` : '') + match[0].trim(),
      start: name ? start - name.length - 1 : start,
      end,
      malformed: !number,
      caseParts: { year, court, division, number, suffix },
    });
  }

  for (const match of text.matchAll(SECTION_FIRST)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (overlaps(start, end)) continue;
    claimed.push([start, end]);

    results.push({
      id: nextId(),
      kind: 'legislation',
      raw: match[0].trim(),
      start,
      end,
      malformed: false,
      statuteParts: { title: trimToCapital(match[2].trim()), section: match[1] },
    });
  }

  for (const match of text.matchAll(ACT_FIRST)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (overlaps(start, end)) continue;
    claimed.push([start, end]);

    results.push({
      id: nextId(),
      kind: 'legislation',
      raw: trimToCapital(match[0].trim()),
      start,
      end,
      malformed: false,
      statuteParts: {
        title: trimToCapital(match[1].trim()),
        section: match[2],
      },
    });
  }

  return results.sort((a, b) => a.start - b.start);
}

/**
 * Maps a neutral citation to its Find Case Law path.
 * Returns undefined when the citation lacks a judgment number.
 */
export function findCaseLawPath(parts: CaseParts): string | undefined {
  if (!parts.number) return undefined;
  const court = parts.court.toLowerCase();
  const segments: string[] = [court];

  if (parts.division) segments.push(parts.division.toLowerCase());
  else if (parts.suffix && (court === 'ewhc' || court === 'ukut' || court === 'ukftt')) {
    segments.push(parts.suffix.toLowerCase());
  }

  segments.push(parts.year, parts.number);
  return segments.join('/');
}
