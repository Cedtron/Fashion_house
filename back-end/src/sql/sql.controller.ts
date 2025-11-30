import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SqlService } from './sql.service';
import { ExecuteSqlDto } from './dto/execute-sql.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('sql')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('sql')
export class SqlController {
  constructor(private readonly sqlService: SqlService) {}

  @Post('execute')
  @ApiOperation({ summary: 'Execute raw SQL query (SELECT, INSERT, UPDATE only)' })
  @ApiResponse({ status: 200, description: 'Query executed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid SQL query or operation not allowed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  execute(@Body() executeSqlDto: ExecuteSqlDto) {
    return this.sqlService.executeQuery(executeSqlDto);
  }
}

