import type { PrimitiveOptionValue } from '@/lib/schema-fields';
import type { SubmissionResponse } from '@/lib/forms-api';

export type FieldOption = {
  label: string;
  value: PrimitiveOptionValue;
};

export type RenderField = {
  key: string;
  label: string;
  help?: string;
  placeholder?: string;
  widget: string;
  type: string | null;
  format: string | null;
  required: boolean;
  options: FieldOption[];
};

export type FormValues = Record<string, unknown>;

export type SubmissionState = {
  response: SubmissionResponse;
  data: Record<string, unknown>;
};
