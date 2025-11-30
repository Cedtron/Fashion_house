import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ExecuteSqlDto {
  @ApiProperty({ description: 'SQL query to execute' })
  @IsString()
  @IsNotEmpty()
  query: string;
}

