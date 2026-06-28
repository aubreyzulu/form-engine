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
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CreateFormDto, CreateVersionDto, UpdateVersionDto } from './dto';
import { FormsService } from './forms.service';

@ApiTags('forms')
@Controller('forms')
export class FormsController {
  constructor(private readonly forms: FormsService) {}

  @Get()
  @ApiOperation({
    summary: 'List forms for the creator dashboard',
    description:
      'Returns each form with latest-version status, current published version, and total submissions.',
  })
  @ApiResponse({ status: 200, description: 'Forms returned.' })
  list() {
    return this.forms.listForms();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a form draft',
    description:
      'Creates the stable form identity and version 1 as DRAFT. Schema and uiSchema are validated before storage.',
  })
  @ApiBody({ type: CreateFormDto })
  @ApiResponse({ status: 201, description: 'Form created with draft version 1.' })
  @ApiResponse({ status: 400, description: 'Request shape failed DTO validation.' })
  @ApiResponse({ status: 409, description: 'FORM_KEY_TAKEN.' })
  @ApiResponse({
    status: 422,
    description: 'SCHEMA_INVALID, UI_SCHEMA_INVALID, or unsupported fields.',
  })
  create(@Body() dto: CreateFormDto) {
    return this.forms.createForm(dto);
  }

  /** Form metadata + current published version — the endpoint the renderer calls. */
  @Get(':key')
  @ApiOperation({
    summary: 'Get the current published form config',
    description:
      'Render read for public form filling. Draft-only forms return NO_PUBLISHED_VERSION.',
  })
  @ApiParam({ name: 'key', description: 'Stable form slug.', example: 'bo-declaration' })
  @ApiResponse({ status: 200, description: 'Published form config returned.' })
  @ApiResponse({ status: 404, description: 'FORM_NOT_FOUND or NO_PUBLISHED_VERSION.' })
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
  @ApiOperation({
    summary: 'Get the latest form config for authoring',
    description:
      'Authoring read for manage/edit screens. Returns the latest version whether it is DRAFT or PUBLISHED.',
  })
  @ApiParam({ name: 'key', description: 'Stable form slug.', example: 'bo-declaration' })
  @ApiResponse({ status: 200, description: 'Latest authoring config returned.' })
  @ApiResponse({ status: 404, description: 'FORM_NOT_FOUND or VERSION_NOT_FOUND.' })
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
  @ApiOperation({ summary: 'List all versions for a form' })
  @ApiParam({ name: 'key', description: 'Stable form slug.', example: 'bo-declaration' })
  @ApiResponse({ status: 200, description: 'Versions returned in ascending order.' })
  @ApiResponse({ status: 404, description: 'FORM_NOT_FOUND.' })
  listVersions(@Param('key') key: string) {
    return this.forms.listVersions(key);
  }

  @Get(':key/versions/:version')
  @ApiOperation({ summary: 'Get a specific form version' })
  @ApiParam({ name: 'key', description: 'Stable form slug.', example: 'bo-declaration' })
  @ApiParam({ name: 'version', description: 'Integer version number.', example: 1 })
  @ApiResponse({ status: 200, description: 'Version returned.' })
  @ApiResponse({ status: 400, description: 'Invalid version parameter.' })
  @ApiResponse({ status: 404, description: 'FORM_NOT_FOUND or VERSION_NOT_FOUND.' })
  getVersion(@Param('key') key: string, @Param('version', ParseIntPipe) version: number) {
    return this.forms.getVersion(key, version);
  }

  @Post(':key/versions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new draft version',
    description:
      'Creates the next DRAFT. Omit schema/uiSchema to clone the latest version for editing a published form.',
  })
  @ApiParam({ name: 'key', description: 'Stable form slug.', example: 'bo-declaration' })
  @ApiBody({ type: CreateVersionDto })
  @ApiResponse({ status: 201, description: 'Draft version created.' })
  @ApiResponse({ status: 400, description: 'Request shape failed DTO validation.' })
  @ApiResponse({ status: 404, description: 'FORM_NOT_FOUND or VERSION_NOT_FOUND.' })
  @ApiResponse({
    status: 422,
    description: 'SCHEMA_INVALID, UI_SCHEMA_INVALID, or unsupported fields.',
  })
  createVersion(@Param('key') key: string, @Body() dto: CreateVersionDto) {
    return this.forms.createDraft(key, dto);
  }

  @Patch(':key/versions/:version')
  @ApiOperation({
    summary: 'Update a draft version',
    description: 'Only DRAFT versions are editable. PUBLISHED and ARCHIVED versions return 409.',
  })
  @ApiParam({ name: 'key', description: 'Stable form slug.', example: 'bo-declaration' })
  @ApiParam({ name: 'version', description: 'Integer version number.', example: 1 })
  @ApiBody({ type: UpdateVersionDto })
  @ApiResponse({ status: 200, description: 'Draft version updated.' })
  @ApiResponse({ status: 400, description: 'Invalid version parameter or request body.' })
  @ApiResponse({ status: 404, description: 'FORM_NOT_FOUND or VERSION_NOT_FOUND.' })
  @ApiResponse({ status: 409, description: 'VERSION_NOT_EDITABLE.' })
  @ApiResponse({
    status: 422,
    description: 'SCHEMA_INVALID, UI_SCHEMA_INVALID, or unsupported fields.',
  })
  updateVersion(
    @Param('key') key: string,
    @Param('version', ParseIntPipe) version: number,
    @Body() dto: UpdateVersionDto,
  ) {
    return this.forms.updateDraft(key, version, dto);
  }

  @Post(':key/versions/:version/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Publish a draft version',
    description:
      'Freezes a DRAFT as PUBLISHED. Published versions are immutable and accept submissions.',
  })
  @ApiParam({ name: 'key', description: 'Stable form slug.', example: 'bo-declaration' })
  @ApiParam({ name: 'version', description: 'Integer version number.', example: 1 })
  @ApiResponse({ status: 200, description: 'Version published.' })
  @ApiResponse({ status: 400, description: 'Invalid version parameter.' })
  @ApiResponse({ status: 404, description: 'FORM_NOT_FOUND or VERSION_NOT_FOUND.' })
  @ApiResponse({ status: 409, description: 'VERSION_NOT_EDITABLE.' })
  @ApiResponse({
    status: 422,
    description: 'SCHEMA_INVALID, UI_SCHEMA_INVALID, or unsupported fields.',
  })
  publish(@Param('key') key: string, @Param('version', ParseIntPipe) version: number) {
    return this.forms.publish(key, version);
  }
}
