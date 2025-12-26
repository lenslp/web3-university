import { Body, Controller, Get, Post, Query, BadRequestException, UnauthorizedException, Headers } from '@nestjs/common';
import { SiweMessage } from 'siwe';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto';
import { Profile } from '@prisma/client';
import { randomBytes } from 'crypto';

interface SessionData {
  address: string;
  createdAt: number;
  expiresAt: number;
}

@Controller()
export class ProfileController {
  // 简单内存存储 nonce（生产建议用 Redis）
  private nonceStore = new Map<string, { nonce: string; createdAt: number }>();
  // 会话存储（签名后获得的短期令牌）
  private sessionStore = new Map<string, SessionData>();

  constructor(private readonly service: ProfileService) {
    // 定期清理过期 nonce 和会话（每分钟）
    setInterval(() => {
      this.cleanExpiredNonces();
      this.cleanExpiredSessions();
    }, 60_000);
  }

  @Get('/health')
  health() {
    return { ok: true };
  }

  @Get('/profile')
  async getProfile(@Query('address') address?: string): Promise<Profile> {
    if (!address) throw new BadRequestException('Missing address');
    return this.service.getProfile(address);
  }

  @Get('/profile/nonce')
  async getNonce(@Query('address') address?: string): Promise<{ nonce: string }> {
    if (!address || !/^0x[a-fA-F0-9]{40}$/i.test(address)) {
      throw new BadRequestException('Invalid address');
    }

    // 生成符合 SIWE 要求的 nonce（alphanumeric，无特殊字符）
    const nonce = randomBytes(16).toString('hex'); // 32 个十六进制字符（0-9a-f）

    this.nonceStore.set(address.toLowerCase(), {
      nonce,
      createdAt: Date.now(),
    });

    return { nonce };
  }

  @Post('/profile/auth')
  async authenticate(@Body() body: { address: string; signature: string; message: string }): Promise<{ token: string; expiresIn: number }> {
    const { address, signature, message } = body;

    if (!address || !signature || !message) {
      throw new BadRequestException('Missing required fields');
    }

    // ========== 1. 验证 nonce 是否存在 ==========
    const stored = this.nonceStore.get(address.toLowerCase());
    if (!stored) {
      throw new UnauthorizedException('Invalid or expired nonce');
    }

    // ========== 2. 验证 SIWE 消息与签名 ==========
    try {
      const siweMessage = new SiweMessage(message);

      // 地址匹配
      if (siweMessage.address.toLowerCase() !== address.toLowerCase()) {
        throw new UnauthorizedException('Address mismatch');
      }

      // nonce 匹配（防重放）
      if (siweMessage.nonce !== stored.nonce) {
        throw new UnauthorizedException('Invalid or expired nonce');
      }

      const verification = await siweMessage.verify({
        signature,
        nonce: stored.nonce,
        time: new Date().toISOString(),
      });

      if (!verification.success) {
        throw new UnauthorizedException('Signature verification failed');
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid SIWE message or signature');
    }

    // SIWE 验证通过，立即删除 nonce（防止重放）
    this.nonceStore.delete(address.toLowerCase());

    // ========== 3. 颁发会话令牌 ==========
    const now = Date.now();
    const sessionToken = randomBytes(16).toString('hex'); // alphanumeric session token
    const expiresAt = now + 5 * 60 * 1000; // 5 分钟有效期

    this.sessionStore.set(sessionToken, {
      address: address.toLowerCase(),
      createdAt: now,
      expiresAt,
    });

    return {
      token: sessionToken,
      expiresIn: 5 * 60, // 秒
    };
  }

  @Post('/profile')
  async updateProfile(
    @Headers('authorization') authHeader: string | undefined,
    @Body() body: { address: string; profile: UpdateProfileDto }
  ): Promise<Profile> {
    const { address, profile } = body;

    if (!address || !profile) {
      throw new BadRequestException('Invalid payload');
    }

    // 提取 Bearer token
    const token = authHeader?.replace('Bearer ', '');

    // ========== 验证会话令牌 ==========
    if (!this.verifySession(token, address)) {
      throw new UnauthorizedException('Invalid or expired session. Please sign in again.');
    }

    // ========== 会话有效，直接更新资料（无需签名）==========
    return this.service.saveProfile(address, profile);
  }

  // ========== 工具方法 ==========

  private verifySession(token: string | undefined, address: string): boolean {
    if (!token) return false;
    
    const session = this.sessionStore.get(token);
    if (!session) return false;
    
    // 检查过期
    if (Date.now() > session.expiresAt) {
      this.sessionStore.delete(token);
      return false;
    }
    
    // 检查地址匹配
    return session.address.toLowerCase() === address.toLowerCase();
  }

  private cleanExpiredNonces() {
    const now = Date.now();
    for (const [address, data] of this.nonceStore.entries()) {
      if (now - data.createdAt > 5 * 60 * 1000) {
        this.nonceStore.delete(address);
      }
    }
  }

  private cleanExpiredSessions() {
    const now = Date.now();
    for (const [token, session] of this.sessionStore.entries()) {
      if (now > session.expiresAt) {
        this.sessionStore.delete(token);
      }
    }
  }
}
