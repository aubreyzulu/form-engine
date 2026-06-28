'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  FileText,
  Lock,
  Plus,
  Search,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { CreatorAppShell } from '@/components/creator-app-shell';
import { FormsTable } from '@/components/forms-table';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { listForms } from '@/lib/forms-api';
import { toFormListItem } from '@/lib/form-list';
import { formsKeys } from '@/lib/query-keys';

const filterOptions = ['All', 'Draft', 'Published'] as const;
type FilterOption = (typeof filterOptions)[number];

export function FormsPageClient() {
  const [statusFilter, setStatusFilter] = useState<FilterOption>('All');
  const [query, setQuery] = useState('');
  const {
    data: queryForms,
    error,
    isError,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: formsKeys.list(),
    queryFn: listForms,
  });

  const forms = useMemo(() => {
    const source = (queryForms ?? []).map(toFormListItem);
    const term = query.trim().toLowerCase();
    return source.filter((form) => {
      const matchesStatus = statusFilter === 'All' || form.status === statusFilter;
      const matchesQuery = term === '' || form.name.toLowerCase().includes(term);
      return matchesStatus && matchesQuery;
    });
  }, [queryForms, statusFilter, query]);
  const showResultsCard = isLoading || !isError || Boolean(queryForms);
  const hasNoForms = !isLoading && queryForms?.length === 0;

  return (
    <CreatorAppShell active="forms">
      <main className="flex min-h-screen flex-col gap-5 px-8 py-7">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-semibold leading-tight tracking-normal">Forms</h1>
            <p className="text-base text-muted-foreground">
              Create, publish, and monitor versioned disclosure forms.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Button asChild size="lg">
              <Link href="/forms/new">
                <Plus data-icon="inline-start" />
                Create form
              </Link>
            </Button>
          </div>
        </header>

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-10 pl-9"
                placeholder="Search forms"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <ButtonGroup>
                {filterOptions.map((option) => {
                  const isActive = statusFilter === option;
                  return (
                    <Button
                      key={option}
                      size="sm"
                      variant="outline"
                      aria-pressed={isActive}
                      onClick={() => setStatusFilter(option)}
                      className={
                        isActive
                          ? 'z-10 border-primary bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary'
                          : 'text-muted-foreground'
                      }
                    >
                      {option}
                    </Button>
                  );
                })}
              </ButtonGroup>
              <Button size="sm" variant="outline" className="gap-1.5 text-muted-foreground">
                <ArrowUpDown data-icon="inline-start" />
                Updated
                <ChevronDown data-icon="inline-end" />
              </Button>
            </div>
          </div>

          {isError && (
            <Alert variant="destructive">
              <AlertTitle>Forms could not be loaded</AlertTitle>
              <AlertDescription>
                {error instanceof Error
                  ? error.message
                  : 'Try again to refresh the creator dashboard.'}
              </AlertDescription>
              <AlertAction>
                <Button disabled={isFetching} onClick={() => refetch()} size="sm" variant="outline">
                  {isFetching ? 'Retrying' : 'Retry'}
                </Button>
              </AlertAction>
            </Alert>
          )}

          {showResultsCard && (
            <Card className="rounded">
              {isLoading ? (
                <FormsTableSkeleton />
              ) : forms.length > 0 ? (
                <>
                  <CardHeader className="border-b">
                    <CardTitle className="text-xl">All forms</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <FormsTable forms={forms} />
                  </CardContent>
                </>
              ) : (
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="h-11 px-6">Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>Submissions</TableHead>
                        <TableHead>
                          <span className="inline-flex items-center gap-1">
                            Updated
                            <ArrowDown className="size-3.5 text-muted-foreground" />
                          </span>
                        </TableHead>
                        <TableHead className="px-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                  </Table>
                  <FormsEmptyState
                    title={hasNoForms ? 'No forms yet' : 'No matching forms'}
                    description={
                      hasNoForms
                        ? 'Create your first versioned form to start collecting submissions.'
                        : 'Adjust your search or status filter to find a form.'
                    }
                    showCreateAction={hasNoForms}
                  />
                </CardContent>
              )}
            </Card>
          )}
        </section>
      </main>
    </CreatorAppShell>
  );
}

function FormsEmptyState({
  title,
  description,
  showCreateAction,
}: {
  title: string;
  description: string;
  showCreateAction: boolean;
}) {
  return (
    <Empty className="min-h-[440px] gap-5">
      <EmptyHeader className="gap-3">
        <EmptyMedia variant="default" className="mb-0">
          <FileText className="size-16 text-muted-foreground/70" strokeWidth={1.5} />
        </EmptyMedia>
        <EmptyTitle className="text-2xl font-semibold text-foreground">{title}</EmptyTitle>
        <EmptyDescription className="text-base">{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="max-w-none gap-4">
        {showCreateAction && (
          <>
            <div className="flex items-center gap-3">
              <Button asChild size="lg">
                <Link href="/forms/new">Create form</Link>
              </Button>
              <Button asChild variant="link" size="lg">
                <Link href="/forms/new">
                  View setup guide
                  <ChevronRight data-icon="inline-end" />
                </Link>
              </Button>
            </div>
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <Lock className="size-3.5" />
              Forms save as draft until published.
            </p>
          </>
        )}
      </EmptyContent>
    </Empty>
  );
}

function FormsTableSkeleton() {
  return (
    <>
      <CardHeader className="border-b">
        <CardTitle className="text-xl">All forms</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0 p-0" role="status" aria-label="Loading forms">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_2fr] gap-4 border-b px-6 py-5 last:border-b-0"
            key={index}
          >
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-40" />
          </div>
        ))}
      </CardContent>
    </>
  );
}
