import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsObject, IsOptional, Max, Min } from 'class-validator';

export class CreateSubmissionDto {
  @ApiProperty({
    description: 'The user response payload, validated against the form schema.',
    example: { fullName: 'Ada Lovelace', country: 'GB', ownershipPercent: 42 },
  })
  @IsObject()
  data!: Record<string, unknown>;
}

export class ListSubmissionsQueryDto {
  @ApiPropertyOptional({ description: 'Rows to skip.', default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip = 0;

  @ApiPropertyOptional({ description: 'Max rows to return.', default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  take = 50;
}
