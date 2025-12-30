import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { Stock } from '../entities/stock.entity';
import { Shade } from '../entities/shade.entity';
import { StockTracking } from '../entities/stock-tracking.entity';
import { StockTrackingService } from './stock-tracking.service';
import { RekognitionModule } from '../rekognition/rekognition.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Stock, Shade, StockTracking]), // Add Shade here
    RekognitionModule,
  ],
  controllers: [StockController],
  providers: [StockService, StockTrackingService],
  exports: [StockService, StockTrackingService],
})
export class StockModule { }