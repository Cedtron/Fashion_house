import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubCategory } from '../entities/subcategory.entity';
import { CreateSubCategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubCategoryDto } from './dto/update-subcategory.dto';
import { AuditService } from '../common/services/audit.service';

@Injectable()
export class SubCategoriesService {
  constructor(
    @InjectRepository(SubCategory)
    private subCategoriesRepository: Repository<SubCategory>,
    private auditService: AuditService,
  ) {}

  async create(createSubCategoryDto: CreateSubCategoryDto, userId?: number): Promise<SubCategory> {
    const { categoryId, ...subCategoryData } = createSubCategoryDto;
    
    const subCategory = this.subCategoriesRepository.create({
      ...subCategoryData,
      category: { id: categoryId } as any
    });
    
    const savedSubCategory = await this.subCategoriesRepository.save(subCategory);
    
    if (userId) {
      await this.auditService.logChange('subcategory', 'created', savedSubCategory.id, userId, createSubCategoryDto);
    }
    return savedSubCategory;
  }

  async findAll(): Promise<SubCategory[]> {
    return this.subCategoriesRepository.find({
      relations: ['category'],
    });
  }

  async findOne(id: number): Promise<SubCategory> {
    const subCategory = await this.subCategoriesRepository.findOne({
      where: { id },
      relations: ['category'],
    });
    if (!subCategory) {
      throw new NotFoundException(`SubCategory with ID ${id} not found`);
    }
    return subCategory;
  }

  async findByCategory(categoryId: number): Promise<SubCategory[]> {
    return this.subCategoriesRepository.find({
      where: { 
        category: { id: categoryId } 
      },
      relations: ['category'],
    });
  }

  async update(id: number, updateSubCategoryDto: UpdateSubCategoryDto, userId?: number): Promise<SubCategory> {
    const subCategory = await this.findOne(id);
    const changes: any = {};
    
    // Handle name update
    if (updateSubCategoryDto.name !== undefined && subCategory.name !== updateSubCategoryDto.name) {
      changes.name = { old: subCategory.name, new: updateSubCategoryDto.name };
      subCategory.name = updateSubCategoryDto.name;
    }
    
    // Handle category update
    if (updateSubCategoryDto.categoryId !== undefined && subCategory.category.id !== updateSubCategoryDto.categoryId) {
      changes.categoryId = { old: subCategory.category.id, new: updateSubCategoryDto.categoryId };
      subCategory.category = { id: updateSubCategoryDto.categoryId } as any;
    }
    
    // Handle isActive update
    if (updateSubCategoryDto.isActive !== undefined && subCategory['isActive'] !== updateSubCategoryDto.isActive) {
      changes.isActive = { old: subCategory['isActive'], new: updateSubCategoryDto.isActive };
      subCategory['isActive'] = updateSubCategoryDto.isActive;
    }
    
    const updatedSubCategory = await this.subCategoriesRepository.save(subCategory);
    
    if (userId && Object.keys(changes).length > 0) {
      await this.auditService.logChange('subcategory', 'updated', id, userId, changes);
    }
    
    return updatedSubCategory;
  }

  async remove(id: number, userId?: number): Promise<void> {
    const subCategory = await this.findOne(id);
    await this.subCategoriesRepository.remove(subCategory);
    if (userId) {
      await this.auditService.logChange('subcategory', 'deleted', id, userId);
    }
  }
}