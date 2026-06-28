'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Braces,
  Copy,
  Eye,
  FileText,
  LoaderCircle,
  Pencil,
  Plus,
  Table2,
} from 'lucide-react';

import { CreatorAppShell } from '@/components/creator-app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { type BuilderJsonApplyValue, toBuilderJson } from '@/app/forms/new/builder-json';
import { compileForm } from '@/app/forms/new/compile';
import { FieldSettingsSheet } from '@/app/forms/new/field-settings-sheet';
import {
  type BuilderField,
  createField,
  FIELD_GROUPS,
  FIELD_TYPES,
  type FieldType,
  uniqueKey,
} from '@/app/forms/new/field-types';
import { FormConfigEditor } from '@/app/forms/new/form-config-editor';

type BuilderTab = 'builder' | 'json';
type SaveState =
  | { status: 'idle' }
  | { status: 'saving' | 'publishing' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };
type DraftIdentity = {
  key: string;
  version: number;
};

export function NewFormBuilderClient() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<BuilderField[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tab, setTab] = useState<BuilderTab>('builder');
  const [saveState, setSaveState] = useState<SaveState>({ status: 'idle' });
  const [draftIdentity, setDraftIdentity] = useState<DraftIdentity | null>(null);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [publishedSignature, setPublishedSignature] = useState<string | null>(null);

  const editingField = fields.find((field) => field.id === editingId) ?? null;
  const isSubmitting = saveState.status === 'saving' || saveState.status === 'publishing';
  const formSignature = useMemo(
    () => JSON.stringify({ name: name.trim(), description: description.trim(), fields }),
    [name, description, fields],
  );
  const canSave = name.trim() !== '' && !isSubmitting && savedSignature !== formSignature;
  const canPublish =
    name.trim() !== '' &&
    fields.length > 0 &&
    !isSubmitting &&
    publishedSignature !== formSignature;
  const visibleSaveState: SaveState =
    saveState.status === 'success' &&
    savedSignature !== formSignature &&
    publishedSignature !== formSignature
      ? { status: 'idle' }
      : saveState;
  const builderJson = useMemo(
    () => toBuilderJson(name, description, fields),
    [name, description, fields],
  );

  const addField = (type: FieldType) => {
    const field = createField(
      type,
      fields.map((existing) => existing.key),
    );
    setFields((prev) => [...prev, field]);
    setEditingId(field.id);
  };

  const duplicateField = (index: number) =>
    setFields((prev) => {
      const field = prev[index];
      if (!field) return prev;
      const copy: BuilderField = {
        ...field,
        id: crypto.randomUUID(),
        key: uniqueKey(
          field.key,
          prev.map((existing) => existing.key),
        ),
      };
      return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
    });

  const moveField = (index: number, direction: -1 | 1) =>
    setFields((prev) => {
      const target = index + direction;
      const current = prev[index];
      const swap = prev[target];
      if (!current || !swap) return prev;
      const next = [...prev];
      next[index] = swap;
      next[target] = current;
      return next;
    });

  const applyFieldChanges = (updated: BuilderField) => {
    setFields((prev) => prev.map((field) => (field.id === updated.id ? updated : field)));
    setEditingId(null);
  };

  const applyBuilderJson = (next: BuilderJsonApplyValue) => {
    setName(next.name);
    setDescription(next.description);
    setFields(next.fields);
    setEditingId(null);
    setTab('builder');
  };

  const saveForm = async (publish: boolean) => {
    const trimmedName = name.trim();
    if (!trimmedName || (publish && fields.length === 0)) return;

    setSaveState({ status: publish ? 'publishing' : 'saving' });
    const config = compileForm(trimmedName, description, fields);
    const signature = formSignature;

    try {
      const apiUrl = getApiUrl();
      let draft = draftIdentity;

      if (draft) {
        if (savedSignature !== signature) {
          const updateResponse = await fetch(
            `${apiUrl}/forms/${draft.key}/versions/${draft.version}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: trimmedName,
                description: description.trim() || null,
                schema: config.schema,
                uiSchema: config.uiSchema,
              }),
            },
          );

          if (!updateResponse.ok) {
            throw new Error(
              await readApiError(updateResponse, `Could not update "${trimmedName}".`),
            );
          }
        }
      } else {
        const key = createFormKey(trimmedName);
        const createResponse = await fetch(`${apiUrl}/forms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key,
            name: trimmedName,
            description: description.trim() || undefined,
            schema: config.schema,
            uiSchema: config.uiSchema,
          }),
        });

        if (!createResponse.ok) {
          throw new Error(await readApiError(createResponse, `Could not save "${trimmedName}".`));
        }

        draft = await readCreatedDraft(createResponse, key);
        setDraftIdentity(draft);
      }
      setSavedSignature(signature);

      if (publish) {
        const publishResponse = await fetch(
          `${apiUrl}/forms/${draft.key}/versions/${draft.version}/publish`,
          {
            method: 'POST',
          },
        );
        if (!publishResponse.ok) {
          throw new Error(
            await readApiError(
              publishResponse,
              `"${trimmedName}" was saved as a draft, but publishing failed.`,
            ),
          );
        }
        setPublishedSignature(signature);
      }

      setSaveState({
        status: 'success',
        message: publish
          ? `"${trimmedName}" was published.`
          : `"${trimmedName}" was saved as a draft.`,
      });
      router.refresh();
      if (publish) router.push('/forms');
    } catch (error) {
      setSaveState({
        status: 'error',
        message: error instanceof Error ? error.message : 'The form could not be saved.',
      });
    }
  };

  return (
    <CreatorAppShell active="forms">
      <main className="flex min-h-screen flex-col gap-6 px-8 py-7">
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
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Untitled form"
                  value={name}
                />
                <Badge className="rounded-md bg-muted text-muted-foreground">Draft</Badge>
              </div>
              <input
                aria-label="Form description"
                className="w-full bg-transparent text-base text-muted-foreground outline-none placeholder:text-muted-foreground/50"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Add a description to help respondents understand this form."
                value={description}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline">
                <Link href="/forms">Cancel</Link>
              </Button>
              <Button variant="outline">
                <Eye data-icon="inline-start" />
                Live preview
              </Button>
              <Button disabled={!canSave} onClick={() => saveForm(false)} variant="outline">
                {saveState.status === 'saving' && <LoaderCircle className="animate-spin" />}
                Save draft
              </Button>
              <Button disabled={!canPublish} onClick={() => saveForm(true)}>
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
            <AddFieldMenu onAdd={addField} />
          </div>
        </header>

        <Card className="gap-0 rounded py-0">
          <Tabs
            className="gap-0"
            onValueChange={(value) => setTab(value as BuilderTab)}
            value={tab}
          >
            <div className="flex items-center justify-between gap-2 border-b px-6 py-4">
              <Button size="sm" variant="outline">
                <FileText data-icon="inline-start" />
                Templates
              </Button>

              <TabsList>
                <TabsTrigger value="builder">
                  <Table2 data-icon="inline-start" />
                  Builder
                </TabsTrigger>
                <TabsTrigger value="json">
                  <Braces data-icon="inline-start" />
                  JSON
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent className="m-0" value="builder">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="h-11 w-12 px-6">#</TableHead>
                    <TableHead>Field label</TableHead>
                    <TableHead>Field type</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead className="px-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        className="px-6 py-12 text-center text-muted-foreground"
                        colSpan={5}
                      >
                        No fields yet. Add your first field to start building the form.
                      </TableCell>
                    </TableRow>
                  ) : (
                    fields.map((field, index) => {
                      const Icon = field.type.icon;
                      const isEditing = field.id === editingId;
                      return (
                        <TableRow
                          className={
                            isEditing
                              ? 'cursor-pointer border-l-2 border-l-primary bg-primary/5 hover:bg-primary/5'
                              : 'cursor-pointer'
                          }
                          key={field.id}
                          onClick={() => setEditingId(field.id)}
                        >
                          <TableCell className="px-6 py-5 text-muted-foreground">
                            {index + 1}
                          </TableCell>
                          <TableCell className="font-medium">
                            <span className="flex flex-col gap-0.5">
                              {field.label}
                              {field.helperText && (
                                <span className="text-xs font-normal text-muted-foreground">
                                  {field.helperText}
                                </span>
                              )}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-2 text-muted-foreground">
                              <Icon className="size-4" />
                              <span className="text-foreground">{field.type.label}</span>
                            </span>
                          </TableCell>
                          <TableCell>
                            {field.required && (
                              <Badge className="rounded-md bg-primary/10 text-primary">
                                Required
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="px-6">
                            <div className="flex items-center justify-end gap-2">
                              <FieldRowAction
                                icon={Pencil}
                                label={`Edit ${field.label}`}
                                onClick={() => setEditingId(field.id)}
                              />
                              <FieldRowAction
                                icon={Copy}
                                label={`Duplicate ${field.label}`}
                                onClick={() => duplicateField(index)}
                              />
                              <FieldRowAction
                                disabled={index === 0}
                                icon={ArrowUp}
                                label={`Move ${field.label} up`}
                                onClick={() => moveField(index, -1)}
                              />
                              <FieldRowAction
                                disabled={index === fields.length - 1}
                                icon={ArrowDown}
                                label={`Move ${field.label} down`}
                                onClick={() => moveField(index, 1)}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              <div className="p-6">
                <AddFieldMenu
                  align="center"
                  label="Add another field"
                  onAdd={addField}
                  triggerVariant="dashed"
                />
              </div>
            </TabsContent>

            <TabsContent className="m-0" value="json">
              <FormConfigEditor onApply={applyBuilderJson} value={builderJson} />
            </TabsContent>
          </Tabs>
        </Card>
      </main>

      <FieldSettingsSheet
        field={editingField}
        onApply={applyFieldChanges}
        onClose={() => setEditingId(null)}
      />
    </CreatorAppShell>
  );
}

function getApiUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) throw new Error('NEXT_PUBLIC_API_URL is not configured.');
  return apiUrl.replace(/\/+$/, '');
}

function createFormKey(value: string): string {
  return `${slugifyFormKey(value)}-${crypto.randomUUID().slice(0, 8)}`;
}

function slugifyFormKey(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-') || 'form'
  );
}

async function readCreatedDraft(response: Response, fallbackKey: string): Promise<DraftIdentity> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const key = typeof record.key === 'string' ? record.key : fallbackKey;
  const version = typeof record.version === 'number' ? record.version : 1;
  return { key, version };
}

async function readApiError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown; error?: unknown };
    if (typeof body.message === 'string') return body.message;
    if (Array.isArray(body.message)) return body.message.join(' ');
    if (typeof body.error === 'string') return body.error;
  } catch {
    // Fall through to the status-based message.
  }
  return `${fallback} (${response.status})`;
}

function FieldRowAction({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      aria-label={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      size="icon-sm"
      variant="outline"
    >
      <Icon />
    </Button>
  );
}

function AddFieldMenu({
  onAdd,
  align = 'end',
  label = 'Add field',
  triggerVariant = 'default',
}: {
  onAdd: (type: FieldType) => void;
  align?: 'start' | 'center' | 'end';
  label?: string;
  triggerVariant?: 'default' | 'dashed';
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const menuAlignment =
    align === 'start' ? 'left-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'right-0';

  return (
    <div
      className={triggerVariant === 'dashed' ? 'relative w-full' : 'relative inline-flex'}
      ref={containerRef}
    >
      {triggerVariant === 'dashed' ? (
        <button
          aria-expanded={open}
          aria-haspopup="dialog"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-8 text-sm font-medium text-primary transition-colors hover:border-primary/40 hover:bg-primary/5"
          onClick={() => setOpen(true)}
          type="button"
        >
          <Plus className="size-4" />
          {label}
        </button>
      ) : (
        <Button aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(true)}>
          <Plus data-icon="inline-start" />
          {label}
        </Button>
      )}

      {open && (
        <div
          className={`absolute top-full z-50 mt-2 w-80 overflow-hidden rounded-lg bg-popover p-0 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 ${menuAlignment}`}
          role="dialog"
        >
          <Command>
            <CommandInput placeholder="Search field types..." />
            <CommandList className="max-h-[28rem]">
              <CommandEmpty>No field types found.</CommandEmpty>
              {FIELD_GROUPS.map((group) => (
                <CommandGroup
                  className="[&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:uppercase"
                  heading={group}
                  key={group}
                >
                  {FIELD_TYPES.filter((type) => type.group === group).map((type) => {
                    const Icon = type.icon;
                    return (
                      <CommandItem
                        className="gap-3 py-2"
                        key={type.id}
                        onSelect={() => {
                          onAdd(type);
                          setOpen(false);
                        }}
                        value={`${type.label} ${type.description}`}
                      >
                        <Icon className="size-5 text-muted-foreground" />
                        <span className="flex flex-col">
                          <span className="font-medium">{type.label}</span>
                          <span className="text-xs text-muted-foreground">{type.description}</span>
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
