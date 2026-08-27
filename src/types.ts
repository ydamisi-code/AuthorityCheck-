/**
 * Domain types for AuthorityCheck.
 *
 * Vocabulary note: this tool reports whether a citation *resolves to a real
 * source*. It never reports whether a citation is *correct* for the proposition
 * it is cited for. Keep that distinction in every label and every string.
 */

/** What kind of authority a citation points at. */
export type CitationKind = 'case' | 'legislation';

/**
 * Outcome of resolving one citation against an official source.
 *
 * - verified:  resolved to a document on an official source
 * - notFound:  well-formed, but no matching document was returned
 * - malformed: does not match a recognised citation format, so cannot be looked up
 * - ambiguous: resolves to more than one candidate, user must choose
 * - pending:   lookup in flight
 * - error:     the source could not be reached (network, rate limit, outage)
 */
export type VerificationStatus =
  | 'verified'
  | 'notFound'
  | 'malformed'
  | 'ambiguous'
  | 'pending'
  | 'error';

/** A citation as found in the user's text, with its position for highlighting. */
export interface Citation {
  /** Stable id within a single check run. */
  id: string;
  /** The citation exactly as it appeared in the pasted text. */
  raw: string;
  kind: CitationKind;
  /** Character offsets into the submitted text. */
  start: number;
  end: number;
}

/** One candidate document when a citation is ambiguous. */
export interface Candidate {
  label: string;
  url: string;
}

/** The result of checking a single citation. */
export interface CheckResult {
  citation: Citation;
  status: VerificationStatus;
  /** Official title of the resolved document, if any. */
  resolvedTitle?: string;
  /** Canonical URL on the official source. */
  sourceUrl?: string;
  /** Which official source answered, e.g. "legislation.gov.uk". */
  sourceName?: string;
  /** Short plain-English explanation shown under the citation. */
  note?: string;
  /** Populated only when status is 'ambiguous'. */
  candidates?: Candidate[];
}

/** Top-level state of the check panel. */
export type CheckPhase = 'idle' | 'checking' | 'complete';
