import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

interface SeedForm {
  key: string;
  name: string;
  description: string;
  schema: Prisma.InputJsonValue;
  uiSchema: Prisma.InputJsonValue;
}

const forms: SeedForm[] = [
  {
    key: 'bo-declaration',
    name: 'Beneficial Ownership Declaration',
    description: 'Declare a beneficial owner and their level of control.',
    schema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      additionalProperties: false,
      required: ['fullName', 'country', 'ownershipPercent', 'natureOfControl'],
      properties: {
        fullName: { type: 'string', minLength: 1, maxLength: 200 },
        email: { type: 'string', format: 'email' },
        country: { type: 'string', enum: ['GB', 'US', 'ZM', 'NG', 'KE'] },
        ownershipPercent: { type: 'number', minimum: 0, maximum: 100 },
        natureOfControl: {
          type: 'string',
          enum: ['ownership-of-shares', 'voting-rights', 'right-to-appoint', 'significant-influence'],
        },
        isPEP: { type: 'boolean' },
        appointedOn: { type: 'string', format: 'date' },
        notes: { type: 'string', maxLength: 1000 },
      },
    },
    uiSchema: {
      order: [
        'fullName',
        'email',
        'country',
        'ownershipPercent',
        'natureOfControl',
        'isPEP',
        'appointedOn',
        'notes',
      ],
      fields: {
        fullName: { widget: 'text', label: 'Full legal name', placeholder: 'Jane Doe' },
        email: { widget: 'email', label: 'Email address' },
        country: { widget: 'select', label: 'Country of residence' },
        ownershipPercent: {
          widget: 'number',
          label: 'Ownership (%)',
          help: 'Percentage of shares held, 0–100.',
        },
        natureOfControl: { widget: 'radio', label: 'Nature of control' },
        isPEP: { widget: 'checkbox', label: 'Is a Politically Exposed Person (PEP)' },
        appointedOn: { widget: 'date', label: 'Date appointed' },
        notes: { widget: 'textarea', label: 'Additional notes' },
      },
    },
  },
  {
    key: 'contact-request',
    name: 'Contact Request',
    description: 'A simple second form proving the same engine renders any config.',
    schema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      additionalProperties: false,
      required: ['name', 'email', 'message'],
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 120 },
        email: { type: 'string', format: 'email' },
        topic: { type: 'string', enum: ['general', 'support', 'partnership'] },
        message: { type: 'string', minLength: 10, maxLength: 2000 },
      },
    },
    uiSchema: {
      order: ['name', 'email', 'topic', 'message'],
      fields: {
        name: { widget: 'text', label: 'Your name' },
        email: { widget: 'email', label: 'Email' },
        topic: { widget: 'select', label: 'Topic' },
        message: { widget: 'textarea', label: 'Message', placeholder: 'How can we help?' },
      },
    },
  },
];

async function main(): Promise<void> {
  for (const f of forms) {
    const form = await prisma.form.upsert({
      where: { key: f.key },
      update: { name: f.name, description: f.description },
      create: { key: f.key, name: f.name, description: f.description },
    });

    // Idempotent: only create version 1 (published) if the form has no versions.
    const existing = await prisma.formVersion.findFirst({ where: { formId: form.id } });
    if (!existing) {
      await prisma.formVersion.create({
        data: {
          formId: form.id,
          version: 1,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          schema: f.schema,
          uiSchema: f.uiSchema,
        },
      });
      console.log(`Seeded form "${f.key}" (v1 published).`);
    } else {
      console.log(`Form "${f.key}" already has versions — skipped.`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
