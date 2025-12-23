import { IsArray, IsHexadecimal, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProfileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  email?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  @MaxLength(16)
  avatar?: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  joinDate?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  totalCourses?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  totalStudying?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  totalSpent?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  rating?: number;

  @IsArray()
  @IsOptional()
  achievements?: string[];

  // 教师相关字段
  @IsNumber()
  @Min(0)
  @IsOptional()
  soldCourses?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  totalRevenue?: number;

  @IsArray()
  @IsOptional()
  certifications?: string[];
}

export class SignedProfilePayload {
  @IsString()
  address!: string;

  @ValidateNested()
  @Type(() => UpdateProfileDto)
  profile!: UpdateProfileDto;

  @IsString()
  @MaxLength(132)
  signature!: `0x${string}`;

  @IsString()
  @MaxLength(200)
  message!: string;
}
