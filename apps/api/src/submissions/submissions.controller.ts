import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CreateSubmissionDto, ListSubmissionsQueryDto } from './dto';
import { SubmissionsService } from './submissions.service';

@ApiTags('submissions')
@Controller()
export class SubmissionsController {
  constructor(private readonly submissions: SubmissionsService) {}

  @Post('forms/:key/submissions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit a response to the current published form version',
    description:
      'Validates the payload against the current published schema and persists it pinned to that version.',
  })
  @ApiParam({ name: 'key', description: 'Stable form slug.', example: 'bo-declaration' })
  @ApiBody({ type: CreateSubmissionDto })
  @ApiResponse({ status: 201, description: 'Submission accepted and version-pinned.' })
  @ApiResponse({ status: 404, description: 'FORM_NOT_FOUND or NO_PUBLISHED_VERSION.' })
  @ApiResponse({ status: 422, description: 'SUBMISSION_VALIDATION_FAILED.' })
  create(@Param('key') key: string, @Body() dto: CreateSubmissionDto) {
    return this.submissions.create(key, dto);
  }

  @Get('forms/:key/submissions')
  @ApiOperation({
    summary: 'List submissions for a form',
    description: 'Returns submissions across all versions of the form, newest first.',
  })
  @ApiParam({ name: 'key', description: 'Stable form slug.', example: 'bo-declaration' })
  @ApiQuery({ name: 'skip', required: false, example: 0, description: 'Rows to skip.' })
  @ApiQuery({ name: 'take', required: false, example: 50, description: 'Rows to return, max 200.' })
  @ApiResponse({ status: 200, description: 'Paginated submissions returned.' })
  @ApiResponse({ status: 400, description: 'Invalid pagination query.' })
  @ApiResponse({ status: 404, description: 'FORM_NOT_FOUND.' })
  list(@Param('key') key: string, @Query() query: ListSubmissionsQueryDto) {
    return this.submissions.listForForm(key, query);
  }

  @Get('submissions/:id')
  @ApiOperation({ summary: 'Get one submission by id' })
  @ApiParam({ name: 'id', description: 'Submission UUID.' })
  @ApiResponse({ status: 200, description: 'Submission returned with form version metadata.' })
  @ApiResponse({ status: 404, description: 'SUBMISSION_NOT_FOUND.' })
  getOne(@Param('id') id: string) {
    return this.submissions.getById(id);
  }
}
