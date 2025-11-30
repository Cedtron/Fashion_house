import { PartialType, OmitType, ApiProperty } from '@nestjs/swagger';
import { CreateStockDto } from './create-stock.dto';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateShadeDto } from '../../shades/dto/update-shade.dto';

export class UpdateStockDto extends PartialType(OmitType(CreateStockDto, ['shades'] as const)) {
  @ApiProperty({ type: [UpdateShadeDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateShadeDto)
  shades?: UpdateShadeDto[];
}