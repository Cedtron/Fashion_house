import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiHeader } from '@nestjs/swagger';
import { ShadesService } from './shades.service';
import { CreateShadeDto } from './dto/create-shade.dto';
import { UpdateShadeDto } from './dto/update-shade.dto';
import { Shade } from '../entities/shade.entity';

@ApiTags('shades')
@Controller('shades')
export class ShadesController {
  constructor(private readonly shadesService: ShadesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new shade' })
  @ApiHeader({ name: 'x-username', required: false, description: 'Username performing the action' })
  @ApiResponse({ status: 201, description: 'Shade created successfully', type: Shade })
  create(@Body() createShadeDto: CreateShadeDto, @Headers('x-username') username?: string) {
    return this.shadesService.create(createShadeDto, username);
  }

  @Get()
  @ApiOperation({ summary: 'Get all shades' })
  @ApiQuery({ name: 'stockId', required: false, type: Number, description: 'Filter by stock ID' })
  @ApiResponse({ status: 200, description: 'List of all shades', type: [Shade] })
  findAll(@Query('stockId') stockId?: number) {
    if (stockId) {
      return this.shadesService.findByStock(+stockId);
    }
    return this.shadesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a shade by ID' })
  @ApiResponse({ status: 200, description: 'Shade found', type: Shade })
  @ApiResponse({ status: 404, description: 'Shade not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.shadesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a shade' })
  @ApiHeader({ name: 'x-username', required: false, description: 'Username performing the action' })
  @ApiResponse({ status: 200, description: 'Shade updated successfully', type: Shade })
  @ApiResponse({ status: 404, description: 'Shade not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateShadeDto: UpdateShadeDto, @Headers('x-username') username?: string) {
    return this.shadesService.update(id, updateShadeDto, username);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a shade' })
  @ApiHeader({ name: 'x-username', required: false, description: 'Username performing the action' })
  @ApiResponse({ status: 200, description: 'Shade deleted successfully' })
  @ApiResponse({ status: 404, description: 'Shade not found' })
  remove(@Param('id', ParseIntPipe) id: number, @Headers('x-username') username?: string) {
    return this.shadesService.remove(id, username);
  }
}