'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

import { DynamicField } from '@/app/f/[key]/dynamic-field';
import type { FormValues, SubmissionState } from '@/app/f/[key]/fill-form-types';
import {
  buildSubmissionData,
  createSchemaResolver,
  defaultValuesFor,
  getRenderFields,
} from '@/app/f/[key]/fill-form-utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import { ApiClientError } from '@/lib/api-client';
import { type PublishedFormResponse, submitForm } from '@/lib/forms-api';
import { formsKeys, submissionsKeys } from '@/lib/query-keys';

export function PublicFormCard({
  form,
  onSubmitted,
}: {
  form: PublishedFormResponse;
  onSubmitted: (submission: SubmissionState) => void;
}) {
  const queryClient = useQueryClient();
  const fields = getRenderFields(form.schema, form.uiSchema);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    setError,
  } = useForm<FormValues>({
    defaultValues: defaultValuesFor(fields),
    resolver: createSchemaResolver(form.schema, fields),
  });

  const submitMutation = useMutation({
    mutationFn: submitForm,
    onSuccess: async (response, payload) => {
      setFormError(null);
      onSubmitted({ response, data: payload.data });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: submissionsKeys.byForm(payload.key) }),
        queryClient.invalidateQueries({ queryKey: formsKeys.list() }),
        queryClient.invalidateQueries({ queryKey: formsKeys.latest(payload.key) }),
      ]);
    },
    onError: (error) => {
      if (error instanceof ApiClientError) {
        for (const detail of error.details ?? []) {
          if (detail.field) {
            setError(detail.field, { type: 'server', message: detail.message });
          }
        }
      }
      setFormError(error instanceof Error ? error.message : 'The response could not be submitted.');
    },
  });

  const submit = handleSubmit(
    (values) => {
      setFormError(null);
      submitMutation.mutate({ key: form.key, data: buildSubmissionData(fields, values) });
    },
    () => setFormError('Fix the highlighted fields before submitting.'),
  );

  return (
    <Card className="rounded">
      <CardHeader className="gap-3 border-b">
        <div className="text-sm font-medium text-muted-foreground">Version {form.version}</div>
        <h1 className="text-3xl font-semibold">{form.name}</h1>
        {form.description && <p className="text-base text-muted-foreground">{form.description}</p>}
      </CardHeader>
      <CardContent className="p-6">
        <form className="flex flex-col gap-5" noValidate onSubmit={submit}>
          <FieldGroup>
            {fields.map((field) => (
              <DynamicField
                control={control}
                error={errors[field.key]}
                field={field}
                key={field.key}
                register={register}
              />
            ))}
          </FieldGroup>

          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <Button
            className="w-fit"
            disabled={submitMutation.isPending || fields.length === 0}
            type="submit"
          >
            {submitMutation.isPending ? 'Submitting...' : 'Submit response'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
