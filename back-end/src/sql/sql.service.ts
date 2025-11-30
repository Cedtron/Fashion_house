import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Connection } from 'typeorm';
import { ExecuteSqlDto } from './dto/execute-sql.dto';

@Injectable()
export class SqlService {
  constructor(
    @InjectConnection()
    private connection: Connection,
    private configService: ConfigService,
  ) {}

  async executeQuery(executeSqlDto: ExecuteSqlDto): Promise<any> {
    const { query } = executeSqlDto;
    
    // Check if unrestricted SQL is enabled (for development only!)
    const allowUnrestrictedSql = this.configService.get('ALLOW_UNRESTRICTED_SQL', 'false') === 'true';
    
    if (!allowUnrestrictedSql) {
      // Basic security check - prevent dangerous operations in production
      const dangerousKeywords = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE TABLE', 'CREATE DATABASE'];
      const upperQuery = query.toUpperCase().trim();
      
      // Allow SELECT, INSERT, UPDATE operations
      if (dangerousKeywords.some(keyword => upperQuery.includes(keyword))) {
        throw new BadRequestException(
          'This operation is not allowed for security reasons. ' +
          'Set ALLOW_UNRESTRICTED_SQL=true in .env to allow all SQL operations (development only!)'
        );
      }
    }

    try {
      const result = await this.connection.query(query);
      return {
        success: true,
        data: result,
        rowsAffected: Array.isArray(result) ? result.length : 0,
      };
    } catch (error) {
      throw new BadRequestException(`SQL Error: ${error.message}`);
    }
  }

  async executeRawQuery(query: string): Promise<any> {
    try {
      const result = await this.connection.query(query);
      return {
        success: true,
        data: result,
        rowsAffected: Array.isArray(result) ? result.length : 0,
      };
    } catch (error) {
      throw new BadRequestException(`SQL Error: ${error.message}`);
    }
  }
}

