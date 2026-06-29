'use client';

import { useState } from 'react';
import { Controller, type Control, type UseFormRegister } from 'react-hook-form';
import { CalendarIcon } from 'lucide-react';

import type { FormValues, RenderField } from '@/app/f/[key]/fill-form-types';
import {
  formatDateValue,
  inputTypeFor,
  numberValue,
  parseDateValue,
  selectValue,
} from '@/app/f/[key]/fill-form-utils';
import type { FieldOption } from '@/app/f/[key]/fill-form-types';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { readPrimitiveArray, type PrimitiveOptionValue } from '@/lib/schema-fields';

export function DynamicField({
  control,
  error,
  field,
  register,
}: {
  control: Control<FormValues>;
  error?: { message?: string };
  field: RenderField;
  register: UseFormRegister<FormValues>;
}) {
  const fieldId = `field-${field.key}`;
  const errorId = `${fieldId}-error`;
  const helpId = `${fieldId}-help`;
  const describedBy = [field.help ? helpId : null, error?.message ? errorId : null]
    .filter(Boolean)
    .join(' ');
  const invalid = Boolean(error);

  if (field.widget === 'checkbox') {
    return (
      <Field data-invalid={invalid} orientation="horizontal">
        <Controller
          control={control}
          name={field.key}
          render={({ field: controlField }) => (
            <Checkbox
              aria-describedby={describedBy || undefined}
              aria-invalid={invalid}
              checked={controlField.value === true}
              id={fieldId}
              onCheckedChange={(checked) => controlField.onChange(checked === true)}
            />
          )}
        />
        <FieldContent>
          <FieldLabel htmlFor={fieldId}>
            {field.label}
            {field.required && <span className="text-destructive"> *</span>}
          </FieldLabel>
          <FieldMessages error={error} errorId={errorId} field={field} helpId={helpId} />
        </FieldContent>
      </Field>
    );
  }

  if (field.widget === 'checkboxes') {
    return (
      <FieldSet aria-describedby={describedBy || undefined} data-invalid={invalid}>
        <FieldLegend>
          {field.label}
          {field.required && <span className="text-destructive"> *</span>}
        </FieldLegend>
        <FieldMessages error={error} errorId={errorId} field={field} helpId={helpId} />
        <Controller
          control={control}
          name={field.key}
          render={({ field: controlField }) => {
            const selected = readPrimitiveArray(controlField.value);
            return (
              <FieldGroup data-slot="checkbox-group">
                {field.options.map((option) => {
                  const optionId = `${fieldId}-${optionDomValue(option)}`;
                  return (
                    <Field key={optionDomValue(option)} orientation="horizontal">
                      <Checkbox
                        aria-invalid={invalid}
                        checked={selected.some((current) => current === option.value)}
                        id={optionId}
                        onCheckedChange={(checked) =>
                          controlField.onChange(
                            checked === true
                              ? [...selected, option.value]
                              : selected.filter((current) => current !== option.value),
                          )
                        }
                      />
                      <FieldLabel className="font-normal" htmlFor={optionId}>
                        {option.label}
                      </FieldLabel>
                    </Field>
                  );
                })}
              </FieldGroup>
            );
          }}
        />
      </FieldSet>
    );
  }

  if (field.widget === 'radio') {
    return (
      <FieldSet aria-describedby={describedBy || undefined} data-invalid={invalid}>
        <FieldLegend>
          {field.label}
          {field.required && <span className="text-destructive"> *</span>}
        </FieldLegend>
        <FieldMessages error={error} errorId={errorId} field={field} helpId={helpId} />
        <Controller
          control={control}
          name={field.key}
          render={({ field: controlField }) => (
            <RadioGroup
              data-slot="radio-group"
              onValueChange={(value) => controlField.onChange(optionValueFromDom(field, value))}
              value={selectedOptionDomValue(field.options, controlField.value)}
            >
              {field.options.map((option) => (
                <Field key={optionDomValue(option)} orientation="horizontal">
                  <RadioGroupItem
                    aria-invalid={invalid}
                    id={`${fieldId}-${optionDomValue(option)}`}
                    value={optionDomValue(option)}
                  />
                  <FieldLabel
                    className="font-normal"
                    htmlFor={`${fieldId}-${optionDomValue(option)}`}
                  >
                    {option.label}
                  </FieldLabel>
                </Field>
              ))}
            </RadioGroup>
          )}
        />
      </FieldSet>
    );
  }

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={fieldId}>
        {field.label}
        {field.required && <span className="text-destructive"> *</span>}
      </FieldLabel>
      <InputField
        control={control}
        describedBy={describedBy}
        field={field}
        fieldId={fieldId}
        hasError={invalid}
        register={register}
      />
      <FieldMessages error={error} errorId={errorId} field={field} helpId={helpId} />
    </Field>
  );
}

function DatePickerField({
  control,
  describedBy,
  field,
  fieldId,
  hasError,
}: {
  control: Control<FormValues>;
  describedBy: string;
  field: RenderField;
  fieldId: string;
  hasError: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Controller
      control={control}
      name={field.key}
      render={({ field: controlField }) => {
        const selectedDate = parseDateValue(controlField.value);
        return (
          <Popover onOpenChange={setOpen} open={open}>
            <PopoverTrigger asChild>
              <Button
                aria-describedby={describedBy || undefined}
                aria-invalid={hasError}
                className="h-10 w-full justify-start text-left font-normal"
                id={fieldId}
                type="button"
                variant="outline"
              >
                <CalendarIcon data-icon="inline-start" />
                {selectedDate
                  ? formatDateValue(selectedDate)
                  : (field.placeholder ?? 'Select date')}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                onSelect={(date) => {
                  controlField.onChange(date ? formatDateValue(date) : '');
                  setOpen(false);
                }}
                selected={selectedDate}
              />
            </PopoverContent>
          </Popover>
        );
      }}
    />
  );
}

function InputField({
  control,
  describedBy,
  field,
  fieldId,
  hasError,
  register,
}: {
  control: Control<FormValues>;
  describedBy: string;
  field: RenderField;
  fieldId: string;
  hasError: boolean;
  register: UseFormRegister<FormValues>;
}) {
  if (field.widget === 'textarea') {
    return (
      <Textarea
        aria-describedby={describedBy || undefined}
        aria-invalid={hasError}
        id={fieldId}
        placeholder={field.placeholder}
        {...register(field.key)}
      />
    );
  }

  if (field.widget === 'select') {
    return (
      <NativeSelect
        aria-describedby={describedBy || undefined}
        aria-invalid={hasError}
        className="w-full"
        id={fieldId}
        {...register(field.key, { setValueAs: (value) => selectValue(field, value) })}
      >
        <NativeSelectOption value="">Select an option</NativeSelectOption>
        {field.options.map((option) => (
          <NativeSelectOption key={optionDomValue(option)} value={String(option.value)}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    );
  }

  if (field.widget === 'date' || field.format === 'date') {
    return (
      <DatePickerField
        control={control}
        describedBy={describedBy}
        field={field}
        fieldId={fieldId}
        hasError={hasError}
      />
    );
  }

  const inputType = inputTypeFor(field);
  return (
    <Input
      aria-describedby={describedBy || undefined}
      aria-invalid={hasError}
      id={fieldId}
      placeholder={field.placeholder}
      type={inputType}
      {...register(field.key, inputType === 'number' ? { setValueAs: numberValue } : undefined)}
    />
  );
}

function optionDomValue(option: FieldOption): string {
  return String(option.value);
}

function selectedOptionDomValue(options: FieldOption[], value: unknown): string {
  return options.find((option) => option.value === value) ? String(value) : '';
}

function optionValueFromDom(field: RenderField, value: string): PrimitiveOptionValue | undefined {
  if (value === '') return undefined;
  return field.options.find((option) => String(option.value) === value)?.value;
}

function FieldMessages({
  error,
  errorId,
  field,
  helpId,
}: {
  error?: { message?: string };
  errorId: string;
  field: RenderField;
  helpId: string;
}) {
  return (
    <>
      {field.help && <FieldDescription id={helpId}>{field.help}</FieldDescription>}
      <FieldError id={errorId}>{error?.message}</FieldError>
    </>
  );
}
