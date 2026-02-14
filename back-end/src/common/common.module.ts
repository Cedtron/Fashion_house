// common/common.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditService } from './services/audit.service';
import { EmailService } from './services/email.service';
import { Log } from '../entities/log.entity';
import { StockHistory } from '../entities/stock-history.entity';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Log, StockHistory]),
    ConfigModule
  ],
  providers: [
    AuditService,
    EmailService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
  exports: [AuditService, EmailService], // Export both services
})
export class CommonModule {}

