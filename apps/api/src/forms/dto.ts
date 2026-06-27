import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateFormDto {
  @ApiProperty({ example: 'bo-declaration', description: 'Stable slug used in URLs/API.' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'key must be a lowercase kebab-case slug',
  })
  @MaxLength(100)
  key!: string;

  @ApiProperty({ example: 'Beneficial Ownership Declaration' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'JSON Schema for the initial draft version.' })
  @IsOptional()
  @IsObject()
  schema?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'UI hints for the initial draft version.' })
  @IsOptional()
  @IsObject()
  uiSchema?: Record<string, unknown>;
}

export class CreateVersionDto {
  @ApiPropertyOptional({
    description:
      'JSON Schema (draft 2020-12) for the new draft. Omit to clone the latest version.',
  })
  @IsOptional()
  @IsObject()
  schema?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  uiSchema?: Record<string, unknown>;
}

export class UpdateVersionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  schema?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  uiSchema?: Record<string, unknown>;
}
