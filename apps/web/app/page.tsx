import Link from 'next/link';
import { ArrowRight, FileCheck2, ShieldCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const paths = [
  {
    title: 'Creator workspace',
    description: 'Build, publish, and review versioned disclosure forms.',
    href: '/dashboard',
    cta: 'Open dashboard',
    icon: FileCheck2,
  },
  {
    title: 'Public form',
    description: 'Preview the submitter-facing route for a published form.',
    href: '/f/beneficial-ownership-declaration',
    cta: 'Open sample form',
    icon: ShieldCheck,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative isolate flex min-h-[72vh] overflow-hidden border-b bg-foreground text-background">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[url('/landing-dashboard-overview.png')] bg-cover bg-center opacity-35"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-foreground/75" />

        <div className="relative mx-auto flex w-full max-w-6xl flex-col justify-end gap-8 px-6 py-12 sm:px-8 lg:px-10">
          <Badge className="w-fit" variant="secondary">
            Dynamic Form Builder Engine
          </Badge>

          <div className="flex max-w-3xl flex-col gap-5">
            <h1 className="text-4xl font-semibold leading-tight tracking-normal sm:text-5xl">
              Versioned forms for regulated submissions.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-background/80">
              Configure a form, publish a locked version, and keep every response tied to the exact
              configuration that validated it.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/dashboard">
                Open dashboard
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/f/beneficial-ownership-declaration">Open sample public form</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 sm:px-8 lg:px-10">
        <div className="grid gap-4 md:grid-cols-2">
          {paths.map((path) => {
            const Icon = path.icon;

            return (
              <Card className="rounded-lg" key={path.title}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <CardTitle>{path.title}</CardTitle>
                      <CardDescription>{path.description}</CardDescription>
                    </div>
                    <Icon className="text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline">
                    <Link href={path.href}>
                      {path.cta}
                      <ArrowRight data-icon="inline-end" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <footer className="flex flex-col gap-2 border-t pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Assignment scope: authoring, fill, validation, and version-pinned submissions.
          </span>
          <code className="w-fit rounded bg-muted px-2 py-1 text-foreground">
            {API_URL ?? 'NEXT_PUBLIC_API_URL not configured'}
          </code>
        </footer>
      </section>
    </main>
  );
}
