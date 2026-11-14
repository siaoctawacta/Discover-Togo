import { useState, type KeyboardEvent } from 'react';

/** Chip-style tag editor. Values are plain text; rendering never interprets HTML. */
export function TagInput({
  value, onChange, max = 15, maxLength = 30, id, invalid,
}: { value: string[]; onChange: (v: string[]) => void; max?: number; maxLength?: number; id?: string; invalid?: boolean }) {
  const [draft, setDraft] = useState('');

  function commit(raw: string) {
    const parts = raw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    for (const p of parts) if (!next.includes(p) && next.length < max) next.push(p.slice(0, maxLength));
    onChange(next);
    setDraft('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit(e.currentTarget.value);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className={`tag-input${invalid ? ' invalid' : ''}`}>
      {value.map((t) => (
        <span key={t} className="chip">
          {t}
          <button type="button" aria-label={`Remove tag ${t}`} onClick={() => onChange(value.filter((x) => x !== t))}>
            ×
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        maxLength={maxLength * 3}
        placeholder={value.length >= max ? `Max ${max} tags` : 'Type a tag and press Enter'}
        disabled={value.length >= max}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={(e) => commit(e.currentTarget.value)}
      />
    </div>
  );
}
