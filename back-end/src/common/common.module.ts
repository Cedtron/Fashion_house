// common/common.module.ts
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditService } from './services/audit.service';
import { Log } from '../entities/log.entity';
import { StockHistory } from '../entities/stock-history.entity';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([Log, StockHistory])],
  providers: [
    AuditService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
  exports: [AuditService], // Make sure AuditService is exported
})
export class CommonModule {}

