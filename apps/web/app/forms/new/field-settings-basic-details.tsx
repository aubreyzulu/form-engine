'use client';

import { FIELD_GROUPS, FIELD_TYPES } from '@/app/forms/new/field-types';
import type { FieldSettingsDraft } from '@/app/forms/new/field-settings-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const groupedFieldTypes = FIELD_GROUPS.map(
  (group) => [group, FIELD_TYPES.filter((type) => type.group === group)] as const,
);

export function FieldSettingsBasicDetails({
  draft,
  onLabelChange,
  onRequiredChange,
  onTypeChange,
}: {
  draft: FieldSettingsDraft;
  onLabelChange: (label: string) => void;
  onRequiredChange: (required: boolean) => void;
  onTypeChange: (typeId: string) => void;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold">Basic details</h3>

      <Field>
        <Label htmlFor="field-label">Label</Label>
        <Input
          id="field-label"
          onChange={(event) => onLabelChange(event.target.value)}
          value={draft.label}
        />
      </Field>

      <Field>
        <Label htmlFor="field-type">Field type</Label>
        <Select onValueChange={onTypeChange} value={draft.type.id}>
          <SelectTrigger className="w-full" id="field-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {groupedFieldTypes.map(([group, types]) => (
              <SelectGroup key={group}>
                <SelectLabel>{group}</SelectLabel>
                {types.map((type) => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.id} value={type.id}>
                      <Icon className="size-4 text-muted-foreground" />
                      {type.label}
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <Label htmlFor="field-required">Required</Label>
          <p className="text-xs text-muted-foreground">Respondents must provide a value.</p>
        </div>
        <Switch checked={draft.required} id="field-required" onCheckedChange={onRequiredChange} />
      </div>
    </section>
  );
}
