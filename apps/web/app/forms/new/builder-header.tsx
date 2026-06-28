'use client';

import Link from 'next/link';
import { Eye, LoaderCircle } from 'lucide-react';

import { AddFieldMenu } from '@/app/forms/new/add-field-menu';
import type { SaveState } from '@/app/forms/new/builder-state';
import type { FieldType } from '@/app/forms/new/field-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function BuilderHeader({
  name,
  description,
  visibleSaveState,
  canSave,
  canPublish,
  saveState,
  onNameChange,
  onDescriptionChange,
  onAddField,
  onSaveDraft,
  onPublish,
  onLivePreview,
  canPreview,
  cancelHref = '/forms',
}: {
  name: string;
  description: string;
  visibleSaveState: SaveState;
  canSave: boolean;
  canPublish: boolean;
  saveState: SaveState;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onAddField: (type: FieldType) => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onLivePreview: () => void;
  canPreview: boolean;
  cancelHref?: string;
}) {
  return (
    <header className="flex flex-col gap-4">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link className="hover:text-foreground" href="/forms">
          Forms
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-foreground">{name.trim() || 'Untitled form'}</span>
        <span aria-hidden="true">/</span>
        <span>Draft</span>
      </nav>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-3">
            <input
              aria-label="Form name"
              className="w-full min-w-0 bg-transparent text-3xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/50"
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Untitled form"
              value={name}
            />
            <Badge className="rounded-md bg-muted text-muted-foreground">Draft</Badge>
          </div>
          <input
            aria-label="Form description"
            className="w-full bg-transparent text-base text-muted-foreground outline-none placeholder:text-muted-foreground/50"
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="Add a description to help respondents understand this form."
            value={description}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href={cancelHref}>Cancel</Link>
          </Button>
          <Button disabled={!canPreview} onClick={onLivePreview} variant="outline">
            <Eye data-icon="inline-start" />
            Live preview
          </Button>
          <Button disabled={!canSave} onClick={onSaveDraft} variant="outline">
            {saveState.status === 'saving' && <LoaderCircle className="animate-spin" />}
            Save draft
          </Button>
          <Button disabled={!canPublish} onClick={onPublish}>
            {saveState.status === 'publishing' && <LoaderCircle className="animate-spin" />}
            Publish
          </Button>
        </div>
      </div>

      {visibleSaveState.status === 'error' && (
        <p
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {visibleSaveState.message}
        </p>
      )}
      {visibleSaveState.status === 'success' && (
        <p
          className="rounded-md border border-success/30 bg-success/5 px-3 py-2 text-sm text-success"
          role="status"
        >
          {visibleSaveState.message}
        </p>
      )}

      <div className="flex justify-end">
        <AddFieldMenu onAdd={onAddField} />
      </div>
    </header>
  );
}
