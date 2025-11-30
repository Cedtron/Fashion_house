import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateShadeDto {
  @ApiProperty()
  @IsString()
  colorName: string;

  @ApiProperty()
  @IsString()
  color: string;

  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiProperty()
  @IsString()
  unit: string;

  @ApiProperty()
  @IsNumber()
  length: number;

  @ApiProperty()
  @IsString()
  lengthUnit: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  stockId?: number;
}