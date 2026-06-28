'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  CheckCircle2,
  FileText,
  MoreVertical,
  Plus,
  RefreshCcw,
  type LucideIcon,
} from 'lucide-react';

import { CreatorAppShell } from '@/components/creator-app-shell';
import { FormStatusBadge } from '@/components/form-status-badge';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { type FormListResponseItem, listForms } from '@/lib/forms-api';
import { toFormListItem, type FormListItem } from '@/lib/form-list';
import { formsKeys } from '@/lib/query-keys';

type DashboardStat = {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone: 'success' | 'neutral';
};

export function DashboardPageClient() {
  const {
    data: queryForms,
    error,
    isError,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: formsKeys.list(),
    queryFn: listForms,
  });

  const forms = queryForms ?? [];
  const dashboardForms = forms.map(toFormListItem);
  const stats = buildStats(forms);
  const chartRows = dashboardForms
    .toSorted((a, b) => b.submissions - a.submissions)
    .slice(0, 5)
    .map((form) => ({ name: form.name, value: form.submissions }));
  const maxSubmissions = Math.max(0, ...chartRows.map((row) => row.value));
  const recentForms = dashboardForms.slice(0, 5);

  return (
    <CreatorAppShell active="dashboard">
      <main className="flex min-h-screen flex-col gap-5 px-8 py-7">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-semibold leading-tight tracking-normal">Dashboard</h1>
            <p className="text-base text-muted-foreground">
              Overview of your forms and submissions.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/forms/new">
                Create form
                <Plus data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </header>

        {isError ? (
          <Alert variant="destructive">
            <AlertTitle>Dashboard could not be loaded</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Try again to refresh the dashboard.'}
            </AlertDescription>
            <AlertAction>
              <Button onClick={() => refetch()} size="sm" variant="outline">
                <RefreshCcw data-icon="inline-start" />
                Retry
              </Button>
            </AlertAction>
          </Alert>
        ) : isLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              {stats.map((stat) => (
                <StatCard key={stat.label} stat={stat} />
              ))}
            </section>

            <Card className="rounded">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-xl">Submissions by form</CardTitle>
                <span className="text-sm text-muted-foreground">All time</span>
              </CardHeader>
              <CardContent>
                {chartRows.length > 0 ? (
                  <SubmissionsChart maxSubmissions={maxSubmissions} rows={chartRows} />
                ) : (
                  <EmptyDashboardMessage message="Create and publish a form to start seeing submissions." />
                )}
              </CardContent>
            </Card>

            <Card className="rounded">
              <CardHeader className="border-b">
                <CardTitle className="text-xl">Recent forms</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {recentForms.length > 0 ? (
                  <RecentFormsTable forms={recentForms} />
                ) : (
                  <EmptyDashboardMessage message="No forms have been created yet." />
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </CreatorAppShell>
  );
}

function StatCard({ stat }: { stat: DashboardStat }) {
  const Icon = stat.icon;
  const isSuccess = stat.tone === 'success';

  return (
    <Card className="rounded py-6">
      <CardContent className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-4">
          <span className="text-base font-medium">{stat.label}</span>
          <div className="flex flex-col gap-2">
            <span className="text-4xl font-semibold leading-none">{stat.value}</span>
            <span className="text-sm text-muted-foreground">{stat.helper}</span>
          </div>
        </div>
        <span
          className={
            isSuccess
              ? 'flex size-14 items-center justify-center rounded-full bg-success/15 text-success'
              : 'flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground'
          }
        >
          <Icon />
        </span>
      </CardContent>
    </Card>
  );
}

function SubmissionsChart({
  maxSubmissions,
  rows,
}: {
  maxSubmissions: number;
  rows: Array<{ name: string; value: number }>;
}) {
  return (
    <div className="grid grid-cols-[minmax(140px,220px)_1fr] gap-x-6 gap-y-7 pt-2">
      {rows.map((row) => {
        const width = maxSubmissions === 0 ? 0 : (row.value / maxSubmissions) * 100;

        return (
          <div className="contents" key={row.name}>
            <div className="flex h-7 items-center justify-end truncate text-sm text-muted-foreground">
              {row.name}
            </div>
            <div className="relative h-7">
              <div className="absolute inset-y-0 left-0 right-12 grid grid-cols-5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <span className="border-l border-dashed" key={index} />
                ))}
              </div>
              <div className="relative flex h-full items-center gap-3">
                <span className="h-5 rounded-sm bg-primary" style={{ width: `${width}%` }} />
                <span className="text-sm font-medium">{row.value}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecentFormsTable({ forms }: { forms: FormListItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="h-11 px-6">Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Version</TableHead>
          <TableHead>Submissions</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {forms.map((form) => (
          <TableRow key={form.key}>
            <TableCell className="px-6 py-4">
              <Link
                className="font-medium underline-offset-4 hover:text-primary hover:underline"
                href={`/forms/${form.key}`}
              >
                {form.name}
              </Link>
            </TableCell>
            <TableCell>
              <FormStatusBadge status={form.status} />
            </TableCell>
            <TableCell>{form.version}</TableCell>
            <TableCell>{form.submissions}</TableCell>
            <TableCell className="text-muted-foreground">{form.updated}</TableCell>
            <TableCell>
              <Button aria-label={`Actions for ${form.name}`} size="icon" variant="ghost">
                <MoreVertical />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DashboardSkeleton() {
  return (
    <output className="flex flex-col gap-5" aria-label="Loading dashboard">
      <section className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Card className="rounded py-6" key={index}>
            <CardContent className="space-y-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-4 w-44" />
            </CardContent>
          </Card>
        ))}
      </section>
      <Card className="rounded">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-5">
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-4/5" />
          <Skeleton className="h-7 w-2/3" />
        </CardContent>
      </Card>
      <Card className="rounded">
        <CardHeader>
          <Skeleton className="h-6 w-36" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
        </CardContent>
      </Card>
    </output>
  );
}

function EmptyDashboardMessage({ message }: { message: string }) {
  return <div className="px-6 py-10 text-center text-muted-foreground">{message}</div>;
}

function buildStats(forms: FormListResponseItem[]): DashboardStat[] {
  const publishedCount = forms.filter((form) => form.status === 'PUBLISHED').length;
  const draftCount = forms.filter((form) => form.status !== 'PUBLISHED').length;
  const submissionCount = forms.reduce((total, form) => total + form.submissionCount, 0);

  return [
    {
      label: 'Published forms',
      value: String(publishedCount),
      helper: 'Live and collecting responses',
      icon: CheckCircle2,
      tone: 'success',
    },
    {
      label: 'Draft forms',
      value: String(draftCount),
      helper: 'Not yet published',
      icon: FileText,
      tone: 'neutral',
    },
    {
      label: 'Total submissions',
      value: String(submissionCount),
      helper: 'Across all forms',
      icon: BarChart3,
      tone: submissionCount > 0 ? 'success' : 'neutral',
    },
  ];
}
