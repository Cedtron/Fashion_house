// common/services/audit.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Log } from '../../entities/log.entity';
import { StockHistory } from '../../entities/stock-history.entity';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(Log)
    private logsRepository: Repository<Log>,
    @InjectRepository(StockHistory)
    private stockHistoryRepository: Repository<StockHistory>,
  ) {}

  async logChange(
    entity: string,
    action: string,
    entityId: number,
    userId: number,
    changes?: any,
    details?: string,
  ): Promise<void> {
    try {
      console.log('🟡 [AuditService] Attempting to log change:', {
        entity,
        action,
        entityId,
        userId,
        changes
      });

      const logEntry = this.logsRepository.create({
        level: 'info',
        action: `${entity}_${action}`, // Use underscore for consistency
        message: `${entity} ${action} for ID ${entityId} by user ${userId}`,
        details: details || JSON.stringify(changes || {}),
        userId: userId.toString(),
        ipAddress: null, // You can add these if available
        userAgent: null,
      });

      const savedLog = await this.logsRepository.save(logEntry);
      console.log('✅ [AuditService] Log saved successfully:', savedLog.id);
      
    } catch (error) {
      console.error('❌ [AuditService] Failed to log change:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  async logStockChange(
    stockId: number,
    action: string,
    previousQuantity: number,
    newQuantity: number,
    userId: number,
    notes?: string,
    changes?: any,
  ): Promise<StockHistory> {
    try {
      console.log('🟡 [AuditService] Logging stock change:', {
        stockId, action, userId
      });

      const history = this.stockHistoryRepository.create({
        stockId,
        action,
        previousQuantity,
        newQuantity,
        quantityChange: newQuantity - previousQuantity,
        userId,
        notes,
        changes: changes ? JSON.stringify(changes) : null,
      });
      
      const savedHistory = await this.stockHistoryRepository.save(history);
      console.log('✅ [AuditService] Stock history saved:', savedHistory.id);
      return savedHistory;
      
    } catch (error) {
      console.error('❌ [AuditService] Failed to log stock change:', error);
      throw error; // Re-throw for stock operations
    }
  }

  // Test method to verify logging works
  async testLogging(userId: number): Promise<boolean> {
    try {
      console.log('🧪 [AuditService] Testing logging with userId:', userId);
      
      const testLog = this.logsRepository.create({
        level: 'info',
        action: 'test_audit',
        message: 'Test audit log entry',
        details: JSON.stringify({ test: true, timestamp: new Date() }),
        userId: userId.toString(),
      });

      await this.logsRepository.save(testLog);
      console.log('✅ [AuditService] Test log saved successfully');
      return true;
      
    } catch (error) {
      console.error('❌ [AuditService] Test logging failed:', error);
      return false;
    }
  }
}