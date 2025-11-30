import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shade } from '../entities/shade.entity';
import { CreateShadeDto } from './dto/create-shade.dto';
import { UpdateShadeDto } from './dto/update-shade.dto';
import { Stock } from '../entities/stock.entity';
import { StockTrackingService } from '../stock/stock-tracking.service';
import { StockAction } from '../entities/stock-tracking.entity';

@Injectable()
export class ShadesService {
  constructor(
    @InjectRepository(Shade)
    private shadesRepository: Repository<Shade>,
    @InjectRepository(Stock)
    private stockRepository: Repository<Stock>,
    private readonly trackingService: StockTrackingService,
  ) {}

  async create(createShadeDto: CreateShadeDto, username?: string): Promise<Shade> {
    const shade = this.shadesRepository.create(createShadeDto);
    const savedShade = await this.shadesRepository.save(shade);

    try {
      const performer = username || 'system';
      let parentStock: Stock | undefined = (savedShade as any).stock;
      if (!parentStock && (savedShade as any).stockId) {
        parentStock = await this.stockRepository.findOne({ where: { id: (savedShade as any).stockId } });
      }
      if (parentStock) {
        await this.trackingService.logAction(
          parentStock,
          StockAction.CREATE,
          performer,
          `Created shade ${savedShade.colorName} for stock ${parentStock.product || ''}`,
          null,
          savedShade,
        );
      }
    } catch (err) {
      console.error('Error logging shade creation to tracking:', err);
    }

    return savedShade;
  }

  async findAll(): Promise<Shade[]> {
    return this.shadesRepository.find({ relations: ['stock'] });
  }

  async findByStock(stockId: number): Promise<Shade[]> {
    return this.shadesRepository.find({ where: { stock: { id: stockId } }, relations: ['stock'] });
  }

  async findOne(id: number): Promise<Shade> {
    const shade = await this.shadesRepository.findOne({ where: { id }, relations: ['stock'] });
    if (!shade) {
      throw new NotFoundException(`Shade with ID ${id} not found`);
    }
    return shade;
  }

  async update(id: number, updateShadeDto: UpdateShadeDto, username?: string): Promise<Shade> {
    const shade = await this.findOne(id);
    const oldData = { ...shade };
    Object.assign(shade, updateShadeDto);
    const updatedShade = await this.shadesRepository.save(shade);

    try {
      const performer = username || 'system';
      let parentStock: Stock | undefined = (updatedShade as any).stock;
      if (!parentStock && (updatedShade as any).stockId) {
        parentStock = await this.stockRepository.findOne({ where: { id: (updatedShade as any).stockId } });
      }
      if (parentStock) {
        await this.trackingService.logAction(
          parentStock,
          StockAction.UPDATE,
          performer,
          `Updated shade ${updatedShade.colorName} for stock ${parentStock.product || ''}`,
          oldData,
          updatedShade,
        );
      }
    } catch (err) {
      console.error('Error logging shade update to tracking:', err);
    }

    return updatedShade;
  }

  async remove(id: number, username?: string): Promise<void> {
    const shade = await this.findOne(id);
    try {
      const performer = username || 'system';
      let parentStock: Stock | undefined = (shade as any).stock;
      if (!parentStock && (shade as any).stockId) {
        parentStock = await this.stockRepository.findOne({ where: { id: (shade as any).stockId } });
      }
      if (parentStock) {
        await this.trackingService.logAction(
          parentStock,
          StockAction.DELETE,
          performer,
          `Deleted shade ${shade.colorName} from stock ${parentStock.product || ''}`,
          shade,
          null,
        );
      }
    } catch (err) {
      console.error('Error logging shade deletion to tracking:', err);
    }

    await this.shadesRepository.remove(shade);
  }
}