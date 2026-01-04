import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { PasswordReset } from '../entities/password-reset.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ForgotPasswordDto, VerifyResetCodeDto, ResetPasswordDto } from './dto/forgot-password.dto';
import { AuditService } from '../common/services/audit.service';
import { EmailService } from '../common/services/email.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(PasswordReset)
    private passwordResetRepository: Repository<PasswordReset>,
    private auditService: AuditService,
    private emailService: EmailService,
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

  // =============== FORGOT PASSWORD METHODS ===============

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    // Find user by email
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      // Don't reveal if email exists or not for security
      return { message: 'If the email exists, a reset code has been sent.' };
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiration time (15 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Invalidate any existing reset codes for this user
    await this.passwordResetRepository.update(
      { userId: user.id, isUsed: false },
      { isUsed: true }
    );

    // Create new password reset record
    const passwordReset = this.passwordResetRepository.create({
      userId: user.id,
      code,
      expiresAt,
      isUsed: false,
    });

    await this.passwordResetRepository.save(passwordReset);

    // Send email with reset code
    try {
      await this.emailService.sendPasswordResetEmail(email, code, user.username);
    } catch (error) {
      console.error('Failed to send reset email:', error);
      // Continue anyway - code is still valid
    }

    return { message: 'If the email exists, a reset code has been sent.' };
  }

  async verifyResetCode(verifyResetCodeDto: VerifyResetCodeDto): Promise<{ message: string; valid: boolean }> {
    const { email, code } = verifyResetCodeDto;

    // Find user by email
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new BadRequestException('Invalid email or code');
    }

    // Find valid reset code
    const resetRecord = await this.passwordResetRepository.findOne({
      where: {
        userId: user.id,
        code,
        isUsed: false,
      },
    });

    if (!resetRecord) {
      throw new BadRequestException('Invalid or expired code');
    }

    // Check if code is expired
    if (new Date() > resetRecord.expiresAt) {
      throw new BadRequestException('Code has expired. Please request a new one.');
    }

    return { message: 'Code verified successfully', valid: true };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { email, code, newPassword } = resetPasswordDto;

    // Find user by email
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new BadRequestException('Invalid email or code');
    }

    // Find valid reset code
    const resetRecord = await this.passwordResetRepository.findOne({
      where: {
        userId: user.id,
        code,
        isUsed: false,
      },
    });

    if (!resetRecord) {
      throw new BadRequestException('Invalid or expired code');
    }

    // Check if code is expired
    if (new Date() > resetRecord.expiresAt) {
      throw new BadRequestException('Code has expired. Please request a new one.');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await this.usersRepository.update(user.id, { password: hashedPassword });

    // Mark reset code as used
    await this.passwordResetRepository.update(r;

ge
' };
  }sfullyreset successword essage: 'Pas return { m
   );
   }
 tion'rifica email vet viad reseasswor: 'P    actionid, {
  d, user..it', user_resepassworde('user', 'hangogCitService.lis.audit th    award chan passwo/ Log the    /ed: true })d.id, { isUsecoresetR
}


  // =============== FORGOT PASSWORD METHODS ===============

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    // Find user by email
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      // Don't reveal if email exists or not for security
      return { message: 'If the email exists, a reset code has been sent.' };
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiration time (15 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Invalidate any existing reset codes for this user
    await this.passwordResetRepository.update(
      { userId: user.id, isUsed: false },
      { isUsed: true }
    );

    // Create new password reset record
    const passwordReset = this.passwordResetRepository.create({
      userId: user.id,
      code,
      expiresAt,
      isUsed: false,
    });

    await this.passwordResetRepository.save(passwordReset);

    // Send email with reset code
    try {
      await this.emailService.sendPasswordResetEmail(email, code, user.username);
    } catch (error) {
      console.error('Failed to send reset email:', error);
      // Continue anyway - code is still valid
    }

    return { message: 'If the email exists, a reset code has been sent.' };
  }

  async verifyResetCode(verifyResetCodeDto: VerifyResetCodeDto): Promise<{ message: string; valid: boolean }> {
    const { email, code } = verifyResetCodeDto;

    // Find user by email
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new BadRequestException('Invalid email or code');
    }

    // Find valid reset code
    const resetRecord = await this.passwordResetRepository.findOne({
      where: {
        userId: user.id,
        code,
        isUsed: false,
      },
    });

    if (!resetRecord) {
      throw new BadRequestException('Invalid or expired code');
    }

    // Check if code is expired
    if (new Date() > resetRecord.expiresAt) {
      throw new BadRequestException('Code has expired. Please request a new one.');
    }

    return { message: 'Code verified successfully', valid: true };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { email, code, newPassword } = resetPasswordDto;

    // Find user by email
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new BadRequestException('Invalid email or code');
    }

    // Find valid reset code
    const resetRecord = await this.passwordResetRepository.findOne({
      where: {
        userId: user.id,
        code,
        isUsed: false,
      },
    });

    if (!resetRecord) {
      throw new BadRequestException('Invalid or expired code');
    }

    // Check if code is expired
    if (new Date() > resetRecord.expiresAt) {
      throw new BadRequestException('Code has expired. Please request a new one.');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await this.usersRepository.update(user.id, { password: hashedPassword });

    // Mark reset code as used
    await this.passwordResetRepository.update(resetRecord.id, { isUsed: true });

    // Log the password change
    await this.auditService.logChange('user', 'password_reset', user.id, user.id, {
      action: 'Password reset via email verification'
    });

    return { message: 'Password reset successfully' };
  }