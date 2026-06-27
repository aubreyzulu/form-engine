import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CreateSubmissionDto, ListSubmissionsQueryDto } from './dto';
import { SubmissionsService } from './submissions.service';

@ApiTags('submissions')
@Controller()
export class SubmissionsController {
  constructor(private readonly submissions: SubmissionsService) {}

  @Post('forms/:key/submissions')
  @HttpCode(HttpStatus.CREATED)
  create(@Param('key') key: string, @Body() dto: CreateSubmissionDto) {
    return this.submissions.create(key, dto);
  }

  @Get('forms/:key/submissions')
  list(@Param('key') key: string, @Query() query: ListSubmissionsQueryDto) {
    return this.submissions.listForForm(key, query);
  }

  @Get('submissions/:id')
  getOne(@Param('id') id: string) {
    return this.submissions.getById(id);
  }
}
