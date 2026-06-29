'use client';

import { Plus, X } from 'lucide-react';

import {
  findDuplicateOptionValues,
  type FieldSettingsDraft,
} from '@/app/forms/new/field-settings-state';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function parseNumber(value: string): number | undefined {
  if (value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseLength(value: string): number | undefined {
  const parsed = parseNumber(value);
  if (parsed === undefined) return undefined;
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

export function FieldSettingsValidation({
  draft,
  hasInvalidRange,
  onOptionAdded,
  onOptionLabelChange,
  onOptionRemove,
  onOptionValueChange,
  onPatch,
}: {
  draft: FieldSettingsDraft;
  hasInvalidRange: boolean;
  onOptionAdded: () => void;
  onOptionLabelChange: (id: string, label: string) => void;
  onOptionRemove: (id: string) => void;
  onOptionValueChange: (id: string, value: string) => void;
  onPatch: (patch: Partial<FieldSettingsDraft>) => void;
}) {
  switch (draft.type.id) {
    case 'short-text':
    case 'long-text':
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <Label htmlFor="field-min-length">Min length</Label>
              <Input
                aria-invalid={hasInvalidRange}
                id="field-min-length"
                min={0}
                onChange={(event) => onPatch({ minLength: parseLength(event.target.value) })}
                step={1}
                type="number"
                value={draft.minLength ?? ''}
              />
            </Field>
            <Field>
              <Label htmlFor="field-max-length">Max length</Label>
              <Input
                aria-invalid={hasInvalidRange}
                id="field-max-length"
                min={0}
                onChange={(event) => onPatch({ maxLength: parseLength(event.target.value) })}
                step={1}
                type="number"
                value={draft.maxLength ?? ''}
              />
            </Field>
          </div>
          {hasInvalidRange && (
            <p className="text-xs text-destructive">Minimum cannot be greater than maximum.</p>
          )}
        </>
      );
    case 'number':
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <Label htmlFor="field-min">Minimum</Label>
              <Input
                aria-invalid={hasInvalidRange}
                id="field-min"
                onChange={(event) => onPatch({ min: parseNumber(event.target.value) })}
                type="number"
                value={draft.min ?? ''}
              />
            </Field>
            <Field>
              <Label htmlFor="field-max">Maximum</Label>
              <Input
                aria-invalid={hasInvalidRange}
                id="field-max"
                onChange={(event) => onPatch({ max: parseNumber(event.target.value) })}
                type="number"
                value={draft.max ?? ''}
              />
            </Field>
          </div>
          {hasInvalidRange && (
            <p className="text-xs text-destructive">Minimum cannot be greater than maximum.</p>
          )}
        </>
      );
    case 'dropdown':
    case 'checkboxes':
      return (
        <OptionsEditor
          draft={draft}
          onAdd={onOptionAdded}
          onLabelChange={onOptionLabelChange}
          onRemove={onOptionRemove}
          onValueChange={onOptionValueChange}
        />
      );
    default:
      return null;
  }
}

function OptionsEditor({
  draft,
  onAdd,
  onLabelChange,
  onRemove,
  onValueChange,
}: {
  draft: FieldSettingsDraft;
  onAdd: () => void;
  onLabelChange: (id: string, label: string) => void;
  onRemove: (id: string) => void;
  onValueChange: (id: string, value: string) => void;
}) {
  const options = draft.options ?? [];
  const duplicateValues = findDuplicateOptionValues(options);

  return (
    <Field>
      <Label>Options</Label>
      <div className="grid grid-cols-[1fr_1fr_2rem] gap-2 text-xs font-medium text-muted-foreground">
        <span>Label</span>
        <span>Submitted value</span>
        <span className="sr-only">Actions</span>
      </div>
      <div className="flex flex-col gap-2">
        {options.map((option, index) => (
          <div className="grid grid-cols-[1fr_1fr_2rem] items-center gap-2" key={option.id}>
            <Input
              aria-label={`Option ${index + 1} label`}
              onChange={(event) => onLabelChange(option.id, event.target.value)}
              value={option.label}
            />
            <Input
              aria-invalid={duplicateValues.has(option.value.trim())}
              aria-label={`Option ${index + 1} submitted value`}
              onChange={(event) => onValueChange(option.id, event.target.value)}
              value={option.value}
            />
            <Button
              aria-label={`Remove option ${index + 1}`}
              disabled={options.length <= 1}
              onClick={() => onRemove(option.id)}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <X />
            </Button>
          </div>
        ))}
        <Button className="self-start" onClick={onAdd} size="sm" type="button" variant="outline">
          <Plus data-icon="inline-start" />
          Add option
        </Button>
      </div>
      {duplicateValues.size > 0 && (
        <p className="text-xs text-destructive">Submitted values must be unique.</p>
      )}
    </Field>
  );
}
