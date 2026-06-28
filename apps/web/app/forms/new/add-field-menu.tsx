'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { FIELD_GROUPS, FIELD_TYPES, type FieldType } from '@/app/forms/new/field-types';

const groupedFieldTypes = FIELD_GROUPS.map(
  (group) => [group, FIELD_TYPES.filter((type) => type.group === group)] as const,
);

export function AddFieldMenu({
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

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        {triggerVariant === 'dashed' ? (
          <button
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-8 text-sm font-medium text-primary transition-colors hover:border-primary/40 hover:bg-primary/5"
            type="button"
          >
            <Plus className="size-4" />
            {label}
          </button>
        ) : (
          <Button>
            <Plus data-icon="inline-start" />
            {label}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align={align} className="w-80 overflow-hidden p-0" sideOffset={8}>
        <Command>
          <CommandInput placeholder="Search field types..." />
          <CommandList className="max-h-[28rem]">
            <CommandEmpty>No field types found.</CommandEmpty>
            {groupedFieldTypes.map(([group, types]) => (
              <CommandGroup
                className="[&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:uppercase"
                heading={group}
                key={group}
              >
                {types.map((type) => {
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
      </PopoverContent>
    </Popover>
  );
}
