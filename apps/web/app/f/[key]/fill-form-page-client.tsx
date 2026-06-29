'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCcw } from 'lucide-react';

import type { SubmissionState } from '@/app/f/[key]/fill-form-types';
import { FillFormSkeleton } from '@/app/f/[key]/fill-form-skeleton';
import { FillPageShell } from '@/app/f/[key]/fill-form-shell';
import { PublicFormCard } from '@/app/f/[key]/public-form-card';
import { SubmissionSuccess } from '@/app/f/[key]/submission-success';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { getPublishedForm } from '@/lib/forms-api';
import { formsKeys } from '@/lib/query-keys';

type FillFormPageClientProps = {
  formKey: string;
};

export function FillFormPageClient({ formKey }: FillFormPageClientProps) {
  return <FillFormPageContent formKey={formKey} key={formKey} />;
}

function FillFormPageContent({ formKey }: FillFormPageClientProps) {
  const [submitted, setSubmitted] = useState<SubmissionState | null>(null);

  const {
    data: form,
    error,
    isError,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: formsKeys.published(formKey),
    queryFn: () => getPublishedForm(formKey),
  });

  if (isLoading) {
    return <FillPageShell content={<FillFormSkeleton />} />;
  }

  if (isError) {
    return (
      <FillPageShell
        content={
          <Alert variant="destructive">
            <AlertTitle>Form could not be loaded</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Try again to refresh this form.'}
            </AlertDescription>
            <AlertAction>
              <Button onClick={() => refetch()} size="sm" variant="outline">
                <RefreshCcw data-icon="inline-start" />
                Retry
              </Button>
            </AlertAction>
          </Alert>
        }
      />
    );
  }

  if (!form) return null;

  return (
    <FillPageShell
      content={
        submitted ? (
          <SubmissionSuccess form={form} submission={submitted} />
        ) : (
          <PublicFormCard
            form={form}
            key={`${form.key}-${form.version}`}
            onSubmitted={setSubmitted}
          />
        )
      }
    />
  );
}
