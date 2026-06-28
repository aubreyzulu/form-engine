import { Test } from '@nestjs/testing';

import { AppException, ErrorCode } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import { FormsService } from './forms.service';

/** Minimal hand-rolled Prisma mock — we assert on the service rules, not the ORM. */
function createPrismaMock() {
  return {
    form: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    formVersion: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    submission: { count: jest.fn() },
  };
}

type PrismaMock = ReturnType<typeof createPrismaMock>;

const VALID_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  properties: { name: { type: 'string' } },
  additionalProperties: false,
};

function draft(overrides = {}) {
  return {
    id: 'v1',
    formId: 'f1',
    version: 1,
    status: 'DRAFT',
    schema: VALID_SCHEMA,
    uiSchema: null,
    publishedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('FormsService', () => {
  let service: FormsService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const moduleRef = await Test.createTestingModule({
      providers: [FormsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(FormsService);
  });

  describe('publish', () => {
    it('freezes a DRAFT into PUBLISHED and stamps publishedAt', async () => {
      prisma.form.findUnique.mockResolvedValue({ id: 'f1', key: 'k' });
      prisma.formVersion.findUnique.mockResolvedValue(draft());
      prisma.formVersion.update.mockImplementation(({ data }: { data: unknown }) =>
        Promise.resolve({ ...draft(), ...(data as object) }),
      );

      const result = await service.publish('k', 1);

      expect(result.status).toBe('PUBLISHED');
      expect(prisma.formVersion.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'PUBLISHED' }) }),
      );
    });

    it('rejects publishing a non-DRAFT version (409 VERSION_NOT_EDITABLE)', async () => {
      prisma.form.findUnique.mockResolvedValue({ id: 'f1', key: 'k' });
      prisma.formVersion.findUnique.mockResolvedValue(draft({ status: 'PUBLISHED' }));

      await expect(service.publish('k', 1)).rejects.toMatchObject({
        code: ErrorCode.VERSION_NOT_EDITABLE,
      });
      expect(prisma.formVersion.update).not.toHaveBeenCalled();
    });

    it('rejects publishing an empty schema', async () => {
      prisma.form.findUnique.mockResolvedValue({ id: 'f1', key: 'k' });
      prisma.formVersion.findUnique.mockResolvedValue(
        draft({
          schema: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {},
            additionalProperties: false,
          },
        }),
      );

      await expect(service.publish('k', 1)).rejects.toMatchObject({
        code: ErrorCode.SCHEMA_INVALID,
      });
      expect(prisma.formVersion.update).not.toHaveBeenCalled();
    });
  });

  describe('updateDraft (immutability)', () => {
    it('allows editing a DRAFT', async () => {
      prisma.form.findUnique.mockResolvedValue({ id: 'f1', key: 'k' });
      prisma.formVersion.findUnique.mockResolvedValue(draft());
      prisma.formVersion.update.mockResolvedValue(draft());

      await service.updateDraft('k', 1, { schema: VALID_SCHEMA });
      expect(prisma.formVersion.update).toHaveBeenCalled();
    });

    it('persists form metadata while editing a DRAFT version', async () => {
      prisma.form.findUnique.mockResolvedValue({ id: 'f1', key: 'k' });
      prisma.formVersion.findUnique.mockResolvedValue(draft());
      prisma.form.update.mockResolvedValue({ id: 'f1', key: 'k' });
      prisma.formVersion.update.mockResolvedValue(draft());

      await service.updateDraft('k', 1, {
        name: 'Updated declaration',
        description: null,
        schema: VALID_SCHEMA,
      });

      expect(prisma.form.update).toHaveBeenCalledWith({
        where: { id: 'f1' },
        data: { name: 'Updated declaration', description: null },
      });
      expect(prisma.formVersion.update).toHaveBeenCalled();
    });

    it('refuses to edit a PUBLISHED version — the historical-integrity guarantee', async () => {
      prisma.form.findUnique.mockResolvedValue({ id: 'f1', key: 'k' });
      prisma.formVersion.findUnique.mockResolvedValue(draft({ status: 'PUBLISHED' }));

      await expect(service.updateDraft('k', 1, { schema: VALID_SCHEMA })).rejects.toBeInstanceOf(
        AppException,
      );
      expect(prisma.form.update).not.toHaveBeenCalled();
      expect(prisma.formVersion.update).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentPublishedVersion', () => {
    it('returns the highest-numbered PUBLISHED version', async () => {
      prisma.formVersion.findFirst.mockResolvedValue(draft({ version: 3, status: 'PUBLISHED' }));
      const v = await service.getCurrentPublishedVersion('f1');
      expect(v.version).toBe(3);
      expect(prisma.formVersion.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { formId: 'f1', status: 'PUBLISHED' },
          orderBy: { version: 'desc' },
        }),
      );
    });

    it('throws NO_PUBLISHED_VERSION when none is published', async () => {
      prisma.formVersion.findFirst.mockResolvedValue(null);
      await expect(service.getCurrentPublishedVersion('f1')).rejects.toMatchObject({
        code: ErrorCode.NO_PUBLISHED_VERSION,
      });
    });
  });

  describe('createForm', () => {
    it('rejects a duplicate key (409 FORM_KEY_TAKEN)', async () => {
      prisma.form.findUnique.mockResolvedValue({ id: 'f1', key: 'taken' });
      await expect(service.createForm({ key: 'taken', name: 'X' })).rejects.toMatchObject({
        code: ErrorCode.FORM_KEY_TAKEN,
      });
    });

    it('rejects an invalid initial schema (422 SCHEMA_INVALID)', async () => {
      await expect(
        service.createForm({ key: 'k', name: 'X', schema: { type: 'not-a-type' } }),
      ).rejects.toMatchObject({ code: ErrorCode.SCHEMA_INVALID });
    });

    it('rejects an unsupported field type (422 UNSUPPORTED_FIELD_TYPE)', async () => {
      await expect(
        service.createForm({
          key: 'k',
          name: 'X',
          schema: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: { age: { type: 'integer' } },
          },
        }),
      ).rejects.toMatchObject({ code: ErrorCode.UNSUPPORTED_FIELD_TYPE });
    });

    it('rejects a uiSchema referencing an unknown field (422 UI_SCHEMA_INVALID)', async () => {
      await expect(
        service.createForm({
          key: 'k',
          name: 'X',
          schema: VALID_SCHEMA,
          uiSchema: { order: ['ghost'] },
        }),
      ).rejects.toMatchObject({ code: ErrorCode.UI_SCHEMA_INVALID });
    });

    it('rejects duplicate uiSchema order entries (422 UI_SCHEMA_INVALID)', async () => {
      await expect(
        service.createForm({
          key: 'k',
          name: 'X',
          schema: VALID_SCHEMA,
          uiSchema: { order: ['name', 'name'] },
        }),
      ).rejects.toMatchObject({ code: ErrorCode.UI_SCHEMA_INVALID });
    });

    it('rejects impossible validation ranges (422 UNSUPPORTED_FIELD_TYPE)', async () => {
      await expect(
        service.createForm({
          key: 'k',
          name: 'X',
          schema: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: { score: { type: 'number', minimum: 10, maximum: 2 } },
          },
        }),
      ).rejects.toMatchObject({ code: ErrorCode.UNSUPPORTED_FIELD_TYPE });
    });
  });

  describe('listForms (status + counts)', () => {
    it('surfaces latest-version status, published version, and total submission count', async () => {
      prisma.form.findMany.mockResolvedValue([
        {
          id: 'f1',
          key: 'k',
          name: 'N',
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          versions: [
            { version: 2, status: 'DRAFT', publishedAt: null, _count: { submissions: 1 } },
            {
              version: 1,
              status: 'PUBLISHED',
              publishedAt: new Date(),
              _count: { submissions: 4 },
            },
          ],
        },
      ]);

      const [item] = await service.listForms();
      expect(item).toMatchObject({
        status: 'DRAFT',
        latestVersion: 2,
        publishedVersion: 1,
        submissionCount: 5,
      });
    });

    it('reports a draft-only form with no published version', async () => {
      prisma.form.findMany.mockResolvedValue([
        {
          id: 'f1',
          key: 'k',
          name: 'N',
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          versions: [
            { version: 1, status: 'DRAFT', publishedAt: null, _count: { submissions: 0 } },
          ],
        },
      ]);

      const [item] = await service.listForms();
      expect(item).toMatchObject({ status: 'DRAFT', publishedVersion: null, submissionCount: 0 });
    });
  });

  describe('getFormForManage (authoring read)', () => {
    it('returns the latest version, published version, and submission count', async () => {
      prisma.form.findUnique.mockResolvedValue({ id: 'f1', key: 'k' });
      prisma.formVersion.findFirst
        .mockResolvedValueOnce(draft({ version: 2, status: 'DRAFT' }))
        .mockResolvedValueOnce(draft({ version: 1, status: 'PUBLISHED' }));
      prisma.submission.count.mockResolvedValue(7);

      const result = await service.getFormForManage('k');
      expect(result.version.version).toBe(2);
      expect(result.publishedVersion).toBe(1);
      expect(result.submissionCount).toBe(7);
      expect(prisma.formVersion.findFirst).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ orderBy: { version: 'desc' } }),
      );
      expect(prisma.formVersion.findFirst).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ where: { formId: 'f1', status: 'PUBLISHED' } }),
      );
    });
  });

  describe('createDraft (clone-from-latest)', () => {
    it('clones the latest version schema when none is supplied', async () => {
      prisma.form.findUnique.mockResolvedValue({ id: 'f1', key: 'k' });
      prisma.formVersion.findFirst.mockResolvedValue(draft({ version: 2, schema: VALID_SCHEMA }));
      prisma.formVersion.create.mockImplementation(({ data }: { data: unknown }) =>
        Promise.resolve({ ...draft(), ...(data as object) }),
      );

      const result = await service.createDraft('k', {});
      expect(result.version).toBe(3);
      expect(prisma.formVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ schema: VALID_SCHEMA }) }),
      );
    });
  });
});
