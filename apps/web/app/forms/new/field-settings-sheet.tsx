'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';

import {
  type BuilderField,
  FIELD_GROUPS,
  FIELD_TYPES,
  isOptionListType,
  transitionFieldType,
  uniqueKey,
} from '@/app/forms/new/field-types';

function parseNumber(value: string): number | undefined {
  if (value === '') return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function FieldSettingsSheet({
  field,
  onClose,
  onApply,
}: {
  field: BuilderField | null;
  onClose: () => void;
  onApply: (field: BuilderField) => void;
}) {
  return (
    <Sheet onOpenChange={(open) => !open && onClose()} open={field !== null}>
      <SheetContent className="gap-0 p-0">
        {field && (
          <FieldSettingsForm field={field} key={field.id} onApply={onApply} onCancel={onClose} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function FieldSettingsForm({
  field,
  onApply,
  onCancel,
}: {
  field: BuilderField;
  onApply: (field: BuilderField) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<BuilderField>(field);
  const update = (patch: Partial<BuilderField>) =>
    setDraft((current) => ({ ...current, ...patch }));
  const canApply = !hasInvalidOptions(draft);

  return (
    <>
      <SheetHeader className="border-b">
        <SheetTitle>Field settings</SheetTitle>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
        <section className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold">Basic details</h3>

          <Field>
            <Label htmlFor="field-label">Label</Label>
            <Input
              id="field-label"
              onChange={(event) => update({ label: event.target.value })}
              value={draft.label}
            />
          </Field>

          <Field>
            <Label htmlFor="field-type">Field type</Label>
            <Select
              onValueChange={(id) => setDraft((current) => transitionFieldType(current, id))}
              value={draft.type.id}
            >
              <SelectTrigger className="w-full" id="field-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_GROUPS.map((group) => (
                  <SelectGroup key={group}>
                    <SelectLabel>{group}</SelectLabel>
                    {FIELD_TYPES.filter((type) => type.group === group).map((type) => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={type.id} value={type.id}>
                          <Icon className="size-4 text-muted-foreground" />
                          {type.label}
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="field-required">Required</Label>
              <p className="text-xs text-muted-foreground">Respondents must provide a value.</p>
            </div>
            <Switch
              checked={draft.required}
              id="field-required"
              onCheckedChange={(checked) => update({ required: checked })}
            />
          </div>
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold">Validation</h3>

          <ValidationInputs draft={draft} update={update} />

          <Field>
            <Label htmlFor="field-helper">Helper text</Label>
            <Input
              id="field-helper"
              onChange={(event) => update({ helperText: event.target.value })}
              placeholder="Guidance shown with the field"
              value={draft.helperText ?? ''}
            />
            <p className="text-xs text-muted-foreground">
              Shown below the field on the public form.
            </p>
          </Field>
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold">Display</h3>

          <Field>
            <Label htmlFor="field-placeholder">Placeholder (optional)</Label>
            <Input
              id="field-placeholder"
              onChange={(event) => update({ placeholder: event.target.value })}
              placeholder="e.g. 0–100"
              value={draft.placeholder ?? ''}
            />
          </Field>
        </section>
      </div>

      <SheetFooter className="flex-row justify-end border-t">
        <Button onClick={onCancel} variant="outline">
          Cancel
        </Button>
        <Button disabled={!canApply} onClick={() => onApply(draft)}>
          Apply changes
        </Button>
      </SheetFooter>
    </>
  );
}

function hasInvalidOptions(field: BuilderField): boolean {
  if (!isOptionListType(field.type.id)) return false;
  const options = field.options ?? [];
  const values = options.map((option) => option.value.trim());
  return (
    options.length === 0 ||
    options.some((option) => !option.label.trim() || !option.value.trim()) ||
    values.some((value, index) => values.indexOf(value) !== index)
  );
}

function ValidationInputs({
  draft,
  update,
}: {
  draft: BuilderField;
  update: (patch: Partial<BuilderField>) => void;
}) {
  switch (draft.type.id) {
    case 'short-text':
    case 'long-text':
      return (
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <Label htmlFor="field-min-length">Min length</Label>
            <Input
              id="field-min-length"
              onChange={(event) => update({ minLength: parseNumber(event.target.value) })}
              type="number"
              value={draft.minLength ?? ''}
            />
          </Field>
          <Field>
            <Label htmlFor="field-max-length">Max length</Label>
            <Input
              id="field-max-length"
              onChange={(event) => update({ maxLength: parseNumber(event.target.value) })}
              type="number"
              value={draft.maxLength ?? ''}
            />
          </Field>
        </div>
      );
    case 'number':
      return (
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <Label htmlFor="field-min">Minimum</Label>
            <Input
              id="field-min"
              onChange={(event) => update({ min: parseNumber(event.target.value) })}
              type="number"
              value={draft.min ?? ''}
            />
          </Field>
          <Field>
            <Label htmlFor="field-max">Maximum</Label>
            <Input
              id="field-max"
              onChange={(event) => update({ max: parseNumber(event.target.value) })}
              type="number"
              value={draft.max ?? ''}
            />
          </Field>
        </div>
      );
    case 'dropdown':
    case 'checkboxes':
      return <OptionsEditor draft={draft} update={update} />;
    default:
      return null;
  }
}

function OptionsEditor({
  draft,
  update,
}: {
  draft: BuilderField;
  update: (patch: Partial<BuilderField>) => void;
}) {
  const options = draft.options ?? [];
  const normalizedValues = options.map((option) => option.value.trim());
  const duplicateValues = new Set(
    normalizedValues.filter((value, index, values) => value && values.indexOf(value) !== index),
  );

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
          <div className="grid grid-cols-[1fr_1fr_2rem] items-center gap-2" key={index}>
            <Input
              aria-label={`Option ${index + 1} label`}
              onChange={(event) =>
                update({
                  options: options.map((value, i) =>
                    i === index ? { ...value, label: event.target.value } : value,
                  ),
                })
              }
              value={option.label}
            />
            <Input
              aria-invalid={duplicateValues.has(option.value.trim())}
              aria-label={`Option ${index + 1} submitted value`}
              onChange={(event) =>
                update({
                  options: options.map((value, i) =>
                    i === index ? { ...value, value: event.target.value } : value,
                  ),
                })
              }
              value={option.value}
            />
            <Button
              aria-label={`Remove option ${index + 1}`}
              disabled={options.length <= 1}
              onClick={() => update({ options: options.filter((_, i) => i !== index) })}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <X />
            </Button>
          </div>
        ))}
        <Button
          className="self-start"
          onClick={() => {
            const label = `Option ${options.length + 1}`;
            update({
              options: [
                ...options,
                {
                  label,
                  value: uniqueKey(
                    `option${options.length + 1}`,
                    options.map((option) => option.value),
                  ),
                },
              ],
            });
          }}
          size="sm"
          type="button"
          variant="outline"
        >
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
