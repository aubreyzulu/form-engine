import { CheckCircle2 } from 'lucide-react';

import type { SubmissionState } from '@/app/f/[key]/fill-form-types';
import { formatSubmittedValue } from '@/app/f/[key]/fill-form-utils';
import { Card, CardContent } from '@/components/ui/card';
import type { PublishedFormResponse } from '@/lib/forms-api';

export function SubmissionSuccess({
  form,
  submission,
}: {
  form: PublishedFormResponse;
  submission: SubmissionState;
}) {
  const version = submission.response.formVersion?.version ?? form.version;
  return (
    <Card className="rounded">
      <CardContent className="flex flex-col gap-5 p-8">
        <CheckCircle2 className="size-10 text-success" />
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">Response submitted</h1>
          <p className="text-muted-foreground">
            Your response to {form.name} was validated against version {version}.
          </p>
        </div>
        <dl className="grid gap-3 rounded-md border bg-muted/40 p-4">
          {Object.entries(submission.data).map(([key, value]) => (
            <div className="grid gap-1 sm:grid-cols-[12rem_1fr]" key={key}>
              <dt className="font-medium">{key}</dt>
              <dd className="text-muted-foreground">{formatSubmittedValue(value)}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
