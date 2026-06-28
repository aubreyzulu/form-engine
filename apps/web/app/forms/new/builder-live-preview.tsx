'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';

import { DynamicField } from '@/app/f/[key]/dynamic-field';
import type { FormValues } from '@/app/f/[key]/fill-form-types';
import { defaultValuesFor, getRenderFields } from '@/app/f/[key]/fill-form-utils';
import { compileForm } from '@/app/forms/new/compile';
import type { BuilderField } from '@/app/forms/new/field-types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FieldGroup } from '@/components/ui/field';

export function BuilderLivePreview({
  description,
  fields,
  name,
  onOpenChange,
  open,
}: {
  description: string;
  fields: BuilderField[];
  name: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const config = useMemo(
    () => compileForm(name.trim() || 'Untitled form', description, fields),
    [description, fields, name],
  );
  const renderFields = useMemo(
    () => getRenderFields(config.schema, config.uiSchema),
    [config.schema, config.uiSchema],
  );
  const form = useForm<FormValues>({
    defaultValues: defaultValuesFor(renderFields),
  });

  useEffect(() => {
    form.reset(defaultValuesFor(renderFields));
  }, [form, renderFields]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{name.trim() || 'Untitled form'}</DialogTitle>
          <DialogDescription>
            {description.trim() || 'Preview how respondents will experience this form.'}
          </DialogDescription>
        </DialogHeader>

        {renderFields.length > 0 ? (
          <div className="space-y-6">
            <FieldGroup>
              {renderFields.map((field) => (
                <DynamicField
                  control={form.control}
                  error={form.formState.errors[field.key]}
                  field={field}
                  key={field.key}
                  register={form.register}
                />
              ))}
            </FieldGroup>
            <Button disabled type="button">
              Submit response
            </Button>
          </div>
        ) : (
          <div className="rounded border border-dashed px-4 py-8 text-sm text-muted-foreground">
            Add at least one field to preview the respondent form.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
