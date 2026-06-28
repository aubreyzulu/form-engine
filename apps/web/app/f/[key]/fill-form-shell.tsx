import Link from 'next/link';
import type { ReactNode } from 'react';

export function FillPageShell({ content }: { content: ReactNode }) {
  return (
    <main className="min-h-screen bg-muted/30 px-6 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Link className="text-sm font-medium text-muted-foreground hover:text-foreground" href="/">
          Form Builder
        </Link>
        {content}
      </div>
    </main>
  );
}
