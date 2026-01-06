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

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string; code?: string }> {
    const { email, passwordHint } = forgotPasswordDto;

    // Find user by email
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new BadRequestException('Invalid email or password hint');
    }

    // Check if this is a dummy request for email-only verification
    const isDummyRequest = passwordHint === "dummy_hint_for_email_code" || passwordHint === "email_code_request";
    
    if (!isDummyRequest) {
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

    // Send email with reset code (if email service is available)
    try {
      await this.emailService.sendPasswordResetEmail(email, code, user.username);
    } catch (error) {
      console.error('Failed to send reset email:', error);
      // Continue anyway - code is still valid
    }

    const message = isDummyRequest 
      ? 'Verification code has been sent to your email.'
      : 'Email and password hint verified successfully. Reset code has been sent to your email.';

    return { 
      message,
      code: code // Remove this in production - only for testing
    };
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

    console.log(`🔍 [RESET PASSWORD] Starting password reset for email: ${email}`);

    // Find user by email
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      console.log(`❌ [RESET PASSWORD] User not found for email: ${email}`);
      throw new BadRequestException('Invalid email or code');
    }

    console.log(`✅ [RESET PASSWORD] User found: ID=${user.id}, Email=${user.email}, Username=${user.username}`);

    // Find valid reset code
    const resetRecord = await this.passwordResetRepository.findOne({
      where: {
        userId: user.id,
        code,
        isUsed: false,
      },
    });

    if (!resetRecord) {
      console.log(`❌ [RESET PASSWORD] Invalid reset code: ${code} for user ID: ${user.id}`);
      throw new BadRequestException('Invalid or expired code');
    }

    console.log(`✅ [RESET PASSWORD] Valid reset code found: ID=${resetRecord.id}, Code=${resetRecord.code}`);

    // Check if code is expired
    if (new Date() > resetRecord.expiresAt) {
      console.log(`❌ [RESET PASSWORD] Code expired: ${resetRecord.expiresAt} < ${new Date()}`);
      throw new BadRequestException('Code has expired. Please request a new one.');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log(`🔐 [RESET PASSWORD] Password hashed successfully for user: ${user.email}`);

    // Get current password for comparison
    const currentUser = await this.usersRepository.findOne({ where: { id: user.id } });
    console.log(`📋 [RESET PASSWORD] Current password hash: ${currentUser.password.substring(0, 20)}...`);
    console.log(`📋 [RESET PASSWORD] New password hash: ${hashedPassword.substring(0, 20)}...`);

    // Update user password directly using save method
    currentUser.password = hashedPassword;
    const savedUser = await this.usersRepository.save(currentUser);
    
    console.log(`💾 [RESET PASSWORD] User saved with new password: ${savedUser.password.substring(0, 20)}...`);

    // Verify the password was actually updated
    const verifyUser = await this.usersRepository.findOne({ where: { id: user.id } });
    console.log(`🔍 [RESET PASSWORD] Verification - Password in DB: ${verifyUser.password.substring(0, 20)}...`);
    
    const passwordsMatch = verifyUser.password === hashedPassword;
    console.log(`✅ [RESET PASSWORD] Password update verified: ${passwordsMatch}`);

    if (!passwordsMatch) {
      console.log(`❌ [RESET PASSWORD] Password update failed - passwords don't match`);
      throw new BadRequestException('Failed to update password');
    }

    // Mark reset code as used
    await this.passwordResetRepository.update(resetRecord.id, { isUsed: true });
    console.log(`✅ [RESET PASSWORD] Reset code marked as used: ${resetRecord.id}`);

    // Log the password change
    await this.auditService.logChange('user', 'password_reset', user.id, user.id, {
      action: 'Password reset via email verification',
      email: user.email,
      username: user.username
    });

    console.log(`🎉 [RESET PASSWORD] Password successfully updated for user: ${user.email}`);

    return { message: 'Password reset successfully' };
  }

  // =============== DEBUG METHODS ===============
  
  async updatePasswordDirect(id: number, hashedPassword: string, userId?: number): Promise<User> {
    console.log(`🔧 [UPDATE PASSWORD DIRECT] Updating password for user ID: ${id}`);
    console.log(`🔧 [UPDATE PASSWORD DIRECT] New hashed password: ${hashedPassword.substring(0, 20)}...`);
    
    const user = await this.findOne(id);
    console.log(`🔧 [UPDATE PASSWORD DIRECT] Current password in DB: ${user.password.substring(0, 20)}...`);
    
    // Update password directly without hashing (password is already hashed)
    user.password = hashedPassword;
    const updatedUser = await this.usersRepository.save(user);

    // Verify the password was saved
    const verifyUser = await this.usersRepository.findOne({ where: { id } });
    console.log(`🔧 [UPDATE PASSWORD DIRECT] Password after save: ${verifyUser.password.substring(0, 20)}...`);
    console.log(`🔧 [UPDATE PASSWORD DIRECT] Password match: ${verifyUser.password === hashedPassword}`);

    // Log the change
    if (userId) {
      await this.auditService.logChange('user', 'password_changed', id, userId, {
        action: 'Password changed via forgot password flow'
      });
    }

    console.log(`✅ [UPDATE PASSWORD DIRECT] Password updated successfully for user ID: ${id}`);
    return updatedUser;
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
    console.log(`🔧 [FORCE UPDATE] Starting for email: ${email}`);
    
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    console.log(`🔧 [FORCE UPDATE] User found: ${user.id}`);

    // Hash password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log(`🔧 [FORCE UPDATE] Password hashed: ${hashedPassword.substring(0, 20)}...`);

    // Try multiple update methods
    
    // Method 1: Direct update
    const updateResult = await this.usersRepository.update(user.id, { password: hashedPassword });
    console.log(`🔧 [FORCE UPDATE] Method 1 result:`, updateResult);

    // Method 2: Save entity
    user.password = hashedPassword;
    const savedUser = await this.usersRepository.save(user);
    console.log(`🔧 [FORCE UPDATE] Method 2 saved: ${savedUser.password.substring(0, 20)}...`);

    // Method 3: Query builder
    const queryResult = await this.usersRepository
      .createQueryBuilder()
      .update()
      .set({ password: hashedPassword })
      .where('id = :id', { id: user.id })
      .execute();
    console.log(`🔧 [FORCE UPDATE] Method 3 result:`, queryResult);

    // Verify
    const verifyUser = await this.usersRepository.findOne({ where: { id: user.id } });
    console.log(`🔧 [FORCE UPDATE] Final verification: ${verifyUser.password.substring(0, 20)}...`);

    return {
      message: 'Force update completed',
      methods: {
        update: updateResult,
        save: savedUser.id,
        queryBuilder: queryResult,
      },
      finalPassword: verifyUser.password.substring(0, 20) + '...'
    };
  }
}   