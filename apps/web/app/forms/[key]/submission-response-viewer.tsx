'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, Eye, FileText } from 'lucide-react';

import { formatSubmittedValue } from '@/app/f/[key]/fill-form-utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { SubmissionListResponse, SubmissionResponse } from '@/lib/forms-api';

export type ResponseFieldSummary = {
  key: string;
  label: string;
};

export function SubmissionResponseViewer({
  error,
  fields,
  loading,
  submissions,
}: {
  error: Error | null;
  fields: ResponseFieldSummary[];
  loading: boolean;
  submissions?: SubmissionListResponse;
}) {
  const items = submissions?.items ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find((submission) => submission.id === selectedId) ?? items[0] ?? null;

  return (
    <Card className="rounded">
      <CardHeader className="border-b">
        <CardTitle className="text-xl">Responses</CardTitle>
        <CardDescription>
          Review every submission for this form and the version it was validated against.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <output className="block space-y-3 p-6" aria-label="Loading submissions">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-5/6" />
            <Skeleton className="h-5 w-2/3" />
          </output>
        ) : error ? (
          <Alert className="m-6" variant="destructive">
            <AlertTitle>Submissions could not be loaded</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : items.length > 0 ? (
          <div className="grid border-t-0 xl:grid-cols-[minmax(0,1.25fr)_minmax(24rem,0.75fr)]">
            <ResponseTable
              selectedId={selected?.id ?? null}
              submissions={items}
              onSelect={setSelectedId}
            />
            <ResponseDetail fields={fields} submission={selected} />
          </div>
        ) : (
          <div className="px-6 py-10 text-muted-foreground">
            No responses have been submitted yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ResponseTable({
  onSelect,
  selectedId,
  submissions,
}: {
  onSelect: (id: string) => void;
  selectedId: string | null;
  submissions: SubmissionResponse[];
}) {
  return (
    <>
      <div className="divide-y md:hidden">
        {submissions.map((submission) => (
          <button
            aria-pressed={submission.id === selectedId}
            className={`flex w-full flex-col gap-3 px-4 py-4 text-left transition-colors ${
              submission.id === selectedId ? 'bg-muted/55' : 'hover:bg-muted/35'
            }`}
            key={submission.id}
            onClick={() => onSelect(submission.id)}
            type="button"
          >
            <span className="flex items-start justify-between gap-3">
              <span>
                <span className="block font-mono text-sm">{submissionReference(submission)}</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {formatDateDistance(submission.createdAt)}
                </span>
              </span>
              <Badge variant="outline">v{submission.formVersion?.version ?? '-'}</Badge>
            </span>
            <span className="line-clamp-2 text-sm text-muted-foreground">
              {formatSubmissionPreview(submission.data)}
            </span>
          </button>
        ))}
      </div>

      <div className="hidden min-w-0 overflow-x-auto md:block">
        <Table className="min-w-[44rem] table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="h-11 w-[10.5rem] px-6">Reference</TableHead>
              <TableHead className="w-[8.5rem]">Submitted</TableHead>
              <TableHead className="w-[5.5rem]">Version</TableHead>
              <TableHead>Preview</TableHead>
              <TableHead className="w-[7rem] px-6 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.map((submission) => (
              <TableRow
                className={submission.id === selectedId ? 'bg-muted/45' : undefined}
                key={submission.id}
              >
                <TableCell className="px-6 font-mono text-sm">
                  {submissionReference(submission)}
                </TableCell>
                <TableCell className="font-medium whitespace-normal">
                  {formatDateDistance(submission.createdAt)}
                </TableCell>
                <TableCell>v{submission.formVersion?.version ?? '-'}</TableCell>
                <TableCell className="min-w-0 text-muted-foreground">
                  <span className="line-clamp-2 text-sm break-words">
                    {formatSubmissionPreview(submission.data)}
                  </span>
                </TableCell>
                <TableCell className="px-6 text-right">
                  <Button
                    aria-pressed={submission.id === selectedId}
                    onClick={() => onSelect(submission.id)}
                    size="sm"
                    variant={submission.id === selectedId ? 'default' : 'outline'}
                  >
                    <Eye data-icon="inline-start" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function ResponseDetail({
  fields,
  submission,
}: {
  fields: ResponseFieldSummary[];
  submission: SubmissionResponse | null;
}) {
  if (!submission) return null;

  const rows = responseRows(fields, submission.data);

  return (
    <aside className="border-t bg-muted/20 p-6 xl:border-l xl:border-t-0">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-sm text-muted-foreground">
              {submissionReference(submission)}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-normal">Response detail</h2>
          </div>
          <Badge className="bg-success/15 text-success">
            <CheckCircle2 className="size-3.5" />
            Stored
          </Badge>
        </div>

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <DetailMetric label="Submitted" value={formatDateDistance(submission.createdAt)} />
          <DetailMetric
            label="Validated with"
            value={`Form version v${submission.formVersion?.version ?? '-'}`}
          />
        </div>

        <div className="rounded border bg-background">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h3 className="font-medium">Submitted answers</h3>
              <p className="text-sm text-muted-foreground">
                Values are shown exactly as stored after server validation.
              </p>
            </div>
            <FileText className="size-4 text-muted-foreground" />
          </div>
          <dl className="divide-y">
            {rows.map((row) => (
              <div
                className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(10rem,0.45fr)_1fr]"
                key={row.key}
              >
                <dt>
                  <span className="block font-medium">{row.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">{row.key}</span>
                </dt>
                <dd className="break-words text-muted-foreground">{row.value || '-'}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </aside>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-background px-4 py-3">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function responseRows(fields: ResponseFieldSummary[], data: unknown) {
  const record = responseRecord(data);
  const rows = fields.map((field) => ({
    key: field.key,
    label: field.label,
    value: formatSubmittedValue(record[field.key]),
  }));
  const knownKeys = new Set(fields.map((field) => field.key));
  const extraRows = Object.entries(record)
    .filter(([key]) => !knownKeys.has(key))
    .map(([key, value]) => ({
      key,
      label: key,
      value: formatSubmittedValue(value),
    }));
  return [...rows, ...extraRows];
}

function responseRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === 'object' && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

function formatDateDistance(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return formatDistanceToNow(date, { addSuffix: true });
}

function formatSubmissionPreview(data: unknown) {
  const record = responseRecord(data);
  const entries = Object.entries(record).slice(0, 3);
  if (entries.length === 0) return 'No response data';
  const preview = entries.map(([key, value]) => `${key}: ${formatSubmittedValue(value)}`);
  const remaining = Object.keys(record).length - entries.length;
  return remaining > 0 ? `${preview.join(' | ')} | +${remaining} more` : preview.join(' | ');
}

function submissionReference(submission: SubmissionResponse) {
  return `SUB-${submission.id.slice(0, 8).toUpperCase()}`;
}
