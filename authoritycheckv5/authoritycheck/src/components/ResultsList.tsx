import type { CheckResult } from '../types';
import { StatusBadge } from './StatusBadge';

interface Props {
  results: CheckResult[];
}

function tally(results: CheckResult[]): string {
  const verified = results.filter((r) => r.status === 'verified').length;
  const flagged = results.length - verified;
  return `${results.length} found · ${verified} verified · ${flagged} need your attention`;
}

export function ResultsList({ results }: Props) {
  return (
    <section className="results" aria-labelledby="results-title">
      <div className="results__head">
        <h2 className="results__title" id="results-title">
          Citations in your text
        </h2>
        <p className="results__tally">{tally(results)}</p>
      </div>

      <ul className="results__list">
        {results.map((result, index) => (
          <li
            className="entry"
            key={result.citation.id}
            style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
          >
            <div className="entry__rail">
              <StatusBadge status={result.status} />
              <span className="entry__kind">
                {result.citation.kind === 'case' ? 'case' : 'legislation'}
              </span>
            </div>

            <div>
              <p className="entry__citation">{result.citation.raw}</p>

              {result.resolvedTitle && (
                <p className="entry__title">{result.resolvedTitle}</p>
              )}

              {result.note && <p className="entry__note">{result.note}</p>}

              {result.candidates && result.candidates.length > 0 && (
                <ul className="entry__candidates">
                  {result.candidates.map((candidate) => (
                    <li key={candidate.url}>
                      <a href={candidate.url} target="_blank" rel="noreferrer">
                        {candidate.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}

              {result.sourceUrl && (
                <a
                  className="entry__link"
                  href={result.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open on {result.sourceName} →
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
