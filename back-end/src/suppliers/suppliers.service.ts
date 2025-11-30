import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from '../entities/supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { AuditService } from '../common/services/audit.service';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private suppliersRepository: Repository<Supplier>,
    private auditService: AuditService,
  ) {}

  async create(createSupplierDto: CreateSupplierDto, userId?: number): Promise<any> {
    // Check for duplicate name
    const existing = await this.suppliersRepository.findOne({
      where: { name: createSupplierDto.name.trim() },
    });

    if (existing) {
      return {
        success: false,
        message: 'Supplier name already exists',
      };
    }

    const supplier = this.suppliersRepository.create(createSupplierDto);
    const savedSupplier = await this.suppliersRepository.save(supplier);

    if (userId) {
      await this.auditService.logChange(
        'supplier',
        'created',
        savedSupplier.id,
        userId,
        createSupplierDto
      );
    }

    return {
      success: true,
      message: 'Supplier created successfully',
      data: savedSupplier,
    };
  }

  async findAll(): Promise<any> {
    const suppliers = await this.suppliersRepository.find({
      order: { name: 'ASC' },
    });
    
    return {
      success: true,
      data: suppliers,
    };
  }

  async findOne(id: number): Promise<any> {
    const supplier = await this.suppliersRepository.findOne({ where: { id } });
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return {
      success: true,
      data: supplier,
    };
  }

  async update(id: number, updateSupplierDto: UpdateSupplierDto, userId?: number): Promise<any> {
    const supplier = await this.suppliersRepository.findOne({ where: { id } });
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    // Prevent changing name to an existing one
    if (updateSupplierDto.name && updateSupplierDto.name.trim() !== supplier.name) {
      const existingSupplier = await this.suppliersRepository.findOne({
        where: { name: updateSupplierDto.name.trim() },
      });

      if (existingSupplier && existingSupplier.id !== id) {
        return {
          success: false,
          message: 'Supplier name already exists',
        };
      }
    }

    const changes: any = {};
    Object.keys(updateSupplierDto).forEach((key) => {
      if (supplier[key] !== updateSupplierDto[key]) {
        changes[key] = { old: supplier[key], new: updateSupplierDto[key] };
      }
    });

    Object.assign(supplier, updateSupplierDto);
    const updatedSupplier = await this.suppliersRepository.save(supplier);

    if (userId) {
      await this.auditService.logChange('supplier', 'updated', id, userId, changes);
    }

    return {
      success: true,
      message: 'Supplier updated successfully',
      data: updatedSupplier,
    };
  }

  async remove(id: number, userId?: number): Promise<any> {
    const supplier = await this.suppliersRepository.findOne({ where: { id } });
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    await this.suppliersRepository.remove(supplier);

    if (userId) {
      await this.auditService.logChange('supplier', 'deleted', id, userId, {
        name: supplier.name,
        contactPerson: supplier.contactPerson,
        email: supplier.email,
      });
    }

    return {
      success: true,
      message: 'Supplier deleted successfully',
    };
  }
}