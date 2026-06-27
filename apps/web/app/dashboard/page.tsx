import Link from 'next/link';
import { BarChart3, CheckCircle2, ChevronDown, FileText, MoreVertical, Plus } from 'lucide-react';

import { CreatorAppShell } from '@/components/creator-app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const stats = [
  {
    label: 'Published forms',
    value: '2',
    helper: 'Live and collecting responses',
    icon: CheckCircle2,
    tone: 'success',
  },
  {
    label: 'Draft forms',
    value: '1',
    helper: 'Not yet published',
    icon: FileText,
    tone: 'neutral',
  },
  {
    label: 'Total submissions',
    value: '170',
    helper: 'Across all published forms',
    icon: BarChart3,
    tone: 'success',
  },
];

const chartRows = [
  {
    name: 'Beneficial Ownership Declaration',
    value: 128,
  },
  {
    name: 'Company Ownership Change',
    value: 42,
  },
  {
    name: 'Director Details Update',
    value: 0,
  },
];

const recentForms = [
  {
    name: 'Beneficial Ownership Declaration',
    status: 'Published',
    version: 'v1',
    submissions: 128,
    updated: 'May 12, 2025 10:24 AM',
  },
  {
    name: 'Director Details Update',
    status: 'Draft',
    version: 'v1',
    submissions: 0,
    updated: 'May 12, 2025 9:15 AM',
  },
  {
    name: 'Company Ownership Change',
    status: 'Published',
    version: 'v3',
    submissions: 42,
    updated: 'May 11, 2025 4:33 PM',
  },
];

const maxSubmissions = Math.max(...chartRows.map((row) => row.value));

export default function DashboardPage() {
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
            <Button asChild size="lg" variant="outline">
              <Link href="/forms/new">
                Create form
                <Plus data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild size="lg">
              <Link href="/forms/new">Create form</Link>
            </Button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const isDanger = stat.tone === 'danger';
            const isSuccess = stat.tone === 'success';

            return (
              <Card className="rounded py-6" key={stat.label}>
                <CardContent className="flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-4">
                    <span className="text-base font-medium">{stat.label}</span>
                    <div className="flex flex-col gap-2">
                      <span
                        className={
                          isDanger
                            ? 'text-4xl font-semibold leading-none text-destructive'
                            : 'text-4xl font-semibold leading-none'
                        }
                      >
                        {stat.value}
                      </span>
                      <span className="text-sm text-muted-foreground">{stat.helper}</span>
                    </div>
                  </div>
                  <span
                    className={
                      isDanger
                        ? 'flex size-14 items-center justify-center rounded-full bg-destructive/15 text-destructive'
                        : isSuccess
                          ? 'flex size-14 items-center justify-center rounded-full bg-success/15 text-success'
                          : 'flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground'
                    }
                  >
                    <Icon />
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <Card className="rounded">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-xl">Submissions by form</CardTitle>
            <Button size="lg" variant="outline">
              Last 30 days
              <ChevronDown data-icon="inline-end" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[220px_1fr] gap-x-6 gap-y-7 pt-2">
              {chartRows.map((row) => {
                const width = maxSubmissions === 0 ? 0 : (row.value / maxSubmissions) * 100;

                return (
                  <div className="contents" key={row.name}>
                    <div className="flex h-7 items-center justify-end text-sm text-muted-foreground">
                      {row.name}
                    </div>
                    <div className="relative h-7">
                      <div className="absolute inset-y-0 left-0 right-12 grid grid-cols-7">
                        {Array.from({ length: 7 }).map((_, index) => (
                          <span className="border-l border-dashed" key={index} />
                        ))}
                      </div>
                      <div className="relative flex h-full items-center gap-3">
                        <span
                          className="h-5 rounded-sm bg-primary"
                          style={{ width: `${width}%` }}
                        />
                        <span className="text-sm font-medium">{row.value}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 grid grid-cols-[220px_1fr] gap-x-6 text-sm text-muted-foreground">
              <span />
              <div className="grid grid-cols-7 pr-12">
                {[0, 20, 40, 60, 80, 100, 120].map((tick) => (
                  <span key={tick}>{tick}</span>
                ))}
              </div>
            </div>
            <div className="mt-3 text-center text-sm text-muted-foreground">Submissions</div>
          </CardContent>
        </Card>

        <Card className="rounded">
          <CardHeader className="border-b">
            <CardTitle className="text-xl">Recent forms</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
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
                {recentForms.map((form) => (
                  <TableRow key={form.name}>
                    <TableCell className="px-6 py-4 font-medium">{form.name}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          form.status === 'Published'
                            ? 'bg-success/15 text-success'
                            : 'bg-muted text-muted-foreground'
                        }
                      >
                        {form.status}
                      </Badge>
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
          </CardContent>
        </Card>

        <div className="flex w-full max-w-xl items-center justify-between rounded border border-success bg-card px-5 py-4 text-sm shadow-xs">
          <span className="flex items-center gap-3">
            <CheckCircle2 className="text-success" />
            Saved as draft — publish it when you&apos;re ready to collect responses.
          </span>
          <Button aria-label="Dismiss notification" size="icon-sm" variant="ghost">
            ×
          </Button>
        </div>
      </main>
    </CreatorAppShell>
  );
}
