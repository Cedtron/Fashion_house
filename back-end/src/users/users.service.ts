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

    // Hash password using bcrypt with 10 salt rounds
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

    // Hash password if provided (using same bcrypt method as create)
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
      changes['password'] = { action: 'Password updated' };
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

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string; code?: string }> {
    const { email, passwordHint } = forgotPasswordDto;

    // Find user by email
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      // Don't reveal if user exists or not for security
      throw new BadRequestException('If your email exists in our system, you will receive a reset code.');
    }

    // Check if this is a dummy request for email-only verification
    const isDummyRequest = passwordHint === "dummy_hint_for_email_code" || passwordHint === "email_code_request";
    
    if (!isDummyRequest && user.passwordhint) {
      // Validate password hint (case-insensitive comparison)
      if (user.passwordhint.toLowerCase().trim() !== passwordHint.toLowerCase().trim()) {
        throw new BadRequestException('Invalid email or password hint');
      }
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
      // Still return success but log the error
    }

    const message = isDummyRequest 
      ? 'Verification code has been sent to your email.'
      : 'Email and password hint verified successfully. Reset code has been sent to your email.';

    // IMPORTANT: Remove the code from production response - only for testing
    // In production, return only the message
    const response = { message };
    
    // For testing/debugging only - include code
    if (process.env.NODE_ENV !== 'production') {
      response['code'] = code;
    }

    return response;
  }

  async verifyResetCode(verifyResetCodeDto: VerifyResetCodeDto): Promise<{ message: string; valid: boolean; resetId?: number }> {
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

    return { 
      message: 'Code verified successfully', 
      valid: true,
      resetId: resetRecord.id // Return reset ID for use in resetPassword
    };
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

    // Check if new password is the same as old password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException('New password cannot be the same as the old password');
    }

    // Hash new password using same bcrypt method as create and update
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    user.password = hashedPassword;
    await this.usersRepository.save(user);

    // Mark reset code as used
    await this.passwordResetRepository.update(resetRecord.id, { isUsed: true });

    // Log the password change
    await this.auditService.logChange('user', 'password_reset', user.id, user.id, {
      action: 'Password reset via email verification',
      email: user.email,
      username: user.username,
      resetCodeId: resetRecord.id
    });

    // Send confirmation email
    try {
      await this.emailService.sendPasswordChangeConfirmation(email, user.username);
    } catch (error) {
      console.error('Failed to send confirmation email:', error);
      // Continue anyway - password was successfully reset
    }

    return { message: 'Password reset successfully' };
  }

  // =============== PASSWORD VALIDATION HELPERS ===============

  async validateCurrentPassword(userId: number, currentPassword: string): Promise<boolean> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    return bcrypt.compare(currentPassword, user.password);
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string, auditUserId?: number): Promise<{ message: string }> {
    // Verify current password
    const isValid = await this.validateCurrentPassword(userId, currentPassword);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Check if new password is the same as current password
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException('New password cannot be the same as current password');
    }

    // Hash new password using same bcrypt method
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    user.password = hashedPassword;
    await this.usersRepository.save(user);

    // Log the password change
    if (auditUserId) {
      await this.auditService.logChange('user', 'password_changed', userId, auditUserId, {
        action: 'Password changed via profile',
        email: user.email,
        username: user.username
      });
    }

    return { message: 'Password changed successfully' };
  }

  // =============== DEBUG/ADMIN METHODS ===============
  
  async updatePasswordDirect(id: number, hashedPassword: string, userId?: number): Promise<User> {
    const user = await this.findOne(id);
    
    // Update password directly without hashing (password is already hashed)
    user.password = hashedPassword;
    const updatedUser = await this.usersRepository.save(user);

    // Log the change
    if (userId) {
      await this.auditService.logChange('user', 'password_changed', id, userId, {
        action: 'Password changed via admin/direct update',
        email: user.email,
        username: user.username
      });
    }

    return updatedUser;
  }
// Add this to your UsersService
async directResetPassword(email: string, newPassword: string): Promise<{ message: string }> {
  // Find user by email
  const user = await this.usersRepository.findOne({ where: { email } });
  if (!user) {
    throw new BadRequestException('User not found');
  }

  // Hash new password using same bcrypt method
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update user password
  user.password = hashedPassword;
  await this.usersRepository.save(user);

  // Log the password change
  await this.auditService.logChange('user', 'password_reset_direct', user.id, user.id, {
    action: 'Password reset directly via email',
    email: user.email,
    username: user.username
  });

  return { message: 'Password reset successfully' };
}



  async checkUserPassword(email: string): Promise<any> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      return { error: 'User not found' };
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      passwordHash: user.password.substring(0, 20) + '...',
      passwordLength: user.password.length,
      isActive: user.isActive
    };
  }

  async forceUpdatePassword(email: string, newPassword: string): Promise<any> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Hash password using same bcrypt method
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    user.password = hashedPassword;
    await this.usersRepository.save(user);

    return {
      message: 'Password force updated successfully',
      email: user.email,
      username: user.username
    };
  }
}