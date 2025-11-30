import { PartialType } from '@nestjs/swagger';
import { CreateShadeDto } from './create-shade.dto';
import { IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateShadeDto extends PartialType(CreateShadeDto) {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  id?: number;
}