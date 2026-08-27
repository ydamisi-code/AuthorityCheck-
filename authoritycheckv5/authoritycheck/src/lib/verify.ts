import type { CheckResult } from '../types';
import { extractCitations } from './citations';
import { verifyStatute } from './legislation';
import { verifyCase } from './caselaw';

/** Keeps us well inside polite request rates for two public services. */
const CONCURRENCY = 4;

/**
 * Extracts every citation from the text and verifies each one.
 * Results stream back through onProgress so long documents fill in as they go.
 */
export async function checkDocument(
  text: string,
  onProgress: (results: CheckResult[]) => void,
  signal?: AbortSignal,
): Promise<CheckResult[]> {
  const citations = extractCitations(text);

  const results: CheckResult[] = citations.map((citation) => ({
    citation,
    status: 'pending',
  }));

  onProgress([...results]);

  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < citations.length) {
      const index = cursor++;
      const found = citations[index];

      let result: CheckResult;
      if (found.kind === 'case' && found.caseParts) {
        result = await verifyCase(found, found.caseParts, signal);
      } else if (found.kind === 'legislation' && found.statuteParts) {
        result = await verifyStatute(found, found.statuteParts, signal);
      } else {
        result = { citation: found, status: 'malformed', note: 'Not a recognised citation format.' };
      }

      results[index] = result;
      onProgress([...results]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, citations.length) }, worker),
  );

  return results;
}
