import { useRef, useState } from 'react';
import { DocumentInput } from './components/DocumentInput';
import { ResultsList } from './components/ResultsList';
import { Placeholder } from './components/Placeholder';
import { checkDocument } from './lib/verify';
import type { CheckPhase, CheckResult } from './types';

export default function App() {
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<CheckPhase>('idle');
  const [results, setResults] = useState<CheckResult[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  async function runCheck() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPhase('checking');
    setResults([]);

    await checkDocument(text, setResults, controller.signal);

    if (!controller.signal.aborted) setPhase('complete');
  }

  function clear() {
    abortRef.current?.abort();
    setText('');
    setResults([]);
    setPhase('idle');
  }

  const showList = results.length > 0;

  return (
    <main className="shell">
      <header className="masthead">
        <h1 className="masthead__wordmark">
          Authority<span>Check</span>
        </h1>
        <p className="masthead__lede">
          Every case and statute in your draft, checked against the official
          source it claims to come from.
        </p>
        <p className="masthead__meta">
          sources: legislation.gov.uk &middot; find case law &mdash; nothing you
          paste leaves your browser
        </p>
      </header>

      <DocumentInput
        value={text}
        onChange={setText}
        onCheck={runCheck}
        onClear={clear}
        busy={phase === 'checking'}
      />

      {phase === 'idle' && (
        <Placeholder
          title="Nothing checked yet"
          body="Paste your text above and choose Check citations. Every neutral citation and statutory reference found in it will be listed here with the official source it resolves to, or a note explaining why it did not resolve."
        />
      )}

      {phase === 'checking' && !showList && (
        <Placeholder
          title="Checking"
          body="Reading your text and looking up each citation against legislation.gov.uk and Find Case Law."
        />
      )}

      {phase === 'complete' && !showList && (
        <Placeholder
          title="No citations found"
          body="Nothing in this text matched a recognised case or legislation citation format. If you expected a match, the citation may be abbreviated or written in a way this version does not yet read."
        />
      )}

      {showList && <ResultsList results={results} />}

      <aside className="notice">
        <p>
          <strong>
            Verified means the source exists. It does not mean you are right.
          </strong>{' '}
          A real judgment cited for a proposition it does not support is still a
          mistake, and no automated check can catch that. Read what you cite.
        </p>
        <p>
          AuthorityCheck reports what official sources return. It is not legal
          advice and it is not a substitute for your own verification.
          Legislation content is Crown copyright, reproduced under the Open
          Government Licence. Judgment data comes from Find Case Law under the
          Open Justice Licence.
        </p>
      </aside>
    </main>
  );
}
