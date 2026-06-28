'use client';

import { useReducer } from 'react';

import { FieldSettingsBasicDetails } from '@/app/forms/new/field-settings-basic-details';
import {
  createFieldSettingsState,
  fieldSettingsReducer,
  hasInvalidOptions,
  hasInvalidValidationRange,
  toBuilderField,
} from '@/app/forms/new/field-settings-state';
import { FieldSettingsValidation } from '@/app/forms/new/field-settings-validation';
import type { BuilderField } from '@/app/forms/new/field-types';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';

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
  const [{ draft }, dispatch] = useReducer(fieldSettingsReducer, field, createFieldSettingsState);
  const hasInvalidRange = hasInvalidValidationRange(draft);
  const canApply = !hasInvalidOptions(draft) && !hasInvalidRange;

  return (
    <>
      <SheetHeader className="border-b">
        <SheetTitle>Field settings</SheetTitle>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
        <FieldSettingsBasicDetails
          draft={draft}
          onLabelChange={(label) => dispatch({ type: 'patch', patch: { label } })}
          onRequiredChange={(required) => dispatch({ type: 'patch', patch: { required } })}
          onTypeChange={(typeId) => dispatch({ type: 'typeChanged', typeId })}
        />

        <Separator />

        <section className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold">Validation</h3>

          <FieldSettingsValidation
            draft={draft}
            hasInvalidRange={hasInvalidRange}
            onOptionAdded={() => dispatch({ type: 'optionAdded' })}
            onOptionLabelChange={(id, label) => dispatch({ type: 'optionLabelChanged', id, label })}
            onOptionRemove={(id) => dispatch({ type: 'optionRemoved', id })}
            onOptionValueChange={(id, value) => dispatch({ type: 'optionValueChanged', id, value })}
            onPatch={(patch) => dispatch({ type: 'patch', patch })}
          />

          <Field>
            <Label htmlFor="field-helper">Helper text</Label>
            <Input
              id="field-helper"
              onChange={(event) =>
                dispatch({ type: 'patch', patch: { helperText: event.target.value } })
              }
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
              onChange={(event) =>
                dispatch({ type: 'patch', patch: { placeholder: event.target.value } })
              }
              placeholder="e.g. 0-100"
              value={draft.placeholder ?? ''}
            />
          </Field>
        </section>
      </div>

      <SheetFooter className="flex-row justify-end border-t">
        <Button onClick={onCancel} variant="outline">
          Cancel
        </Button>
        <Button disabled={!canApply} onClick={() => onApply(toBuilderField(draft))}>
          Apply changes
        </Button>
      </SheetFooter>
    </>
  );
}
