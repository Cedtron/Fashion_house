// common/common.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditService } from './services/audit.service';
import { Log } from '../entities/log.entity';
import { StockHistory } from '../entities/stock-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Log, StockHistory])],
  providers: [AuditService],
  exports: [AuditService], // Make sure AuditService is exported
})
export class CommonModule {}

