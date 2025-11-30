import { Module } from '@nestjs/common';
import { SqlService } from './sql.service';
import { SqlController } from './sql.controller';

@Module({
  controllers: [SqlController],
  providers: [SqlService],
})
export class SqlModule {}

