import {
  AlignLeft,
  Calendar,
  ChevronsUpDown,
  Circle,
  Hash,
  Link2,
  type LucideIcon,
  Mail,
  Phone,
  Type,
} from 'lucide-react';

export type FieldGroup = 'Basic fields' | 'Contact';

export type FieldType = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  group: FieldGroup;
};

export const FIELD_TYPES: FieldType[] = [
  {
    id: 'short-text',
    label: 'Short Text',
    description: 'One-line response',
    icon: Type,
    group: 'Basic fields',
  },
  {
    id: 'long-text',
    label: 'Long Text',
    description: 'Paragraph response',
    icon: AlignLeft,
    group: 'Basic fields',
  },
  {
    id: 'number',
    label: 'Number',
    description: 'Numeric answer',
    icon: Hash,
    group: 'Basic fields',
  },
  {
    id: 'date',
    label: 'Date',
    description: 'Calendar date',
    icon: Calendar,
    group: 'Basic fields',
  },
  {
    id: 'dropdown',
    label: 'Dropdown',
    description: 'Select one option',
    icon: ChevronsUpDown,
    group: 'Basic fields',
  },
  {
    id: 'checkboxes',
    label: 'Checkboxes',
    description: 'Select multiple options',
    icon: Circle,
    group: 'Basic fields',
  },
  {
    id: 'yes-no',
    label: 'Yes / No',
    description: 'Boolean choice',
    icon: Circle,
    group: 'Basic fields',
  },
  { id: 'email', label: 'Email', description: 'Validated email', icon: Mail, group: 'Contact' },
  { id: 'phone', label: 'Phone', description: 'Phone number', icon: Phone, group: 'Contact' },
  { id: 'url', label: 'URL', description: 'Website or link', icon: Link2, group: 'Contact' },
];

export const FIELD_GROUPS: FieldGroup[] = ['Basic fields', 'Contact'];

export function fieldType(id: string): FieldType {
  const type = FIELD_TYPES.find((candidate) => candidate.id === id);
  if (!type) throw new Error(`Unknown field type: ${id}`);
  return type;
}

export type BuilderField = {
  id: string;
  /** Stable JSON Schema property key — assigned once, kept across renames so the
   *  config round-trips losslessly. */
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  helperText?: string;
  placeholder?: string;
  // Validation — only the keys relevant to `type` are used by the settings sheet.
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  options?: BuilderOption[];
};

export type BuilderOption = {
  label: string;
  value: string;
};

export function isOptionListType(typeId: string): boolean {
  return typeId === 'dropdown' || typeId === 'checkboxes';
}

function defaultOptions(): BuilderOption[] {
  return [
    { label: 'Option 1', value: 'option1' },
    { label: 'Option 2', value: 'option2' },
  ];
}

export function transitionFieldType(field: BuilderField, nextTypeId: string): BuilderField {
  const nextType = fieldType(nextTypeId);
  const next: BuilderField = {
    id: field.id,
    key: field.key,
    label: field.label,
    type: nextType,
    required: field.required,
  };

  if (field.helperText) next.helperText = field.helperText;
  if (field.placeholder) next.placeholder = field.placeholder;

  if (nextTypeId === 'number') {
    if (field.type.id === 'number') {
      if (field.min !== undefined) next.min = field.min;
      if (field.max !== undefined) next.max = field.max;
    }
    return next;
  }

  if (nextTypeId === 'short-text' || nextTypeId === 'long-text') {
    if (field.type.id === 'short-text' || field.type.id === 'long-text') {
      if (field.minLength !== undefined) next.minLength = field.minLength;
      if (field.maxLength !== undefined) next.maxLength = field.maxLength;
    }
    return next;
  }

  if (isOptionListType(nextTypeId)) {
    next.options = isOptionListType(field.type.id)
      ? (field.options ?? defaultOptions())
      : defaultOptions();
  }

  return next;
}

/** A camelCase identifier derived from a human label. */
export function slugifyKey(label: string): string {
  return (
    label
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .trim()
      .split(' ')
      .map((word, index) =>
        index === 0
          ? word.toLowerCase()
          : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
      )
      .join('') || 'field'
  );
}

/** Make `base` unique against `existing`, suffixing with a number when taken. */
export function uniqueKey(base: string, existing: Iterable<string>): string {
  const used = new Set(existing);
  const seed = base || 'field';
  let key = seed;
  let suffix = 2;
  while (used.has(key)) key = `${seed}${suffix++}`;
  return key;
}

export function createField(type: FieldType, existingKeys: Iterable<string> = []): BuilderField {
  return {
    id: crypto.randomUUID(),
    key: uniqueKey(slugifyKey(type.label), existingKeys),
    label: type.label,
    type,
    required: true,
    options: isOptionListType(type.id) ? defaultOptions() : undefined,
  };
}
