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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  createDraftVersion,
  getManageForm,
  listFormVersions,
  listSubmissions,
  type FormVersionSummaryResponse,
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
  const {
    data: versions,
    error: versionsError,
    isLoading: versionsLoading,
    refetch: refetchVersions,
  } = useQuery({
    queryKey: formsKeys.versions(formKey),
    queryFn: () => listFormVersions(formKey),
  });
  const publishMutation = useMutation({
    mutationFn: publishVersion,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: formsKeys.latest(formKey) }),
        queryClient.invalidateQueries({ queryKey: formsKeys.versions(formKey) }),
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
                  void refetchVersions();
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
            versions={versions}
            versionsError={versionsError}
            versionsLoading={versionsLoading}
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
  versions,
  versionsError,
  versionsLoading,
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
  versions?: FormVersionSummaryResponse[];
  versionsError: Error | null;
  versionsLoading: boolean;
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
            <LiveFormLinkButton formKey={form.key} />
          ) : (
            <Button disabled variant="outline">
              <ExternalLink data-icon="inline-start" />
              No live form
            </Button>
          )}
          {form.version.status === 'DRAFT' ? (
            <EditDraftLinkButton formKey={form.key} version={form.version.version} />
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

      <VersionHistory
        formKey={form.key}
        latestVersion={form.version.version}
        publishedVersion={form.publishedVersion}
        versions={versions}
        error={versionsError}
        loading={versionsLoading}
      />

      <SubmissionResponseViewer
        error={submissionsError}
        fields={fields}
        loading={submissionsLoading}
        submissions={submissions}
      />
    </>
  );
}

function VersionHistory({
  error,
  formKey,
  latestVersion,
  loading,
  publishedVersion,
  versions,
}: {
  error: Error | null;
  formKey: string;
  latestVersion: number;
  loading: boolean;
  publishedVersion: number | null;
  versions?: FormVersionSummaryResponse[];
}) {
  const ordered = versions?.slice().sort((a, b) => b.version - a.version) ?? [];

  return (
    <Card aria-labelledby="version-history-title" className="rounded" role="region">
      <CardHeader className="border-b">
        <CardTitle className="text-xl" id="version-history-title">
          Version history
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Track drafts and published versions without exposing the underlying configuration.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <output className="block space-y-3 p-6" aria-label="Loading versions">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-5/6" />
            <Skeleton className="h-5 w-2/3" />
          </output>
        ) : error ? (
          <Alert className="m-6" variant="destructive">
            <AlertTitle>Version history could not be loaded</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : ordered.length > 0 ? (
          <div className="divide-y">
            {ordered.map((version) => (
              <VersionHistoryRow
                formKey={formKey}
                isCurrentLive={publishedVersion === version.version}
                isLatest={latestVersion === version.version}
                key={version.id}
                version={version}
              />
            ))}
          </div>
        ) : (
          <div className="px-6 py-10 text-muted-foreground">No versions have been created yet.</div>
        )}
      </CardContent>
    </Card>
  );
}

function VersionHistoryRow({
  formKey,
  isCurrentLive,
  isLatest,
  version,
}: {
  formKey: string;
  isCurrentLive: boolean;
  isLatest: boolean;
  version: FormVersionSummaryResponse;
}) {
  const status = formatStatus(version.status);
  const dateLabel =
    version.status === 'PUBLISHED' && version.publishedAt
      ? `Published ${formatDateDistance(version.publishedAt)}`
      : `Created ${formatDateDistance(version.createdAt)}`;

  return (
    <article
      aria-label={`Version v${version.version}`}
      className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold tracking-normal">v{version.version}</h2>
          <FormStatusBadge status={status} />
          {isLatest ? <VersionMarker tone="muted">Latest</VersionMarker> : null}
          {isCurrentLive ? <VersionMarker tone="success">Current live</VersionMarker> : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {version.fieldCount} {version.fieldCount === 1 ? 'field' : 'fields'} ·{' '}
          {version.requiredCount} required · {dateLabel}
        </p>
      </div>

      <VersionHistoryAction
        formKey={formKey}
        isCurrentLive={isCurrentLive}
        status={version.status}
        version={version.version}
      />
    </article>
  );
}

function VersionMarker({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: 'muted' | 'success';
}) {
  const toneClass =
    tone === 'success' ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground';

  return <span className={`rounded px-2 py-1 text-xs font-medium ${toneClass}`}>{children}</span>;
}

function VersionHistoryAction({
  formKey,
  isCurrentLive,
  status,
  version,
}: {
  formKey: string;
  isCurrentLive: boolean;
  status: FormVersionSummaryResponse['status'];
  version: number;
}) {
  if (status === 'DRAFT') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <EditDraftLinkButton formKey={formKey} size="sm" version={version} />
      </div>
    );
  }

  if (isCurrentLive) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <LiveFormLinkButton formKey={formKey} size="sm" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Immutable</span>
    </div>
  );
}

function LiveFormLinkButton({ formKey, size }: { formKey: string; size?: 'default' | 'sm' }) {
  return (
    <Button asChild size={size} variant="outline">
      <Link href={`/f/${formKey}`}>
        <ExternalLink data-icon="inline-start" />
        Open live form
      </Link>
    </Button>
  );
}

function EditDraftLinkButton({
  formKey,
  size,
  version,
}: {
  formKey: string;
  size?: 'default' | 'sm';
  version: number;
}) {
  return (
    <Button asChild size={size} variant="outline">
      <Link href={`/forms/${formKey}/edit?version=${version}`}>
        <Edit3 data-icon="inline-start" />
        Edit draft
      </Link>
    </Button>
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

function formatStatus(status: FormVersionSummaryResponse['status']) {
  return status === 'PUBLISHED' ? 'Published' : status === 'ARCHIVED' ? 'Archived' : 'Draft';
}

function formatDateDistance(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return formatDistanceToNow(date, { addSuffix: true });
}
