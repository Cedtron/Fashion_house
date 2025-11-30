import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SubCategoriesService } from './subcategories.service';
import { CreateSubCategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubCategoryDto } from './dto/update-subcategory.dto';
import { SubCategory } from '../entities/subcategory.entity';

@ApiTags('subcategories')
@ApiBearerAuth('JWT-auth')
@Controller('subcategories')
export class SubCategoriesController {
  constructor(private readonly subCategoriesService: SubCategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new subcategory' })
  @ApiResponse({ status: 201, description: 'SubCategory created successfully', type: SubCategory })
  create(@Body() createSubCategoryDto: CreateSubCategoryDto, @Request() req) {
    const userId = req.user?.userId || req.user?.id;
    return this.subCategoriesService.create(createSubCategoryDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all subcategories' })
  @ApiQuery({ name: 'categoryId', required: false, type: Number, description: 'Filter by category ID' })
  @ApiResponse({ status: 200, description: 'List of all subcategories', type: [SubCategory] })
  findAll(@Query('categoryId') categoryId?: number) {
    if (categoryId) {
      return this.subCategoriesService.findByCategory(+categoryId);
    }
    return this.subCategoriesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a subcategory by ID' })
  @ApiResponse({ status: 200, description: 'SubCategory found', type: SubCategory })
  @ApiResponse({ status: 404, description: 'SubCategory not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.subCategoriesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a subcategory' })
  @ApiResponse({ status: 200, description: 'SubCategory updated successfully', type: SubCategory })
  @ApiResponse({ status: 404, description: 'SubCategory not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateSubCategoryDto: UpdateSubCategoryDto, @Request() req) {
    const userId = req.user?.userId || req.user?.id;
    return this.subCategoriesService.update(id, updateSubCategoryDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a subcategory' })
  @ApiResponse({ status: 200, description: 'SubCategory deleted successfully' })
  @ApiResponse({ status: 404, description: 'SubCategory not found' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const userId = req.user?.userId || req.user?.id;
    return this.subCategoriesService.remove(id, userId);
  }
}

