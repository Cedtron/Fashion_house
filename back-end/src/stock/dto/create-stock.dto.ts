import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateShadeDto } from '../../shades/dto/create-shade.dto';

export class CreateStockDto {
  @ApiProperty()
  product: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  cost: number;

  @ApiProperty()
  price: number;

  @ApiProperty({ required: false })
  @IsOptional()
  imagePath?: string;

  @ApiProperty({ type: [CreateShadeDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateShadeDto)
  shades?: CreateShadeDto[];
}