'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useReducer, useRef, useState } from 'react';
import { Braces, FileText, Table2 } from 'lucide-react';

import { BuilderLivePreview } from '@/app/forms/new/builder-live-preview';
import { BuilderFieldsTable } from '@/app/forms/new/builder-fields-table';
import { BuilderHeader } from '@/app/forms/new/builder-header';
import { BuilderModeTour } from '@/app/forms/new/builder-mode-tour';
import {
  type BuilderInitialValue,
  type BuilderTab,
  builderSignature,
  createBuilderState,
  builderReducer,
} from '@/app/forms/new/builder-state';
import { type BuilderJsonApplyValue, toBuilderJson } from '@/app/forms/new/builder-json';
import { compileForm } from '@/app/forms/new/compile';
import { FieldSettingsSheet } from '@/app/forms/new/field-settings-sheet';
import {
  type BuilderField,
  createField,
  type FieldType,
  uniqueKey,
} from '@/app/forms/new/field-types';
import { FormConfigEditor } from '@/app/forms/new/form-config-editor';
import { CreatorAppShell } from '@/components/creator-app-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  createFormDraft,
  type DraftIdentity,
  publishVersion,
  updateDraftVersion,
} from '@/lib/forms-api';
import { formsKeys } from '@/lib/query-keys';

type NewFormBuilderClientProps = {
  cancelHref?: string;
  draftIdentity?: DraftIdentity;
  initialValue?: BuilderInitialValue;
};

export function NewFormBuilderClient({
  cancelHref = '/forms',
  draftIdentity: initialDraftIdentity,
  initialValue,
}: NewFormBuilderClientProps = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [state, dispatch] = useReducer(builderReducer, initialValue, createBuilderState);
  const draftIdentity = useRef<DraftIdentity | null>(initialDraftIdentity ?? null);
  const {
    name,
    description,
    fields,
    editingId,
    tab,
    saveState,
    savedSignature,
    publishedSignature,
  } = state;

  const editingField = fields.find((field) => field.id === editingId) ?? null;
  const isSubmitting = saveState.status === 'saving' || saveState.status === 'publishing';
  const formSignature = useMemo(() => builderSignature(state), [state]);
  const canSave = name.trim() !== '' && !isSubmitting && savedSignature !== formSignature;
  const canPublish =
    name.trim() !== '' &&
    fields.length > 0 &&
    !isSubmitting &&
    publishedSignature !== formSignature;
  const canPreview = fields.length > 0;
  const visibleSaveState =
    saveState.status === 'success' &&
    savedSignature !== formSignature &&
    publishedSignature !== formSignature
      ? { status: 'idle' as const }
      : saveState;
  const builderJson = useMemo(
    () => toBuilderJson(name, description, fields),
    [name, description, fields],
  );

  const createFormMutation = useMutation({
    mutationFn: createFormDraft,
    onSuccess: async (draft) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: formsKeys.list() }),
        queryClient.invalidateQueries({ queryKey: formsKeys.latest(draft.key) }),
      ]);
    },
  });
  const updateDraftMutation = useMutation({
    mutationFn: updateDraftVersion,
    onSuccess: async (_response, draft) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: formsKeys.list() }),
        queryClient.invalidateQueries({ queryKey: formsKeys.latest(draft.key) }),
        queryClient.invalidateQueries({ queryKey: formsKeys.version(draft.key, draft.version) }),
      ]);
    },
  });
  const publishVersionMutation = useMutation({
    mutationFn: publishVersion,
    onSuccess: async (_response, draft) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: formsKeys.list() }),
        queryClient.invalidateQueries({ queryKey: formsKeys.latest(draft.key) }),
        queryClient.invalidateQueries({ queryKey: formsKeys.version(draft.key, draft.version) }),
        queryClient.invalidateQueries({ queryKey: formsKeys.published(draft.key) }),
      ]);
    },
  });

  const addField = (type: FieldType) => {
    const field = createField(
      type,
      fields.map((existing) => existing.key),
    );
    dispatch({ type: 'fieldAdded', field });
  };

  const duplicateField = (index: number) => {
    const field = fields[index];
    if (!field) return;

    const copy: BuilderField = {
      ...field,
      id: crypto.randomUUID(),
      key: uniqueKey(
        field.key,
        fields.map((existing) => existing.key),
      ),
    };
    dispatch({ type: 'fieldDuplicated', field: copy, index });
  };

  const applyBuilderJson = (value: BuilderJsonApplyValue) => {
    dispatch({ type: 'jsonApplied', value });
  };

  const saveForm = async (publish: boolean) => {
    const trimmedName = name.trim();
    if (!trimmedName || (publish && fields.length === 0)) return;

    dispatch({
      type: 'saveStateChanged',
      saveState: { status: publish ? 'publishing' : 'saving' },
    });
    const config = compileForm(trimmedName, description, fields);
    const signature = formSignature;

    try {
      let draft = draftIdentity.current;

      if (draft) {
        if (savedSignature !== signature) {
          await updateDraftMutation.mutateAsync({
            key: draft.key,
            version: draft.version,
            name: trimmedName,
            description: description.trim() || null,
            schema: config.schema,
            uiSchema: config.uiSchema,
          });
        }
      } else {
        const key = createFormKey(trimmedName);
        draft = await createFormMutation.mutateAsync({
          key,
          name: trimmedName,
          description: description.trim() || undefined,
          schema: config.schema,
          uiSchema: config.uiSchema,
        });
        draftIdentity.current = draft;
      }
      dispatch({ type: 'savedSignatureChanged', signature });

      if (publish) {
        await publishVersionMutation.mutateAsync({ key: draft.key, version: draft.version });
        dispatch({ type: 'publishedSignatureChanged', signature });
      }

      dispatch({
        type: 'saveStateChanged',
        saveState: {
          status: 'success',
          message: publish
            ? `"${trimmedName}" was published.`
            : `"${trimmedName}" was saved as a draft.`,
        },
      });
      router.refresh();
      if (publish) router.push('/forms');
    } catch (error) {
      dispatch({
        type: 'saveStateChanged',
        saveState: {
          status: 'error',
          message: error instanceof Error ? error.message : 'The form could not be saved.',
        },
      });
    }
  };

  return (
    <CreatorAppShell active="forms">
      <main className="flex min-h-screen flex-col gap-6 px-8 py-7">
        <BuilderHeader
          canPublish={canPublish}
          canSave={canSave}
          description={description}
          name={name}
          onAddField={addField}
          onDescriptionChange={(next) =>
            dispatch({ type: 'descriptionChanged', description: next })
          }
          onLivePreview={() => setPreviewOpen(true)}
          onNameChange={(next) => dispatch({ type: 'nameChanged', name: next })}
          onPublish={() => saveForm(true)}
          onSaveDraft={() => saveForm(false)}
          canPreview={canPreview}
          cancelHref={cancelHref}
          saveState={saveState}
          visibleSaveState={visibleSaveState}
        />

        <Card className="gap-0 rounded py-0">
          <Tabs
            className="gap-0"
            onValueChange={(value) => dispatch({ type: 'tabChanged', tab: value as BuilderTab })}
            value={tab}
          >
            <div className="flex items-center justify-between gap-2 border-b px-6 py-4">
              <Button size="sm" variant="outline">
                <FileText data-icon="inline-start" />
                Templates
              </Button>

              <TabsList data-builder-mode-tour="tabs">
                <TabsTrigger data-builder-mode-tour="builder" value="builder">
                  <Table2 data-icon="inline-start" />
                  Builder
                </TabsTrigger>
                <TabsTrigger data-builder-mode-tour="json" value="json">
                  <Braces data-icon="inline-start" />
                  JSON
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent className="m-0" value="builder">
              <BuilderFieldsTable
                editingId={editingId}
                fields={fields}
                onAdd={addField}
                onDuplicate={duplicateField}
                onEdit={(id) => dispatch({ type: 'fieldEdited', id })}
                onMove={(index, direction) => dispatch({ type: 'fieldMoved', index, direction })}
              />
            </TabsContent>

            <TabsContent className="m-0" value="json">
              <FormConfigEditor onApply={applyBuilderJson} value={builderJson} />
            </TabsContent>
          </Tabs>
        </Card>
      </main>

      <FieldSettingsSheet
        field={editingField}
        onApply={(field) => dispatch({ type: 'fieldApplied', field })}
        onClose={() => dispatch({ type: 'fieldEditorClosed' })}
      />
      <BuilderLivePreview
        description={description}
        fields={fields}
        name={name}
        onOpenChange={setPreviewOpen}
        open={previewOpen}
      />
      <BuilderModeTour />
    </CreatorAppShell>
  );
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
