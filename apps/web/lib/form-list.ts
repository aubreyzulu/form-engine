import { formatDistanceToNow } from 'date-fns';

import { type FormListResponseItem } from '@/lib/forms-api';

export type FormListItem = {
  key: string;
  name: string;
  status: 'Archived' | 'Draft' | 'Published';
  version: string;
  publishedVersion: number | null;
  submissions: number;
  updated: string;
};

export function toFormListItem(form: FormListResponseItem): FormListItem {
  return {
    key: form.key,
    name: form.name,
    status: formStatusLabel(form.status),
    version: form.latestVersion ? `v${form.latestVersion}` : '-',
    publishedVersion: form.publishedVersion,
    submissions: form.submissionCount,
    updated: formatUpdated(form.updatedAt),
  };
}

function formStatusLabel(status: FormListResponseItem['status']): FormListItem['status'] {
  if (status === 'PUBLISHED') return 'Published';
  if (status === 'ARCHIVED') return 'Archived';
  return 'Draft';
}

function formatUpdated(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return formatDistanceToNow(date, { addSuffix: true });
}
