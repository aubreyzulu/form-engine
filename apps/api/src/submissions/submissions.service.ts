import { Injectable } from '@nestjs/common';
import { type Submission, Prisma } from '@prisma/client';
import { validateSubmission, type JsonSchema } from '@formbuilder/shared';

import { ErrorCode, NotFoundError, UnprocessableError } from '../common/errors';
import { FormsService } from '../forms/forms.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateSubmissionDto, ListSubmissionsQueryDto } from './dto';

export interface PaginatedSubmissions {
  items: Submission[];
  total: number;
  skip: number;
  take: number;
}

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly forms: FormsService,
  ) {}

  /**
   * Validate a payload against the form's CURRENT published version and persist
   * it, pinning that version. Validation is authoritative server-side: an invalid
   * payload is rejected with 422 and nothing is written.
   */
  async create(key: string, dto: CreateSubmissionDto): Promise<Submission> {
    const form = await this.forms.findFormOrThrow(key);
    const version = await this.forms.getCurrentPublishedVersion(form.id);

    const result = validateSubmission(version.schema as JsonSchema, dto.data);
    if (!result.valid) {
      throw new UnprocessableError(
        ErrorCode.SUBMISSION_VALIDATION_FAILED,
        'The submission did not match the form configuration.',
        result.errors,
      );
    }

    return this.prisma.submission.create({
      data: {
        formVersionId: version.id,
        data: dto.data as Prisma.InputJsonValue,
      },
      include: { formVersion: { select: { version: true } } },
    });
  }

  async listForForm(key: string, query: ListSubmissionsQueryDto): Promise<PaginatedSubmissions> {
    const form = await this.forms.findFormOrThrow(key);
    const where = { formVersion: { formId: form.id } };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.submission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { formVersion: { select: { version: true } } },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.submission.count({ where }),
    ]);
    return { items, total, skip: query.skip, take: query.take };
  }

  async getById(id: string): Promise<Submission> {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      include: { formVersion: { select: { version: true, formId: true } } },
    });
    if (!submission) {
      throw new NotFoundError(ErrorCode.SUBMISSION_NOT_FOUND, `Submission "${id}" was not found.`);
    }
    return submission;
  }
}
