import { Module } from '@nestjs/common';
import { ProfileModule } from './profile/profile.module';
import { PrismaService } from './prisma.service';

@Module({
  imports: [ProfileModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
