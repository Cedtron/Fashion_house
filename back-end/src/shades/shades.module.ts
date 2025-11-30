import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShadesService } from './shades.service';
import { ShadesController } from './shades.controller';
import { Shade } from '../entities/shade.entity';
import { Stock } from '../entities/stock.entity'; // Import Stock entity
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shade, Stock]), // Add Stock here
    StockModule,
  ],
  controllers: [ShadesController],
  providers: [ShadesService],
  exports: [ShadesService],
})
export class ShadesModule {}