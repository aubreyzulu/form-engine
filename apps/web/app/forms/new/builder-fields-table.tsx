'use client';

import { ArrowDown, ArrowUp, Copy, Pencil } from 'lucide-react';

import { AddFieldMenu } from '@/app/forms/new/add-field-menu';
import type { BuilderField, FieldType } from '@/app/forms/new/field-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function BuilderFieldsTable({
  fields,
  editingId,
  onEdit,
  onDuplicate,
  onMove,
  onAdd,
}: {
  fields: BuilderField[];
  editingId: string | null;
  onEdit: (id: string) => void;
  onDuplicate: (index: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onAdd: (type: FieldType) => void;
}) {
  return (
    <>
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
              <TableCell className="px-6 py-12 text-center text-muted-foreground" colSpan={5}>
                No fields yet. Add your first field to start building the form.
              </TableCell>
            </TableRow>
          ) : (
            fields.map((field, index) => (
              <BuilderFieldRow
                field={field}
                index={index}
                isEditing={field.id === editingId}
                isFirst={index === 0}
                isLast={index === fields.length - 1}
                key={field.id}
                onDuplicate={() => onDuplicate(index)}
                onEdit={() => onEdit(field.id)}
                onMoveDown={() => onMove(index, 1)}
                onMoveUp={() => onMove(index, -1)}
              />
            ))
          )}
        </TableBody>
      </Table>

      <div className="p-6">
        <AddFieldMenu
          align="center"
          label="Add another field"
          onAdd={onAdd}
          triggerVariant="dashed"
        />
      </div>
    </>
  );
}

function BuilderFieldRow({
  field,
  index,
  isEditing,
  isFirst,
  isLast,
  onEdit,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: {
  field: BuilderField;
  index: number;
  isEditing: boolean;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const Icon = field.type.icon;

  return (
    <TableRow
      className={
        isEditing
          ? 'cursor-pointer border-l-2 border-l-primary bg-primary/5 hover:bg-primary/5'
          : 'cursor-pointer'
      }
      onClick={onEdit}
    >
      <TableCell className="px-6 py-5 text-muted-foreground">{index + 1}</TableCell>
      <TableCell className="font-medium">
        <span className="flex flex-col gap-0.5">
          {field.label}
          {field.helperText && (
            <span className="text-xs font-normal text-muted-foreground">{field.helperText}</span>
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
          <Badge className="rounded-md bg-primary/10 text-primary">Required</Badge>
        )}
      </TableCell>
      <TableCell className="px-6">
        <div className="flex items-center justify-end gap-2">
          <FieldRowAction icon={Pencil} label={`Edit ${field.label}`} onClick={onEdit} />
          <FieldRowAction icon={Copy} label={`Duplicate ${field.label}`} onClick={onDuplicate} />
          <FieldRowAction
            disabled={isFirst}
            icon={ArrowUp}
            label={`Move ${field.label} up`}
            onClick={onMoveUp}
          />
          <FieldRowAction
            disabled={isLast}
            icon={ArrowDown}
            label={`Move ${field.label} down`}
            onClick={onMoveDown}
          />
        </div>
      </TableCell>
    </TableRow>
  );
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
