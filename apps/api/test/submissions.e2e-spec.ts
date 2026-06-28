import 'reflect-metadata';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/all-exceptions.filter';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Submission flow + error envelope, end to end against a real Postgres.
 * Requires DATABASE_URL pointing at a disposable test database with migrations
 * applied (see docs/07-testing.md). The suite cleans up the form it creates so
 * it is safe to re-run.
 */
const SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  additionalProperties: false,
  required: ['fullName', 'ownershipPercent'],
  properties: {
    fullName: { type: 'string', minLength: 1 },
    ownershipPercent: { type: 'number', minimum: 0, maximum: 100 },
  },
};

describe('Submissions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const key = `e2e-bo-${Date.now()}`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    // Mirror main.ts so the e2e surface matches production behaviour.
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = app.get(PrismaService);

    // Create a form, publish v1, so the form is collecting submissions.
    await request(app.getHttpServer())
      .post('/api/v1/forms')
      .send({ key, name: 'E2E BO', schema: SCHEMA })
      .expect(201);
    await request(app.getHttpServer()).post(`/api/v1/forms/${key}/versions/1/publish`).expect(200);
  });

  afterAll(async () => {
    // Submissions intentionally restrict version deletion in production, so tests
    // clean their response rows before deleting the generated form + versions.
    await prisma.submission.deleteMany({
      where: { formVersion: { form: { key } } },
    });
    await prisma.form.deleteMany({ where: { key } });
    await app.close();
  });

  it('accepts a valid payload (201) and pins the current published version', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/forms/${key}/submissions`)
      .send({ data: { fullName: 'Ada', ownershipPercent: 42 } })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.formVersion.version).toBe(1);
  });

  it('rejects an invalid payload (422) with the error envelope and writes nothing', async () => {
    const before = await request(app.getHttpServer())
      .get(`/api/v1/forms/${key}/submissions`)
      .expect(200);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/forms/${key}/submissions`)
      .send({ data: { fullName: '', ownershipPercent: 150 } })
      .expect(422);

    expect(res.body.error.code).toBe('SUBMISSION_VALIDATION_FAILED');
    expect(Array.isArray(res.body.error.details)).toBe(true);

    const after = await request(app.getHttpServer())
      .get(`/api/v1/forms/${key}/submissions`)
      .expect(200);
    expect(after.body.total).toBe(before.body.total);
  });

  it('returns the error envelope shape on 404 for an unknown form', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/forms/does-not-exist/submissions')
      .send({ data: { fullName: 'Ada', ownershipPercent: 1 } })
      .expect(404);
    expect(res.body.error.code).toBe('FORM_NOT_FOUND');
  });

  it('keeps an old submission valid against its pinned version after a newer version publishes', async () => {
    // v1 already published. Publish a v2 with a stricter rule (max 50).
    const stricter = {
      ...SCHEMA,
      properties: {
        ...SCHEMA.properties,
        ownershipPercent: { type: 'number', minimum: 0, maximum: 50 },
      },
    };
    await request(app.getHttpServer())
      .post(`/api/v1/forms/${key}/versions`)
      .send({ schema: stricter })
      .expect(201);
    await request(app.getHttpServer()).post(`/api/v1/forms/${key}/versions/2/publish`).expect(200);

    // A value legal under v1 (80) but illegal under v2 is now rejected on submit
    // (new submissions use the current published version, v2).
    await request(app.getHttpServer())
      .post(`/api/v1/forms/${key}/submissions`)
      .send({ data: { fullName: 'Grace', ownershipPercent: 80 } })
      .expect(422);

    // The earlier submission (42, made under v1) still references v1 and is
    // unaffected — historical integrity. It is the only persisted submission.
    const list = await request(app.getHttpServer())
      .get(`/api/v1/forms/${key}/submissions`)
      .expect(200);
    expect(list.body.total).toBe(1);
    expect(list.body.items[0].formVersion.version).toBe(1);
  });
});
