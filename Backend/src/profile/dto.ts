import { IsArray, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

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
}

export class SignedProfilePayload {
  address!: string;
  profile!: UpdateProfileDto;
  signature!: `0x${string}`;
  message!: string;
}
