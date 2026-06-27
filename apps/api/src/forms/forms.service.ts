import { Injectable } from '@nestjs/common';
import { type Form, type FormVersion, Prisma } from '@prisma/client';
import {
  type JsonSchema,
  validateSchemaDocument,
  validateSupportedFields,
  validateUiSchemaReferences,
} from '@formbuilder/shared';

import {
  ConflictError,
  ErrorCode,
  NotFoundError,
  UnprocessableError,
} from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateFormDto, CreateVersionDto, UpdateVersionDto } from './dto';

/** Default empty schema used when a form is created without an initial config. */
const EMPTY_SCHEMA: Prisma.InputJsonValue = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  properties: {},
  additionalProperties: false,
};

/** Shape returned by `listForms` — status badge, current published version, and
 *  submission count the creator's dashboard needs (journeys G2/G3). */
export interface FormListItem {
  id: string;
  key: string;
  name: string;
  description: string | null;
  status: FormVersion['status'] | null;
  latestVersion: number | null;
  publishedVersion: number | null;
  publishedAt: Date | null;
  submissionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class FormsService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Forms -----------------------------------------------------------------

  async createForm(dto: CreateFormDto): Promise<Form> {
    const schema = dto.schema ?? EMPTY_SCHEMA;
    this.assertValidSchema(schema);
    this.assertUiSchemaReferences(schema, dto.uiSchema);

    const existing = await this.prisma.form.findUnique({ where: { key: dto.key } });
    if (existing) {
      throw new ConflictError(ErrorCode.FORM_KEY_TAKEN, `Form key "${dto.key}" is already in use.`);
    }

    return this.prisma.form.create({
      data: {
        key: dto.key,
        name: dto.name,
        description: dto.description,
        versions: {
          create: {
            version: 1,
            status: 'DRAFT',
            schema: schema as Prisma.InputJsonValue,
            uiSchema: (dto.uiSchema ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          },
        },
      },
    });
  }

  /**
   * Forms list for the creator's dashboard. Each row carries the status badge
   * (latest version's status, incl. DRAFT-only forms), the current published
   * version if any, and the total submission count. See journeys G2/G3.
   */
  async listForms(): Promise<FormListItem[]> {
    const forms = await this.prisma.form.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          select: {
            version: true,
            status: true,
            publishedAt: true,
            _count: { select: { submissions: true } },
          },
        },
      },
    });

    return forms.map((form) => {
      const latest = form.versions[0];
      const published = form.versions.find((v) => v.status === 'PUBLISHED');
      const submissionCount = form.versions.reduce((sum, v) => sum + v._count.submissions, 0);
      return {
        id: form.id,
        key: form.key,
        name: form.name,
        description: form.description,
        status: latest?.status ?? null,
        latestVersion: latest?.version ?? null,
        publishedVersion: published?.version ?? null,
        publishedAt: published?.publishedAt ?? null,
        submissionCount,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt,
      };
    });
  }

  /** Form metadata + its current published version (the renderer's entry point). */
  async getFormWithCurrentVersion(key: string): Promise<{ form: Form; version: FormVersion }> {
    const form = await this.findFormOrThrow(key);
    const version = await this.getCurrentPublishedVersion(form.id);
    return { form, version };
  }

  /**
   * Authoring read: form + its LATEST version of any status (incl. DRAFT) and the
   * form's total submission count. The creator's manage page needs to load a
   * draft-only form, which the published-only render read cannot serve. See G1.
   */
  async getFormForManage(
    key: string,
  ): Promise<{ form: Form; version: FormVersion; submissionCount: number }> {
    const form = await this.findFormOrThrow(key);
    const version = await this.prisma.formVersion.findFirst({
      where: { formId: form.id },
      orderBy: { version: 'desc' },
    });
    if (!version) {
      // A form is always created with v1, so this is a defensive guard only.
      throw new NotFoundError(ErrorCode.VERSION_NOT_FOUND, `Form "${key}" has no versions.`);
    }
    const submissionCount = await this.prisma.submission.count({
      where: { formVersion: { formId: form.id } },
    });
    return { form, version, submissionCount };
  }

  // --- Versions --------------------------------------------------------------

  async listVersions(key: string): Promise<FormVersion[]> {
    const form = await this.findFormOrThrow(key);
    return this.prisma.formVersion.findMany({
      where: { formId: form.id },
      orderBy: { version: 'asc' },
    });
  }

  async getVersion(key: string, version: number): Promise<FormVersion> {
    const form = await this.findFormOrThrow(key);
    return this.findVersionOrThrow(form.id, version);
  }

  /**
   * Create the next DRAFT version for a form. Config comes from the DTO; when
   * `schema` is omitted the new draft is cloned from the latest version, which
   * is how "edit a published form → new draft v2" works without resending the
   * prior schema (journeys C9/G5).
   */
  async createDraft(key: string, dto: CreateVersionDto): Promise<FormVersion> {
    const form = await this.findFormOrThrow(key);
    const latest = await this.prisma.formVersion.findFirst({
      where: { formId: form.id },
      orderBy: { version: 'desc' },
    });

    const schema = dto.schema ?? latest?.schema;
    if (!schema) {
      throw new NotFoundError(
        ErrorCode.VERSION_NOT_FOUND,
        'No schema provided and no existing version to clone from.',
      );
    }
    const uiSchema = dto.uiSchema ?? latest?.uiSchema ?? undefined;
    this.assertValidSchema(schema);
    this.assertUiSchemaReferences(schema, uiSchema);

    const nextVersion = (latest?.version ?? 0) + 1;

    return this.prisma.formVersion.create({
      data: {
        formId: form.id,
        version: nextVersion,
        status: 'DRAFT',
        schema: schema as Prisma.InputJsonValue,
        uiSchema: (uiSchema ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Edit a DRAFT version. PUBLISHED/ARCHIVED versions are immutable — attempting
   * to edit one is the rule historical integrity rests on, and returns 409.
   */
  async updateDraft(key: string, version: number, dto: UpdateVersionDto): Promise<FormVersion> {
    const form = await this.findFormOrThrow(key);
    const existing = await this.findVersionOrThrow(form.id, version);
    this.assertEditable(existing);
    if (dto.schema) this.assertValidSchema(dto.schema);

    // Cross-check uiSchema against whichever schema will be in effect after the
    // patch (the incoming one if provided, otherwise the stored one).
    const effectiveSchema = dto.schema ?? existing.schema;
    const effectiveUiSchema = dto.uiSchema ?? existing.uiSchema;
    this.assertUiSchemaReferences(effectiveSchema, effectiveUiSchema);

    return this.prisma.formVersion.update({
      where: { id: existing.id },
      data: {
        ...(dto.schema ? { schema: dto.schema as Prisma.InputJsonValue } : {}),
        ...(dto.uiSchema ? { uiSchema: dto.uiSchema as Prisma.InputJsonValue } : {}),
      },
    });
  }

  /** Freeze a DRAFT into PUBLISHED. Validates the schema is well-formed first. */
  async publish(key: string, version: number): Promise<FormVersion> {
    const form = await this.findFormOrThrow(key);
    const existing = await this.findVersionOrThrow(form.id, version);
    if (existing.status !== 'DRAFT') {
      throw new ConflictError(
        ErrorCode.VERSION_NOT_EDITABLE,
        `Version ${version} is ${existing.status} and cannot be published.`,
      );
    }
    this.assertValidSchema(existing.schema);
    this.assertUiSchemaReferences(existing.schema, existing.uiSchema);

    return this.prisma.formVersion.update({
      where: { id: existing.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
  }

  /** Highest-numbered PUBLISHED version, or throw if a form has none. */
  async getCurrentPublishedVersion(formId: string): Promise<FormVersion> {
    const version = await this.prisma.formVersion.findFirst({
      where: { formId, status: 'PUBLISHED' },
      orderBy: { version: 'desc' },
    });
    if (!version) {
      throw new NotFoundError(
        ErrorCode.NO_PUBLISHED_VERSION,
        'This form has no published version yet.',
      );
    }
    return version;
  }

  // --- Internals -------------------------------------------------------------

  async findFormOrThrow(key: string): Promise<Form> {
    const form = await this.prisma.form.findUnique({ where: { key } });
    if (!form) {
      throw new NotFoundError(ErrorCode.FORM_NOT_FOUND, `Form "${key}" was not found.`);
    }
    return form;
  }

  private async findVersionOrThrow(formId: string, version: number): Promise<FormVersion> {
    const found = await this.prisma.formVersion.findUnique({
      where: { formId_version: { formId, version } },
    });
    if (!found) {
      throw new NotFoundError(ErrorCode.VERSION_NOT_FOUND, `Version ${version} was not found.`);
    }
    return found;
  }

  private assertEditable(version: FormVersion): void {
    if (version.status !== 'DRAFT') {
      throw new ConflictError(
        ErrorCode.VERSION_NOT_EDITABLE,
        `Version ${version.version} is ${version.status} and is immutable.`,
      );
    }
  }

  /**
   * Gate a schema before it is stored or frozen: it must be (1) a structurally
   * valid JSON Schema, and (2) built only from field types the engine supports
   * and can render. We refuse to persist a config we couldn't render back.
   */
  private assertValidSchema(schema: unknown): void {
    const structural = validateSchemaDocument(schema);
    if (!structural.valid) {
      throw new UnprocessableError(
        ErrorCode.SCHEMA_INVALID,
        'The provided JSON Schema is not valid.',
        structural.errors,
      );
    }

    const supported = validateSupportedFields(schema as JsonSchema);
    if (!supported.valid) {
      throw new UnprocessableError(
        ErrorCode.UNSUPPORTED_FIELD_TYPE,
        'The schema uses field types or formats the engine does not support.',
        supported.errors,
      );
    }
  }

  /** Reject a uiSchema that points at fields the schema doesn't define — a config
   *  that would render or order phantom inputs. */
  private assertUiSchemaReferences(schema: unknown, uiSchema: unknown): void {
    const result = validateUiSchemaReferences(schema as JsonSchema, uiSchema);
    if (!result.valid) {
      throw new UnprocessableError(
        ErrorCode.UI_SCHEMA_INVALID,
        'The uiSchema references fields that do not exist in the schema.',
        result.errors,
      );
    }
  }
}
