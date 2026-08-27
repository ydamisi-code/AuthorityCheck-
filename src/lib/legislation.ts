import type { CheckResult, Citation } from '../types';
import type { StatuteParts } from './citations';

/**
 * legislation.gov.uk lookups.
 *
 * The API is documented at https://legislation.github.io/data-documentation/.
 * Appending /data.feed to a search or list URI returns Atom; appending
 * /data.xml to a provision URI returns CLML. CORS is enabled on /data.*
 * endpoints only, which is why this runs in the browser with no backend.
 */

const BASE = 'https://www.legislation.gov.uk';
const SOURCE = 'legislation.gov.uk';

interface ActMatch {
  title: string;
  /** e.g. "ukpga/1996/52" */
  path: string;
}

/** Pulls the /type/year/number path out of a legislation.gov.uk id URI. */
function pathFromId(id: string): string | undefined {
  const match = id.match(/\/id\/([a-z]+(?:-[a-z]+)?)\/(\d{4})\/(\d+)/);
  return match ? `${match[1]}/${match[2]}/${match[3]}` : undefined;
}

/** Searches the Atom feed for Acts whose title matches exactly. */
async function resolveAct(title: string, signal?: AbortSignal): Promise<ActMatch[]> {
  const url = `${BASE}/all/data.feed?title=${encodeURIComponent(title)}&results-count=50`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`legislation.gov.uk returned ${response.status}`);

  const doc = new DOMParser().parseFromString(await response.text(), 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Could not read the search feed');

  const wanted = title.toLowerCase().replace(/\s+/g, ' ').trim();
  const seen = new Set<string>();
  const matches: ActMatch[] = [];

  for (const entry of Array.from(doc.getElementsByTagName('entry'))) {
    const entryTitle = entry.getElementsByTagName('title')[0]?.textContent?.trim() ?? '';
    if (entryTitle.toLowerCase().replace(/\s+/g, ' ') !== wanted) continue;

    const id = entry.getElementsByTagName('id')[0]?.textContent ?? '';
    const path = pathFromId(id);
    if (!path || seen.has(path)) continue;

    seen.add(path);
    matches.push({ title: entryTitle, path });
  }

  return matches;
}

/** Checks whether a given section exists in a resolved Act. */
async function sectionExists(path: string, section: string, signal?: AbortSignal): Promise<boolean> {
  const response = await fetch(`${BASE}/${path}/section/${section}/data.xml`, { signal });
  return response.ok;
}

/**
 * Verifies one statutory reference. Never throws: transport problems come back
 * as status 'error' so the UI can say the source was unreachable rather than
 * implying the citation is wrong.
 */
export async function verifyStatute(
  citation: Citation,
  parts: StatuteParts,
  signal?: AbortSignal,
): Promise<CheckResult> {
  try {
    const matches = await resolveAct(parts.title, signal);

    if (matches.length === 0) {
      return {
        citation,
        status: 'notFound',
        sourceName: SOURCE,
        note: 'No Act with this exact short title was returned. Check the title and the year. Some older or local Acts are not held in revised form.',
      };
    }

    if (matches.length > 1) {
      return {
        citation,
        status: 'ambiguous',
        sourceName: SOURCE,
        note: 'More than one item of legislation carries this title. Pick the one you meant.',
        candidates: matches.map((m) => ({
          label: `${m.title} (${m.path})`,
          url: `${BASE}/${m.path}`,
        })),
      };
    }

    const act = matches[0];

    if (!parts.section) {
      return {
        citation,
        status: 'verified',
        resolvedTitle: act.title,
        sourceName: SOURCE,
        sourceUrl: `${BASE}/${act.path}`,
        note: 'The Act exists. No section was cited, so nothing narrower was checked.',
      };
    }

    const exists = await sectionExists(act.path, parts.section, signal);

    if (!exists) {
      return {
        citation,
        status: 'notFound',
        resolvedTitle: act.title,
        sourceName: SOURCE,
        sourceUrl: `${BASE}/${act.path}`,
        note: `The Act exists but no section ${parts.section} was returned. It may be a typo, or the section may have been repealed and removed from the revised text.`,
      };
    }

    return {
      citation,
      status: 'verified',
      resolvedTitle: `${act.title}, section ${parts.section}`,
      sourceName: SOURCE,
      sourceUrl: `${BASE}/${act.path}/section/${parts.section}`,
      note: 'The section exists in the revised text. Whether that text is fully up to date is not checked in this version: legislation.gov.uk lists effects its editorial team has not yet applied.',
    };
  } catch (error) {
    return {
      citation,
      status: 'error',
      sourceName: SOURCE,
      note:
        error instanceof DOMException && error.name === 'AbortError'
          ? 'Check cancelled.'
          : 'legislation.gov.uk could not be reached, so this citation was not checked. Try again, or check it by hand.',
    };
  }
}
