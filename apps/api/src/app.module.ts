import { Module } from '@nestjs/common';

import { FormsModule } from './forms/forms.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { SubmissionsModule } from './submissions/submissions.module';

@Module({
  imports: [PrismaModule, HealthModule, FormsModule, SubmissionsModule],
})
export class AppModule {}
