import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';
import { Supplier } from '../entities/supplier.entity';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Supplier]),
    CommonModule, // This should provide AuditService
  ],
  controllers: [SuppliersController],
  providers: [SuppliersService, Logger],
})
export class SuppliersModule {}