import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CreateFormDto, CreateVersionDto, UpdateVersionDto } from './dto';
import { FormsService } from './forms.service';

@ApiTags('forms')
@Controller('forms')
export class FormsController {
  constructor(private readonly forms: FormsService) {}

  @Get()
  list() {
    return this.forms.listForms();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateFormDto) {
    return this.forms.createForm(dto);
  }

  /** Form metadata + current published version — the endpoint the renderer calls. */
  @Get(':key')
  async getForm(@Param('key') key: string) {
    const { form, version } = await this.forms.getFormWithCurrentVersion(key);
    return {
      id: form.id,
      key: form.key,
      name: form.name,
      description: form.description,
      version: version.version,
      schema: version.schema,
      uiSchema: version.uiSchema,
      publishedAt: version.publishedAt,
    };
  }

  /** Authoring read: form + latest version of any status + submission count.
   *  The creator's manage page uses this; it loads draft-only forms (see G1). */
  @Get(':key/manage')
  async manageForm(@Param('key') key: string) {
    const { form, version, submissionCount } = await this.forms.getFormForManage(key);
    return {
      id: form.id,
      key: form.key,
      name: form.name,
      description: form.description,
      submissionCount,
      version: {
        version: version.version,
        status: version.status,
        schema: version.schema,
        uiSchema: version.uiSchema,
        publishedAt: version.publishedAt,
        createdAt: version.createdAt,
      },
    };
  }

  @Get(':key/versions')
  listVersions(@Param('key') key: string) {
    return this.forms.listVersions(key);
  }

  @Get(':key/versions/:version')
  getVersion(@Param('key') key: string, @Param('version', ParseIntPipe) version: number) {
    return this.forms.getVersion(key, version);
  }

  @Post(':key/versions')
  @HttpCode(HttpStatus.CREATED)
  createVersion(@Param('key') key: string, @Body() dto: CreateVersionDto) {
    return this.forms.createDraft(key, dto);
  }

  @Patch(':key/versions/:version')
  updateVersion(
    @Param('key') key: string,
    @Param('version', ParseIntPipe) version: number,
    @Body() dto: UpdateVersionDto,
  ) {
    return this.forms.updateDraft(key, version, dto);
  }

  @Post(':key/versions/:version/publish')
  @HttpCode(HttpStatus.OK)
  publish(@Param('key') key: string, @Param('version', ParseIntPipe) version: number) {
    return this.forms.publish(key, version);
  }
}
