'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarClock,
  Edit3,
  ExternalLink,
  FileText,
  Hash,
  ListChecks,
  RefreshCcw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { SubmissionResponseViewer } from '@/app/forms/[key]/submission-response-viewer';
import { CreatorAppShell } from '@/components/creator-app-shell';
import { FormStatusBadge } from '@/components/form-status-badge';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  createDraftVersion,
  getManageForm,
  listSubmissions,
  type ManageFormResponse,
  publishVersion,
  type SubmissionListResponse,
} from '@/lib/forms-api';
import { formsKeys, submissionsKeys } from '@/lib/query-keys';
import { readString, schemaFieldRecords } from '@/lib/schema-fields';

type ManageFormPageClientProps = {
  formKey: string;
};

type FieldSummary = {
  key: string;
  label: string;
  widget: string;
  required: boolean;
};

export function ManageFormPageClient({ formKey }: ManageFormPageClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    data: form,
    error,
    isError,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: formsKeys.latest(formKey),
    queryFn: () => getManageForm(formKey),
  });
  const {
    data: submissions,
    error: submissionsError,
    isLoading: submissionsLoading,
    refetch: refetchSubmissions,
  } = useQuery({
    queryKey: submissionsKeys.byForm(formKey),
    queryFn: () => listSubmissions(formKey),
  });
  const publishMutation = useMutation({
    mutationFn: publishVersion,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: formsKeys.latest(formKey) }),
        queryClient.invalidateQueries({ queryKey: formsKeys.list() }),
        queryClient.invalidateQueries({ queryKey: formsKeys.published(formKey) }),
      ]);
    },
  });
  const createDraftMutation = useMutation({
    mutationFn: createDraftVersion,
    onSuccess: async (draft) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: formsKeys.latest(draft.key) }),
        queryClient.invalidateQueries({ queryKey: formsKeys.versions(draft.key) }),
        queryClient.invalidateQueries({ queryKey: formsKeys.list() }),
      ]);
      router.push(`/forms/${draft.key}/edit?version=${draft.version}`);
    },
  });

  return (
    <CreatorAppShell active="forms">
      <main className="flex min-h-screen flex-col gap-6 px-8 py-7">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          href="/forms"
        >
          <ArrowLeft className="size-4" />
          Forms
        </Link>

        {isLoading ? (
          <ManageFormSkeleton />
        ) : isError ? (
          <Alert variant="destructive">
            <AlertTitle>Form could not be loaded</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Try again to refresh this form.'}
            </AlertDescription>
            <AlertAction>
              <Button
                onClick={() => {
                  void refetch();
                  void refetchSubmissions();
                }}
                size="sm"
                variant="outline"
              >
                <RefreshCcw data-icon="inline-start" />
                Retry
              </Button>
            </AlertAction>
          </Alert>
        ) : form ? (
          <ManageFormContent
            form={form}
            createDraftError={createDraftMutation.error}
            isCreatingDraft={createDraftMutation.isPending}
            isPublishing={publishMutation.isPending}
            publishError={publishMutation.error}
            submissions={submissions}
            submissionsError={submissionsError}
            submissionsLoading={submissionsLoading}
            onCreateDraft={() => createDraftMutation.mutate(form.key)}
            onPublish={() =>
              publishMutation.mutate({
                key: form.key,
                version: form.version.version,
              })
            }
          />
        ) : null}
      </main>
    </CreatorAppShell>
  );
}

function ManageFormContent({
  form,
  createDraftError,
  isCreatingDraft,
  isPublishing,
  publishError,
  submissions,
  submissionsError,
  submissionsLoading,
  onCreateDraft,
  onPublish,
}: {
  form: ManageFormResponse;
  createDraftError: Error | null;
  isCreatingDraft: boolean;
  isPublishing: boolean;
  publishError: Error | null;
  submissions?: SubmissionListResponse;
  submissionsError: Error | null;
  submissionsLoading: boolean;
  onCreateDraft: () => void;
  onPublish: () => void;
}) {
  const status = form.version.status === 'PUBLISHED' ? 'Published' : 'Draft';
  const fields = summarizeFields(form.version.schema, form.version.uiSchema);
  const updatedLabel = formatDateDistance(form.version.createdAt);
  const publishedLabel = form.version.publishedAt
    ? formatDateDistance(form.version.publishedAt)
    : '-';

  return (
    <>
      <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-semibold leading-tight tracking-normal">{form.name}</h1>
            <FormStatusBadge status={status} />
          </div>
          <p className="max-w-3xl text-base text-muted-foreground">
            {form.description || 'No description has been added.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {form.publishedVersion ? (
            <Button asChild variant="outline">
              <Link href={`/f/${form.key}`}>
                <ExternalLink data-icon="inline-start" />
                Open live form
              </Link>
            </Button>
          ) : (
            <Button disabled variant="outline">
              <ExternalLink data-icon="inline-start" />
              No live form
            </Button>
          )}
          {form.version.status === 'DRAFT' ? (
            <Button asChild variant="outline">
              <Link href={`/forms/${form.key}/edit?version=${form.version.version}`}>
                <Edit3 data-icon="inline-start" />
                Edit draft
              </Link>
            </Button>
          ) : (
            <Button disabled={isCreatingDraft} onClick={onCreateDraft} variant="outline">
              <Edit3 data-icon="inline-start" />
              {isCreatingDraft ? 'Creating draft' : 'Edit as draft'}
            </Button>
          )}
          <Button disabled={form.version.status !== 'DRAFT' || isPublishing} onClick={onPublish}>
            {isPublishing ? 'Publishing' : 'Publish draft'}
          </Button>
        </div>
      </header>

      {publishError && (
        <Alert variant="destructive">
          <AlertTitle>Draft could not be published</AlertTitle>
          <AlertDescription>{publishError.message}</AlertDescription>
        </Alert>
      )}
      {createDraftError && (
        <Alert variant="destructive">
          <AlertTitle>Editable draft could not be created</AlertTitle>
          <AlertDescription>{createDraftError.message}</AlertDescription>
        </Alert>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Hash}
          label="Latest version"
          value={`v${form.version.version}`}
          detail={form.version.status}
        />
        <MetricCard
          icon={ListChecks}
          label="Fields"
          value={String(fields.length)}
          detail={`${fields.filter((field) => field.required).length} required`}
        />
        <MetricCard
          icon={FileText}
          label="Submissions"
          value={String(form.submissionCount)}
          detail="Across all versions"
        />
        <MetricCard
          icon={CalendarClock}
          label={form.version.status === 'PUBLISHED' ? 'Published' : 'Draft created'}
          value={form.version.status === 'PUBLISHED' ? publishedLabel : updatedLabel}
          detail={form.version.status === 'PUBLISHED' ? 'Current live version' : 'Not live yet'}
        />
      </section>

      <Card className="rounded">
        <CardHeader className="border-b">
          <CardTitle className="text-xl">Latest configuration</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {fields.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-11 px-6">Label</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Widget</TableHead>
                  <TableHead>Required</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field) => (
                  <TableRow key={field.key}>
                    <TableCell className="px-6 font-medium">{field.label}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {field.key}
                    </TableCell>
                    <TableCell>{field.widget}</TableCell>
                    <TableCell>
                      {field.required ? (
                        <Badge className="bg-success/15 text-success">Required</Badge>
                      ) : (
                        <span className="text-muted-foreground">Optional</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="px-6 py-10 text-muted-foreground">
              This draft does not have fields yet.
            </div>
          )}
        </CardContent>
      </Card>

      <SubmissionResponseViewer
        error={submissionsError}
        fields={fields}
        loading={submissionsLoading}
        submissions={submissions}
      />
    </>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="rounded">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function ManageFormSkeleton() {
  return (
    <output className="flex flex-col gap-6" aria-label="Loading form">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-5 w-[32rem] max-w-full" />
      </div>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card className="rounded" key={index}>
            <CardContent className="space-y-3 p-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </section>
      <Card className="rounded">
        <CardHeader className="border-b">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-2/3" />
        </CardContent>
      </Card>
    </output>
  );
}

function summarizeFields(schema: unknown, uiSchema: unknown): FieldSummary[] {
  return schemaFieldRecords(schema, uiSchema).map(({ key, property, required, uiField }) => ({
    key,
    label: readString(uiField.label) ?? key,
    widget: readString(uiField.widget) ?? readString(property.type) ?? 'custom',
    required,
  }));
}

function formatDateDistance(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return formatDistanceToNow(date, { addSuffix: true });
}
