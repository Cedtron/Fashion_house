import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stock } from '../entities/stock.entity';
import { Shade } from '../entities/shade.entity';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { SearchStockDto } from './dto/search-stock.dto';
import { StockTrackingService } from './stock-tracking.service';
import { StockAction } from '../entities/stock-tracking.entity';
import { existsSync, unlinkSync } from 'fs';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    @InjectRepository(Shade)
    private readonly shadeRepository: Repository<Shade>,
    private readonly trackingService: StockTrackingService,
  ) { }

  private async generateStockId(): Promise<string> {
    try {
      // Find the highest stockId in the database
      const lastStock = await this.stockRepository
        .createQueryBuilder('stock')
        .where('stock.stockId LIKE :prefix', { prefix: 'FH%' })
        .orderBy('stock.id', 'DESC')
        .getOne();

      let nextNumber = 1;

      if (lastStock && lastStock.stockId) {
        // Extract the number from the last stockId (e.g., "FH001" -> 1)
        const lastNumber = parseInt(lastStock.stockId.replace('FH', ''), 10);
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }

      // Format as FH001, FH002, etc.
      return `FH${nextNumber.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating stock ID:', error);
      // Fallback: use timestamp to ensure uniqueness
      return `FH${Date.now().toString().slice(-6)}`;
    }
  }

  async create(createStockDto: CreateStockDto, username: string): Promise<Stock> {
    try {
      // Generate unique stockId first
      const stockId = await this.generateStockId();

      // Create stock with generated stockId
      const stockData = {
        stockId: stockId, // Add the generated stockId
        product: createStockDto.product,
        category: createStockDto.category,
        quantity: Number(createStockDto.quantity) || 0,
        cost: Number(createStockDto.cost) || 0,
        price: Number(createStockDto.price) || 0,
        imagePath: createStockDto.imagePath,
      };

      console.log('Creating stock with ID:', stockId);

      const stock = this.stockRepository.create(stockData);
      const savedStock = await this.stockRepository.save(stock);

      // Create shades if provided
      let createdShades = [];
      if (createStockDto.shades && createStockDto.shades.length > 0) {
        for (const shadeData of createStockDto.shades) {
          const shade = this.shadeRepository.create({
            colorName: shadeData.colorName,
            color: shadeData.color,
            quantity: Number(shadeData.quantity) || 0,
            unit: shadeData.unit,
            length: Number(shadeData.length) || 0,
            lengthUnit: shadeData.lengthUnit,
            stock: savedStock,
            stockId: savedStock.id,
          });
          const savedShade = await this.shadeRepository.save(shade);
          createdShades.push(savedShade);
        }
      }

      // Get complete stock with relations
      const completeStock = await this.stockRepository.findOne({
        where: { id: savedStock.id },
        relations: ['shades'],
      });

      // Single tracking entry
      await this.trackingService.logAction(
        completeStock,
        StockAction.CREATE,
        username,
        `Created stock: ${completeStock.product} (${completeStock.stockId}) with ${createdShades.length} shades`,
        null,
        this.prepareCompleteStockData(completeStock),
      );

      return completeStock;
    } catch (error) {
      console.error('Error creating stock:', error);
      throw error;
    }
  }

  async update(id: number, updateStockDto: UpdateStockDto, username: string): Promise<Stock> {
    try {
      const stock = await this.findOne(id);
      const oldData = this.prepareCompleteStockData(stock);

      // Track stock changes (exclude shades from stock-level comparison)
      const stockChanges = this.getChangedFields(oldData, updateStockDto);

      // Update stock (only stock fields, not shades)
      const stockUpdateData = { ...updateStockDto };
      delete stockUpdateData.shades; // Remove shades from stock update

      const updatedStock = this.stockRepository.merge(stock, stockUpdateData);
      const savedStock = await this.stockRepository.save(updatedStock);

      // Handle shade updates if provided
      let shadeChanges = [];
      if (updateStockDto.shades && Array.isArray(updateStockDto.shades)) {
        shadeChanges = await this.updateShades(id, updateStockDto.shades);
      }

      // Get complete updated data
      const completeStock = await this.stockRepository.findOne({
        where: { id: savedStock.id },
        relations: ['shades'],
      });

      const newData = this.prepareCompleteStockData(completeStock);

      // Create comprehensive description
      const changeDescriptions = [];

      if (Object.keys(stockChanges).length > 0) {
        const stockChangeText = Object.keys(stockChanges).map(field =>
          `${field}: ${stockChanges[field].old} → ${stockChanges[field].new}`
        ).join(', ');
        changeDescriptions.push(`Stock: ${stockChangeText}`);
      }

      if (shadeChanges.length > 0) {
        const shadeChangeText = shadeChanges.map(change =>
          `${change.action} shade: ${change.colorName}`
        ).join(', ');
        changeDescriptions.push(`Shades: ${shadeChangeText}`);
      }

      const description = changeDescriptions.length > 0
        ? `Updated ${completeStock.product}: ${changeDescriptions.join(' | ')}`
        : `Updated ${completeStock.product} (no significant changes detected)`;

      // Single tracking entry
      await this.trackingService.logAction(
        completeStock,
        StockAction.UPDATE,
        username,
        description,
        oldData,
        newData,
      );

      return completeStock;
    } catch (error) {
      console.error('Error updating stock:', error);
      throw error;
    }
  }

  private async updateShades(stockId: number, shadesData: any[]): Promise<any[]> {
    const changes = [];

    for (const shadeData of shadesData) {
      if (shadeData.id) {
        // Update existing shade
        const existingShade = await this.shadeRepository.findOne({
          where: { id: shadeData.id, stockId },
        });

        if (existingShade) {
          const updatedShade = this.shadeRepository.merge(existingShade, {
            colorName: shadeData.colorName,
            color: shadeData.color,
            quantity: Number(shadeData.quantity) || 0,
            unit: shadeData.unit,
            length: Number(shadeData.length) || 0,
            lengthUnit: shadeData.lengthUnit,
          });
          await this.shadeRepository.save(updatedShade);

          changes.push({
            action: 'updated',
            colorName: updatedShade.colorName,
            shadeId: updatedShade.id,
          });
        }
      } else {
        // Create new shade
        const newShade = this.shadeRepository.create({
          colorName: shadeData.colorName,
          color: shadeData.color,
          quantity: Number(shadeData.quantity) || 0,
          unit: shadeData.unit,
          length: Number(shadeData.length) || 0,
          lengthUnit: shadeData.lengthUnit,
          stockId: stockId,
        });
        const savedShade = await this.shadeRepository.save(newShade);

        changes.push({
          action: 'created',
          colorName: savedShade.colorName,
          shadeId: savedShade.id,
        });
      }
    }

    return changes;
  }

  async adjustStock(id: number, adjustStockDto: AdjustStockDto, username: string): Promise<Stock> {
    try {
      const stock = await this.findOne(id);
      const oldQuantity = stock.quantity;
      const oldData = this.prepareCompleteStockData(stock);

      stock.quantity += adjustStockDto.quantity;
      const updatedStock = await this.stockRepository.save(stock);

      const completeStock = await this.stockRepository.findOne({
        where: { id: updatedStock.id },
        relations: ['shades'],
      });

      const actionType = adjustStockDto.quantity > 0 ? 'INCREMENT' : 'DECREMENT';
      const absoluteQuantity = Math.abs(adjustStockDto.quantity);

      await this.trackingService.logAction(
        completeStock,
        StockAction.ADJUST,
        username,
        `Stock ${actionType}: ${completeStock.product} | ${absoluteQuantity} units | From: ${oldQuantity} → To: ${completeStock.quantity} | Notes: ${adjustStockDto.notes || 'No notes provided'}`,
        oldData,
        this.prepareCompleteStockData(completeStock),
      );

      return completeStock;
    } catch (error) {
      console.error('Error adjusting stock:', error);
      throw error;
    }
  }

 async remove(id: number, username: string): Promise<void> {
  try {
    const stock = await this.stockRepository.findOne({
      where: { id },
      relations: ['shades'],
    });

    if (!stock) {
      throw new NotFoundException(`Stock with ID ${id} not found`);
    }

    const stockData = this.prepareCompleteStockData(stock);

    // DELETE IMAGE FROM DISK
    if (stock.imagePath) {
      const imgPath = `.${stock.imagePath}`;
      if (existsSync(imgPath)) {
        try {
          unlinkSync(imgPath);
          console.log("Deleted image:", imgPath);
        } catch (err) {
          console.log("Error deleting image:", err);
        }
      }
    }

    await this.trackingService.logAction(
      stock,
      StockAction.DELETE,
      username,
      `DELETED: ${stock.product} (${stock.stockId}) and ${stock.shades?.length || 0} associated shades`,
      stockData,
      null,
    );

    await this.stockRepository.remove(stock);
  } catch (error) {
    console.error('Error deleting stock:', error);
    throw error;
  }
}


  async findAll(): Promise<Stock[]> {
    return await this.stockRepository.find({
      relations: ['shades'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Stock> {
    const stock = await this.stockRepository.findOne({
      where: { id },
      relations: ['shades'],
    });

    if (!stock) {
      throw new NotFoundException(`Stock with ID ${id} not found`);
    }

    return stock;
  }

  async search(searchDto: SearchStockDto): Promise<Stock[]> {
    const query = this.stockRepository.createQueryBuilder('stock')
      .leftJoinAndSelect('stock.shades', 'shades');

    if (searchDto.name) {
      query.andWhere('stock.product LIKE :name', { name: `%${searchDto.name}%` });
    }

    if (searchDto.category) {
      query.andWhere('stock.category LIKE :category', { category: `%${searchDto.category}%` });
    }

    return await query.getMany();
  }

  async getLowStock(threshold: number = 10): Promise<Stock[]> {
    return await this.stockRepository
      .createQueryBuilder('stock')
      .where('stock.quantity <= :threshold', { threshold })
      .leftJoinAndSelect('stock.shades', 'shades')
      .orderBy('stock.quantity', 'ASC')
      .getMany();
  }

  async getStockTracking(stockId: number) {
    return await this.trackingService.getStockTracking(stockId);
  }

  async getAllTracking() {
    return await this.trackingService.getRecentActions(1000);
  }

  async searchByImage(filename: string): Promise<Stock[]> {
    const query = this.stockRepository.createQueryBuilder('stock')
      .leftJoinAndSelect('stock.shades', 'shades');

    if (filename && filename.trim().length > 0) {
      query.where('stock.imagePath LIKE :img', { img: `%${filename}%` });
    } else {
      query.where('stock.imagePath IS NOT NULL');
    }

    return await query.getMany();
  }

  async uploadImage(id: number, imagePath: string, username: string): Promise<Stock> {
    console.log(`Uploading image for stock ${id}: ${imagePath}`);
    const stock = await this.findOne(id);
    const oldImagePath = stock.imagePath;

    // Use update to directly set the field in the DB
    await this.stockRepository.update(id, { imagePath });
    console.log(`Updated stock ${id} imagePath in DB to: ${imagePath}`);

    // Fetch updated entity
    const updated = await this.findOne(id);

    await this.trackingService.logAction(
      updated,
      StockAction.IMAGE_UPLOAD,
      username,
      `Image ${oldImagePath ? 'updated' : 'uploaded'} for: ${updated.product} (${updated.stockId})`,
      { oldImagePath },
      { newImagePath: imagePath }
    );

    return updated;
  }

  // Helper methods
  private prepareCompleteStockData(stock: Stock): any {
    return {
      id: stock.id,
      stockId: stock.stockId,
      product: stock.product,
      category: stock.category,
      quantity: stock.quantity,
      cost: stock.cost,
      price: stock.price,
      imagePath: stock.imagePath,
      createdAt: stock.createdAt,
      updatedAt: stock.updatedAt,
      shades: stock.shades ? stock.shades.map(shade => ({
        id: shade.id,
        colorName: shade.colorName,
        color: shade.color,
        quantity: shade.quantity,
        unit: shade.unit,
        length: shade.length,
        lengthUnit: shade.lengthUnit,
        createdAt: shade.createdAt,
        updatedAt: shade.updatedAt,
      })) : [],
    };
  }

  private getChangedFields(oldData: any, newData: any): any {
    const changes = {};
    const trackableFields = ['product', 'category', 'quantity', 'cost', 'price', 'imagePath'];

    trackableFields.forEach(key => {
      if (oldData[key] !== newData[key]) {
        changes[key] = {
          old: oldData[key],
          new: newData[key]
        };
      }
    });

    return changes;
  }
}