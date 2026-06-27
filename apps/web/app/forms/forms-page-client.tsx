'use client';

import Link from 'next/link';
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
import { FormsTable, type FormListItem } from '@/components/forms-table';
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
import { Switch } from '@/components/ui/switch';
import { Table, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const sampleForms: FormListItem[] = [
  {
    key: 'beneficial-ownership-declaration',
    name: 'Beneficial Ownership Declaration',
    status: 'Published',
    version: 'v1',
    submissions: 128,
    updated: 'Today',
  },
  {
    key: 'director-details-update',
    name: 'Director Details Update',
    status: 'Draft',
    version: 'v1',
    submissions: 0,
    updated: 'Yesterday',
  },
  {
    key: 'company-ownership-change',
    name: 'Company Ownership Change',
    status: 'Published',
    version: 'v3',
    submissions: 42,
    updated: 'Jun 21',
  },
  {
    key: 'register-of-members',
    name: 'Register of Members',
    status: 'Draft',
    version: 'v2',
    submissions: 12,
    updated: 'Jun 12',
  },
];

const filterOptions = ['All', 'Draft', 'Published'] as const;
type FilterOption = (typeof filterOptions)[number];

export function FormsPageClient() {
  const [showSampleForms, setShowSampleForms] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FilterOption>('All');
  const [query, setQuery] = useState('');

  const forms = useMemo(() => {
    const source = showSampleForms ? sampleForms : [];
    const term = query.trim().toLowerCase();
    return source.filter((form) => {
      const matchesStatus = statusFilter === 'All' || form.status === statusFilter;
      const matchesQuery = term === '' || form.name.toLowerCase().includes(term);
      return matchesStatus && matchesQuery;
    });
  }, [showSampleForms, statusFilter, query]);

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
            <label className="flex items-center gap-3 text-sm text-muted-foreground">
              <Switch checked={showSampleForms} onCheckedChange={setShowSampleForms} />
              Show sample forms
            </label>
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

          <Card className="rounded">
            {forms.length > 0 ? (
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
                <FormsEmptyState />
              </CardContent>
            )}
          </Card>
        </section>
      </main>
    </CreatorAppShell>
  );
}

function FormsEmptyState() {
  return (
    <Empty className="min-h-[440px] gap-5">
      <EmptyHeader className="gap-3">
        <EmptyMedia variant="default" className="mb-0">
          <FileText className="size-16 text-muted-foreground/70" strokeWidth={1.5} />
        </EmptyMedia>
        <EmptyTitle className="text-2xl font-semibold text-foreground">No forms yet</EmptyTitle>
        <EmptyDescription className="text-base">
          Create your first versioned form to start collecting submissions.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="max-w-none gap-4">
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
      </EmptyContent>
    </Empty>
  );
}
