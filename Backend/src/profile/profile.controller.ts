import { Body, Controller, Get, Post, Query, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { recoverMessageAddress } from 'viem';
import { ProfileService } from './profile.service';
import { SignedProfilePayload, UpdateProfileDto } from './dto';
import { Profile } from '@prisma/client';

@Controller()
export class ProfileController {
  constructor(private readonly service: ProfileService) {}

  @Get('/health')
  health() {
    return { ok: true };
  }

  @Get('/profile')
  async getProfile(@Query('address') address?: string): Promise<Profile> {
    if (!address) throw new BadRequestException('Missing address');
    return this.service.getProfile(address);
  }

  @Post('/profile')
  async updateProfile(@Body() body: SignedProfilePayload): Promise<Profile> {
    const { address, profile, signature, message } = body;
    if (!address || !profile || !signature || !message) {
      throw new BadRequestException('Invalid payload');
    }

    const recovered = await recoverMessageAddress({ message, signature });
    if (recovered.toLowerCase() !== address.toLowerCase()) {
      throw new UnauthorizedException('Signature verification failed');
    }

    return this.service.saveProfile(address, profile as UpdateProfileDto);
  }
}
