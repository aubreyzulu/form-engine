/**
 * Shared form-engine types — the contract used by both the API (authoritative
 * validation) and the web app (UX validation). Keeping these in one package is
 * what prevents client/server rule drift.
 */

/** A JSON Schema document (draft 2020-12). Kept loose on purpose: the whole point
 *  of the engine is that the schema is dynamic, user-defined configuration. */
export type JsonSchema = Record<string, unknown>;

/** Lifecycle of a form configuration version. Only PUBLISHED accepts submissions;
 *  PUBLISHED versions are immutable (historical integrity). */
export type FormVersionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

/** Widget hints for the renderer. Presentation lives here, NOT in the JSON Schema,
 *  so the validation schema stays clean and reusable. */
export type FieldWidget =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'checkboxes'
  | 'date';

export interface UiFieldConfig {
  widget?: FieldWidget;
  label?: string;
  placeholder?: string;
  help?: string;
}

export interface UiSchema {
  /** Explicit field render order (property keys). Falls back to schema order. */
  order?: string[];
  /** Per-field presentation config, keyed by property name. */
  fields?: Record<string, UiFieldConfig>;
}

/** Normalised validation error — the single shape consumed by the API error
 *  envelope and the frontend field-error rendering. */
export interface ValidationError {
  /** Property name the error applies to (empty string for root-level errors). */
  field: string;
  /** The JSON Schema keyword that failed (e.g. "required", "maximum"). */
  keyword: string;
  /** Human-readable message. */
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
