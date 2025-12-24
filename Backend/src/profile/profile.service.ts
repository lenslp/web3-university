import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Profile } from '@prisma/client';
import { UpdateProfileDto } from './dto';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(address: string): Promise<Profile> {
    const lower = address.toLowerCase();
    const existing = await this.prisma.profile.findUnique({ where: { walletAddress: lower } });
    if (existing) return existing;
    
    const now = new Date();
    const fallback: Profile = {
      walletAddress: lower,
      name: '未设置',
      email: '',
      bio: '',
      avatar: '🧑',
      joinDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
      totalCourses: 0,
      totalStudying: 0,
      totalSpent: 0,
      rating: 0,
      achievements: [],
      soldCourses: 0,
      totalRevenue: 0,
      certifications: [],
    };
    return fallback;
  }

  async saveProfile(address: string, dto: UpdateProfileDto): Promise<Profile> {
    const lower = address.toLowerCase();
    return this.prisma.profile.upsert({
      where: { walletAddress: lower },
      update: dto,
      create: { ...dto, walletAddress: lower },
    });
  }
}
