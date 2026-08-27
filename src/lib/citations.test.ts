import { describe, expect, it } from 'vitest';
import { extractCitations, findCaseLawPath } from './citations';

describe('extractCitations', () => {
  it('extracts a neutral citation with its party names', () => {
    const [c] = extractCitations(
      'The claimant relies on R (Ayinde) v London Borough of Haringey [2025] EWHC 1383 (Admin).',
    );
    expect(c.kind).toBe('case');
    expect(c.raw).toBe('R (Ayinde) v London Borough of Haringey [2025] EWHC 1383 (Admin)');
    expect(c.malformed).toBe(false);
    expect(c.caseParts).toMatchObject({ year: '2025', court: 'EWHC', number: '1383', suffix: 'Admin' });
  });

  it('does not swallow the prose leading up to a case name', () => {
    const [c] = extractCitations('See also Donoghue v Stevenson [1932] UKHL 100.');
    expect(c.raw).toBe('Donoghue v Stevenson [1932] UKHL 100');
  });

  it('flags a neutral citation with no judgment number as malformed', () => {
    const [c] = extractCitations('Re X [2019] UKSC is relied on.');
    expect(c.malformed).toBe(true);
    expect(c.caseParts?.number).toBeUndefined();
  });

  it('reads Court of Appeal divisions', () => {
    const [c] = extractCitations('Smith v Jones [2023] EWCA Civ 412');
    expect(c.caseParts).toMatchObject({ court: 'EWCA', division: 'Civ', number: '412' });
  });

  it('extracts "section N of the X Act YYYY"', () => {
    const [c] = extractCitations('It turns on section 188 of the Housing Act 1996.');
    expect(c.kind).toBe('legislation');
    expect(c.statuteParts).toEqual({ title: 'Housing Act 1996', section: '188' });
  });

  it('extracts "X Act YYYY, s N"', () => {
    const [c] = extractCitations('See the Legal Services Act 2007, s 12.');
    expect(c.statuteParts).toEqual({ title: 'Legal Services Act 2007', section: '12' });
  });

  it('extracts a bare Act with no section', () => {
    const [c] = extractCitations('Also the Equality Act 2010 applies.');
    expect(c.statuteParts).toEqual({ title: 'Equality Act 2010', section: undefined });
  });

  it('handles s.6 shorthand', () => {
    const [c] = extractCitations('Consider s.6 of the Human Rights Act 1998.');
    expect(c.statuteParts).toEqual({ title: 'Human Rights Act 1998', section: '6' });
  });

  it('does not run an Act title backwards through prose', () => {
    // Regression: "Reserved legal activities are defined by the Legal Services
    // Act 2007" used to produce a title starting at "Reserved", which could
    // never resolve against legislation.gov.uk.
    const [c] = extractCitations(
      'Reserved legal activities are defined by the Legal Services Act 2007, s 12.',
    );
    expect(c.statuteParts?.title).toBe('Legal Services Act 2007');
    expect(c.raw).toBe('Legal Services Act 2007, s 12');
  });

  it('does not include lowercase prose in a case name', () => {
    // Regression: "The claimant further relies on Cartwright v ..." used to
    // display with "further relies on" attached to the party name.
    const [c] = extractCitations(
      'The claimant further relies on Cartwright v Secretary of State for Housing [2023] EWCA Civ 9999.',
    );
    expect(c.raw).toBe('Cartwright v Secretary of State for Housing [2023] EWCA Civ 9999');
  });

  it('does not double-count an Act inside a section-first match', () => {
    const results = extractCitations('section 188 of the Housing Act 1996');
    expect(results).toHaveLength(1);
  });

  it('returns citations in document order', () => {
    const results = extractCitations(
      'First the Equality Act 2010, then Smith v Jones [2023] EWCA Civ 412.',
    );
    expect(results.map((r) => r.kind)).toEqual(['legislation', 'case']);
  });

  it('finds nothing in text with no citations', () => {
    expect(extractCitations('There are no authorities in this sentence.')).toHaveLength(0);
  });
});

describe('findCaseLawPath', () => {
  it('maps a High Court citation with a division suffix', () => {
    expect(findCaseLawPath({ year: '2025', court: 'EWHC', number: '1383', suffix: 'Admin' }))
      .toBe('ewhc/admin/2025/1383');
  });

  it('maps a Supreme Court citation', () => {
    expect(findCaseLawPath({ year: '2019', court: 'UKSC', number: '41' })).toBe('uksc/2019/41');
  });

  it('maps a Court of Appeal citation', () => {
    expect(findCaseLawPath({ year: '2023', court: 'EWCA', division: 'Civ', number: '412' }))
      .toBe('ewca/civ/2023/412');
  });

  it('returns undefined without a judgment number', () => {
    expect(findCaseLawPath({ year: '2019', court: 'UKSC' })).toBeUndefined();
  });
});
