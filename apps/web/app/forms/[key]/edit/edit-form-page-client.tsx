'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { RefreshCcw } from 'lucide-react';

import { decompile, type FormConfig } from '@/app/forms/new/compile';
import { NewFormBuilderClient } from '@/app/forms/new/new-form-builder-client';
import { CreatorAppShell } from '@/components/creator-app-shell';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getFormVersion } from '@/lib/forms-api';
import { formsKeys } from '@/lib/query-keys';

export function EditFormPageClient({ formKey, version }: { formKey: string; version: number }) {
  const validVersion = Number.isInteger(version) && version > 0;
  const { data, error, isError, isLoading, refetch } = useQuery({
    enabled: validVersion,
    queryKey: formsKeys.version(formKey, version),
    queryFn: () => getFormVersion(formKey, version),
  });

  if (!validVersion) {
    return (
      <CreatorAppShell active="forms">
        <main className="min-h-screen px-8 py-7">
          <Alert variant="destructive">
            <AlertTitle>Draft version is missing</AlertTitle>
            <AlertDescription>
              Open a specific draft version from the form manage page.
            </AlertDescription>
            <AlertAction>
              <Button asChild size="sm" variant="outline">
                <Link href={`/forms/${formKey}`}>Back to form</Link>
              </Button>
            </AlertAction>
          </Alert>
        </main>
      </CreatorAppShell>
    );
  }

  if (isLoading) {
    return (
      <CreatorAppShell active="forms">
        <main className="flex min-h-screen flex-col gap-6 px-8 py-7">
          <Card className="rounded">
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-8 w-80 max-w-full" />
              <Skeleton className="h-5 w-[34rem] max-w-full" />
              <Skeleton className="h-56 w-full" />
            </CardContent>
          </Card>
        </main>
      </CreatorAppShell>
    );
  }

  if (isError || !data) {
    return (
      <CreatorAppShell active="forms">
        <main className="min-h-screen px-8 py-7">
          <Alert variant="destructive">
            <AlertTitle>Draft could not be loaded</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Try again to refresh this draft.'}
            </AlertDescription>
            <AlertAction>
              <Button onClick={() => refetch()} size="sm" variant="outline">
                <RefreshCcw data-icon="inline-start" />
                Retry
              </Button>
            </AlertAction>
          </Alert>
        </main>
      </CreatorAppShell>
    );
  }

  if (data.status !== 'DRAFT') {
    return (
      <CreatorAppShell active="forms">
        <main className="min-h-screen px-8 py-7">
          <Alert variant="destructive">
            <AlertTitle>Version is not editable</AlertTitle>
            <AlertDescription>
              Version {data.version} is {data.status.toLowerCase()} and cannot be edited directly.
              Create a new draft from the manage page instead.
            </AlertDescription>
            <AlertAction>
              <Button asChild size="sm" variant="outline">
                <Link href={`/forms/${formKey}`}>Back to form</Link>
              </Button>
            </AlertAction>
          </Alert>
        </main>
      </CreatorAppShell>
    );
  }

  const initialValue = decompile({
    schema: data.schema as FormConfig['schema'],
    uiSchema: readUiSchema(data.uiSchema),
  });

  return (
    <NewFormBuilderClient
      cancelHref={`/forms/${formKey}`}
      draftIdentity={{ key: formKey, version: data.version }}
      initialValue={initialValue}
      key={`${data.id}:${data.updatedAt}`}
    />
  );
}

function readUiSchema(value: unknown): FormConfig['uiSchema'] {
  return value && typeof value === 'object' ? (value as FormConfig['uiSchema']) : {};
}
