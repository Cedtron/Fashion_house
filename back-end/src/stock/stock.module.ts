import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { Stock } from '../entities/stock.entity';
import { Shade } from '../entities/shade.entity';
import { StockTracking } from '../entities/stock-tracking.entity';
import { StockTrackingService } from './stock-tracking.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Stock, Shade, StockTracking]), // Add Shade here
  ],
  controllers: [StockController],
  providers: [StockService, StockTrackingService],
  exports: [StockService, StockTrackingService],
})
export class StockModule {}