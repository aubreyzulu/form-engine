'use client';

import { useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';

import { Button } from '@/components/ui/button';

import {
  type BuilderJsonApplyValue,
  type BuilderJsonConfig,
  parseBuilderJson,
} from '@/app/forms/new/builder-json';

export function FormConfigEditor({
  value,
  onApply,
}: {
  value: BuilderJsonConfig;
  onApply: (value: BuilderJsonApplyValue) => void;
}) {
  const initialJson = useMemo(() => JSON.stringify(value, null, 2), [value]);
  const [text, setText] = useState(initialJson);
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => parseBuilderJson(text), [text]);
  const isValid = result.value !== null;
  const dirty = text !== initialJson;

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const format = () => {
    try {
      setText(JSON.stringify(JSON.parse(text), null, 2));
    } catch {
      // Leave invalid JSON untouched — the error list already explains why.
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-6 py-2">
        {isValid ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-success">
            <Check className="size-3.5" />
            Valid builder JSON
          </span>
        ) : (
          <span className="text-xs font-medium text-destructive">
            {result.errors.length} issue{result.errors.length === 1 ? '' : 's'} to fix
          </span>
        )}
        <div className="flex items-center gap-2">
          <Button onClick={format} size="sm" variant="ghost">
            Format
          </Button>
          <Button onClick={copy} size="sm" variant="outline">
            {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>

      <textarea
        aria-label="Form builder JSON"
        className="min-h-[420px] w-full resize-y bg-transparent p-6 font-mono text-xs leading-relaxed outline-none"
        onChange={(event) => setText(event.target.value)}
        spellCheck={false}
        value={text}
      />

      {!isValid && (
        <ul className="space-y-1 border-t bg-destructive/5 px-6 py-4 text-xs text-destructive">
          {result.errors.map((error, index) => (
            <li className="list-inside list-disc" key={index}>
              {error}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-end gap-2 border-t px-6 py-3">
        <Button disabled={!dirty} onClick={() => setText(initialJson)} variant="outline">
          Reset
        </Button>
        <Button disabled={!isValid || !dirty} onClick={() => result.value && onApply(result.value)}>
          Apply changes
        </Button>
      </div>
    </div>
  );
}
