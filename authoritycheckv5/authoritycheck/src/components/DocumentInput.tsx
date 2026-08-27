import { useId } from 'react';

const PLACEHOLDER = `Paste a skeleton argument, essay, memo or list of authorities.

The claimant relies on R (Ayinde) v London Borough of Haringey [2025] EWHC 1383 (Admin) and on section 188 of the Housing Act 1996.`;

interface Props {
  value: string;
  onChange: (value: string) => void;
  onCheck: () => void;
  onClear: () => void;
  busy: boolean;
}

export function DocumentInput({ value, onChange, onCheck, onClear, busy }: Props) {
  const id = useId();
  const hasText = value.trim().length > 0;

  return (
    <section className="panel" aria-labelledby={`${id}-label`}>
      <label className="panel__label" htmlFor={id} id={`${id}-label`}>
        your text
      </label>
      <textarea
        id={id}
        className="panel__textarea"
        value={value}
        placeholder={PLACEHOLDER}
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="panel__footer">
        <p className="panel__count" aria-live="polite">
          {value.length.toLocaleString('en-GB')} characters
        </p>
        <div className="panel__actions">
          <button
            type="button"
            className="button button--quiet"
            onClick={onClear}
            disabled={!hasText || busy}
          >
            Clear
          </button>
          <button
            type="button"
            className="button"
            onClick={onCheck}
            disabled={!hasText || busy}
          >
            {busy ? 'Checking…' : 'Check citations'}
          </button>
        </div>
      </div>
    </section>
  );
}
