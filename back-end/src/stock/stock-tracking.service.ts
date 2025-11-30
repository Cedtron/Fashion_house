import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { StockTracking, StockAction } from '../entities/stock-tracking.entity';
import { Stock } from '../entities/stock.entity';

@Injectable()
export class StockTrackingService {
  constructor(
    @InjectRepository(StockTracking)
    private readonly trackingRepository: Repository<StockTracking>,
  ) {}

  async logAction(
    stock: Stock,
    action: StockAction,
    performedBy: string,
    description?: string,
    oldData?: any,
    newData?: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<StockTracking | null> {
    try {
      const tracking = this.trackingRepository.create({
        stock,
        stockId: stock.id,
        action,
        performedBy,
        description,
        oldData: this.sanitizeDataForLogging(oldData),
        newData: this.sanitizeDataForLogging(newData),
        ipAddress,
        userAgent,
      });

      return await this.trackingRepository.save(tracking);
    } catch (error) {
      console.error('Error logging stock action:', error);
      // Don't throw error to prevent breaking the main operation
      return null;
    }
  }

  async getStockTracking(stockId: number): Promise<StockTracking[]> {
    return await this.trackingRepository.find({
      where: { stockId },
      order: { performedAt: 'DESC' },
      relations: ['stock'],
    });
  }

  async getUserActions(username: string): Promise<StockTracking[]> {
    return await this.trackingRepository.find({
      where: { performedBy: username },
      order: { performedAt: 'DESC' },
      relations: ['stock'],
    });
  }

  async getRecentActions(limit: number = 50): Promise<StockTracking[]> {
    return await this.trackingRepository.find({
      order: { performedAt: 'DESC' },
      relations: ['stock'],
      take: limit,
    });
  }

  async getAllTracking(limit: number = 1000, offset: number = 0): Promise<{data: StockTracking[], total: number}> {
    try {
      const [data, total] = await this.trackingRepository.findAndCount({
        relations: ['stock'],
        order: { performedAt: 'DESC' },
        take: limit,
        skip: offset,
      });

      return { data, total };
    } catch (error) {
      console.error('Error fetching all tracking data:', error);
      throw error;
    }
  }

  async getTrackingByAction(action: StockAction, limit: number = 50): Promise<StockTracking[]> {
    return await this.trackingRepository.find({
      where: { action },
      relations: ['stock'],
      order: { performedAt: 'DESC' },
      take: limit,
    });
  }

  async getTrackingByUser(username: string, limit: number = 50): Promise<StockTracking[]> {
    return await this.trackingRepository.find({
      where: { performedBy: username },
      relations: ['stock'],
      order: { performedAt: 'DESC' },
      take: limit,
    });
  }

  async getTrackingByDateRange(startDate: Date, endDate: Date): Promise<StockTracking[]> {
    return await this.trackingRepository.find({
      where: {
        performedAt: Between(startDate, endDate),
      },
      relations: ['stock'],
      order: { performedAt: 'DESC' },
    });
  }

  async getTrackingStats(): Promise<any> {
    const stats = {
      totalActions: 0,
      byAction: {},
      recentStocks: [],
      dailyActivity: [],
    };

    try {
      // Get total count
      stats.totalActions = await this.trackingRepository.count();

      // Get count by action
      for (const action of Object.values(StockAction)) {
        const count = await this.trackingRepository.count({
          where: { action },
        });
        stats.byAction[action] = count;
      }

      // Get recently tracked stocks
      const recentTracking = await this.trackingRepository.find({
        relations: ['stock'],
        order: { performedAt: 'DESC' },
        take: 10,
      });

      stats.recentStocks = recentTracking.map(t => ({
        id: t.stock?.id,
        product: t.stock?.product,
        stockId: t.stock?.stockId,
        action: t.action,
        performedBy: t.performedBy,
        performedAt: t.performedAt,
        description: t.description,
      }));

      return stats;
    } catch (error) {
      console.error('Error getting tracking stats:', error);
      throw error;
    }
  }

  private sanitizeDataForLogging(data: any): any {
    if (!data) return data;
    
    // Remove sensitive or unnecessary data before logging
    const { password, token, secret, ...sanitizedData } = data;
    return sanitizedData;
  }
}