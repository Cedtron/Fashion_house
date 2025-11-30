import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuditService } from '../common/services/audit.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private auditService: AuditService,
  ) { }

  async create(createUserDto: CreateUserDto, userId?: number): Promise<User> {
    // Check if email already exists
    const existingEmail = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingEmail) {
      throw new BadRequestException('Email already exists');
    }

    // Check if phone already exists (only if provided)
    if (createUserDto.phone) {
      const existingPhone = await this.usersRepository.findOne({
        where: { phone: createUserDto.phone },
      });

      if (existingPhone) {
        throw new BadRequestException('Phone number already exists');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await this.usersRepository.save(user);

    // Audit log
    if (userId) {
      await this.auditService.logChange('user', 'created', savedUser.id, userId, createUserDto);
    }

    return savedUser;
  }


  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      select: ['id', 'email', 'username', 'phone', 'role', 'isActive', 'imagePath', 'createdAt', 'updatedAt'],
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: ['id', 'email', 'username', 'phone', 'role', 'isActive', 'imagePath', 'createdAt', 'updatedAt'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

async update(id: number, updateUserDto: UpdateUserDto, userId?: number): Promise<User> {
  const user = await this.findOne(id);

  const changes: any = {};

  // Track imagePath
  if (updateUserDto.imagePath) {
    changes['imagePath'] = {
      old: user.imagePath,
      new: updateUserDto.imagePath,
    };
  }

  // Track other changes
  Object.keys(updateUserDto).forEach((key) => {
    if (key !== 'password' && user[key] !== updateUserDto[key]) {
      changes[key] = { old: user[key], new: updateUserDto[key] };
    }
  });

  // Password hashing
  if (updateUserDto.password) {
    updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
  }

  Object.assign(user, updateUserDto);
  const updatedUser = await this.usersRepository.save(user);

  if (userId) {
    await this.auditService.logChange('user', 'updated', id, userId, changes);
  }

  return updatedUser;
}



  async remove(id: number, userId?: number): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
    if (userId) {
      await this.auditService.logChange('user', 'deleted', id, userId);
    }
  }
}

