import { Module } from '@nestjs/common';
import { ProfileModule } from './profile/profile.module';
import { DefiModule } from './defi/defi.module';
import { PrismaService } from './prisma.service';

@Module({
  imports: [ProfileModule, DefiModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
