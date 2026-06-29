import { apiRequest } from '@/lib/api-client';

export type FormVersionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type FormListResponseItem = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  status: FormVersionStatus | null;
  latestVersion: number | null;
  publishedVersion: number | null;
  publishedAt: string | null;
  submissionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type DraftIdentity = {
  key: string;
  version: number;
};

export type ManageFormResponse = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  publishedVersion: number | null;
  submissionCount: number;
  version: {
    version: number;
    status: FormVersionStatus;
    schema: unknown;
    uiSchema: unknown;
    publishedAt: string | null;
    createdAt: string;
  };
};

export type FormVersionResponse = {
  id: string;
  formId: string;
  version: number;
  status: FormVersionStatus;
  schema: unknown;
  uiSchema: unknown;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublishedFormResponse = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  version: number;
  schema: unknown;
  uiSchema: unknown;
  publishedAt: string | null;
};

export type SubmissionResponse = {
  id: string;
  formVersionId: string;
  formVersion?: {
    version: number;
  };
  data: unknown;
  createdAt: string;
};

export type SubmissionListResponse = {
  items: SubmissionResponse[];
  total: number;
  skip: number;
  take: number;
};

export type CreateFormPayload = {
  key: string;
  name: string;
  description?: string;
  schema: unknown;
  uiSchema: unknown;
};

export type UpdateDraftPayload = {
  key: string;
  version: number;
  name: string;
  description: string | null;
  schema: unknown;
  uiSchema: unknown;
};

export type PublishVersionPayload = {
  key: string;
  version: number;
};

export type SubmitFormPayload = {
  key: string;
  data: Record<string, unknown>;
};

export function listForms() {
  return apiRequest<FormListResponseItem[]>('/forms');
}

export function getManageForm(key: string) {
  return apiRequest<ManageFormResponse>(`/forms/${key}/manage`);
}

export function getPublishedForm(key: string) {
  return apiRequest<PublishedFormResponse>(`/forms/${key}`);
}

export function getFormVersion(key: string, version: number) {
  return apiRequest<FormVersionResponse>(`/forms/${key}/versions/${version}`);
}

export async function createFormDraft(payload: CreateFormPayload): Promise<DraftIdentity> {
  const response = await apiRequest<Record<string, unknown>>('/forms', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return {
    key: typeof response.key === 'string' ? response.key : payload.key,
    version: typeof response.version === 'number' ? response.version : 1,
  };
}

export async function createDraftVersion(key: string): Promise<DraftIdentity> {
  const response = await apiRequest<Record<string, unknown>>(`/forms/${key}/versions`, {
    method: 'POST',
    body: JSON.stringify({}),
  });

  return {
    key,
    version: typeof response.version === 'number' ? response.version : 1,
  };
}

export function updateDraftVersion({ key, version, ...payload }: UpdateDraftPayload) {
  return apiRequest<unknown>(`/forms/${key}/versions/${version}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function publishVersion({ key, version }: PublishVersionPayload) {
  return apiRequest<unknown>(`/forms/${key}/versions/${version}/publish`, {
    method: 'POST',
  });
}

export function submitForm({ key, data }: SubmitFormPayload) {
  return apiRequest<SubmissionResponse>(`/forms/${key}/submissions`, {
    method: 'POST',
    body: JSON.stringify({ data }),
  });
}

export function listSubmissions(key: string) {
  return apiRequest<SubmissionListResponse>(`/forms/${key}/submissions`);
}
