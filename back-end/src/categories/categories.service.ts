import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { AuditService } from '../common/services/audit.service';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
    private auditService: AuditService,
  ) {}

  async create(createCategoryDto: CreateCategoryDto, userId?: number): Promise<Category> {
    // Check if category already exists
    const existingCategory = await this.categoriesRepository.findOne({
      where: { name: createCategoryDto.name }
    });

    if (existingCategory) {
      throw new ConflictException(`Category with name '${createCategoryDto.name}' already exists`);
    }

    const category = this.categoriesRepository.create(createCategoryDto);
    const savedCategory = await this.categoriesRepository.save(category);
    
    if (userId) {
      await this.auditService.logChange('category', 'created', savedCategory.id, userId, createCategoryDto);
    }
    return savedCategory;
  }

  async findAll(): Promise<Category[]> {
    return this.categoriesRepository.find({
      relations: ['subCategories'],
      order: {
        name: 'ASC'
      }
    });
  }

  async findOne(id: number): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { id },
      relations: ['subCategories'],
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }

  async findByName(name: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { name },
      relations: ['subCategories'],
    });
    return category;
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto, userId?: number): Promise<Category> {
    // Check if another category with the same name exists (excluding current category)
    if (updateCategoryDto.name) {
      const existingCategory = await this.categoriesRepository.findOne({
        where: { name: updateCategoryDto.name }
      });

      if (existingCategory && existingCategory.id !== id) {
        throw new ConflictException(`Category with name '${updateCategoryDto.name}' already exists`);
      }
    }

    const category = await this.findOne(id);
    const changes: any = {};
    Object.keys(updateCategoryDto).forEach((key) => {
      if (category[key] !== updateCategoryDto[key]) {
        changes[key] = { old: category[key], new: updateCategoryDto[key] };
      }
    });
    Object.assign(category, updateCategoryDto);
    const updatedCategory = await this.categoriesRepository.save(category);
    if (userId) {
      await this.auditService.logChange('category', 'updated', id, userId, changes);
    }
    return updatedCategory;
  }

  async remove(id: number, userId?: number): Promise<void> {
    const category = await this.findOne(id);
    await this.categoriesRepository.remove(category);
    if (userId) {
      await this.auditService.logChange('category', 'deleted', id, userId);
    }
  }

  async removeAll(): Promise<void> {
    await this.categoriesRepository.clear();
  }

  async count(): Promise<number> {
    return this.categoriesRepository.count();
  }
}