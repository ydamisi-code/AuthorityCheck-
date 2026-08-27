import type { CheckResult, Citation } from '../types';
import { findCaseLawPath, type CaseParts } from './citations';

/**
 * Find Case Law lookups.
 *
 * Open question carried from planning: it is not confirmed that Find Case Law
 * permits browser-origin requests. If it does not, every call here fails CORS
 * and we report status 'error' with a link, which is honest. We never downgrade
 * an unreachable source to 'not found', because "we could not check this" and
 * "this does not exist" are completely different things to tell a lawyer.
 *
 * Reuse is under the Open Justice Licence. Per-citation lookups on user demand
 * are ordinary service use. Do not add caching or crawling without applying to
 * The National Archives for a computational analysis licence.
 */

const BASE = 'https://caselaw.nationalarchives.gov.uk';
const SOURCE = 'Find Case Law';

export async function verifyCase(
  citation: Citation,
  parts: CaseParts,
  signal?: AbortSignal,
): Promise<CheckResult> {
  const path = findCaseLawPath(parts);

  if (!path) {
    return {
      citation,
      status: 'malformed',
      note: 'A neutral citation needs a judgment number after the court abbreviation, for example [2019] UKSC 41. Nothing was looked up.',
    };
  }

  const url = `${BASE}/${path}`;

  try {
    const response = await fetch(`${url}/data.xml`, { signal });

    if (response.status === 404) {
      return {
        citation,
        status: 'notFound',
        sourceName: SOURCE,
        sourceUrl: url,
        note: 'No judgment with this neutral citation was returned. That may mean the citation is wrong, the judgment is not published on Find Case Law, or the case does not exist. Check it by hand before relying on it.',
      };
    }

    if (!response.ok) throw new Error(`Find Case Law returned ${response.status}`);

    const xml = await response.text();
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const name =
      doc.querySelector('FRBRname')?.getAttribute('value') ??
      doc.querySelector('docTitle')?.textContent?.trim();

    return {
      citation,
      status: 'verified',
      resolvedTitle: name || undefined,
      sourceName: SOURCE,
      sourceUrl: url,
      note: 'A judgment with this neutral citation exists. This tool has not checked that it supports the proposition you cited it for.',
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { citation, status: 'error', note: 'Check cancelled.' };
    }

    return {
      citation,
      status: 'error',
      sourceName: SOURCE,
      sourceUrl: url,
      note: 'The citation is well formed, but Find Case Law could not be reached from your browser, so it was not checked. Open the link to confirm the judgment exists.',
    };
  }
}
