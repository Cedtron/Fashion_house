import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Request, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ForgotPasswordDto, VerifyResetCodeDto, ResetPasswordDto } from './dto/forgot-password.dto';
import { User } from '../entities/user.entity';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import * as bcrypt from 'bcrypt';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully', type: User })
  create(@Body() createUserDto: CreateUserDto, @Request() req) {
    const userId = req.user?.userId || req.user?.id;
    return this.usersService.create(createUserDto, userId);
  }

 @Post(':id/image')
@UseInterceptors(FileInterceptor('image', {
  storage: diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = './uploads/users';
      if (!existsSync(uploadPath)) mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname).toLowerCase();
      cb(null, `user-${req.params.id}-${unique}${ext}`);
    },
  }),
}))
@ApiConsumes('multipart/form-data')
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      image: {
        type: 'string',
        format: 'binary',
      },
    },
  },
})
@ApiOperation({ summary: 'Upload user profile image' })
async uploadImage(
  @Param('id', ParseIntPipe) id: number,
  @UploadedFile() file: Express.Multer.File,
  @Request() req,
) {
  if (!file) {
    throw new BadRequestException("No file uploaded");
  }

  // Manual safe extension validation
  const allowedExt = ['.png', '.jpg', '.jpeg', '.webp'];
  const ext = extname(file.originalname).toLowerCase();

  if (!allowedExt.includes(ext)) {
    throw new BadRequestException(
      "Invalid file type. Only PNG, JPG, JPEG, WEBP allowed."
    );
  }

  const user = await this.usersService.findOne(id);

  // Delete old profile image if exists
  if (user.imagePath) {
    const oldPath = `.${user.imagePath}`;
    if (existsSync(oldPath)) {
      try {
        unlinkSync(oldPath);
        console.log("Deleted old profile:", oldPath);
      } catch (err) {
        console.log("Error deleting old image:", err);
      }
    }
  }

  const imagePath = `/uploads/users/${file.filename}`;

  const userId = req.user?.userId || req.user?.id;

  // Save new image to DB
  const updated = await this.usersService.update(id, { imagePath }, userId);

  return {
    message: "Profile image updated",
    imagePath,
    user: updated,
  };
}


  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of all users', type: [User] })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({ status: 200, description: 'User found', type: User })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({ status: 200, description: 'User updated successfully', type: User })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto, @Request() req) {
    const userId = req.user?.userId || req.user?.id;
    return this.usersService.update(id, updateUserDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const userId = req.user?.userId || req.user?.id;
    return this.usersService.remove(id, userId);
  }
  // Add these methods to your UsersController

@Patch(':id/activate')
@ApiOperation({ summary: 'Activate a user' })
@ApiResponse({ status: 200, description: 'User activated successfully', type: User })
async activate(@Param('id', ParseIntPipe) id: number, @Request() req) {
  const userId = req.user?.userId || req.user?.id;
  return this.usersService.update(id, { isActive: true }, userId);
}

@Patch(':id/deactivate')
@ApiOperation({ summary: 'Deactivate a user' })
@ApiResponse({ status: 200, description: 'User deactivated successfully', type: User })
async deactivate(@Param('id', ParseIntPipe) id: number, @Request() req) {
  const userId = req.user?.userId || req.user?.id;
  return this.usersService.update(id, { isActive: false }, userId);
}

  // =============== FORGOT PASSWORD ENDPOINTS (PUBLIC) ===============

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset with email and password hint' })
  @ApiResponse({ status: 200, description: 'Email and password hint verified, reset code sent' })
  @ApiResponse({ status: 400, description: 'Invalid email or password hint' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.usersService.forgotPassword(forgotPasswordDto);
  }

  @Post('verify-reset-code')
  @ApiOperation({ summary: 'Verify password reset code' })
  @ApiResponse({ status: 200, description: 'Code verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired code' })
  async verifyResetCode(@Body() verifyResetCodeDto: VerifyResetCodeDto) {
    return this.usersService.verifyResetCode(verifyResetCodeDto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with or without verification code' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid email or expired code' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.usersService.resetPassword(resetPasswordDto);
  }

  // =============== DEBUG ENDPOINTS ===============

  @Post('test-password-update')
  @ApiOperation({ summary: 'Test password update (DEBUG ONLY)' })
  async testPasswordUpdate(@Body() body: { email: string; newPassword: string }) {
    const { email, newPassword } = body;
    
    // Find user
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Hash new password using the same method as the rest of the system
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    console.log(`🧪 [TEST] Updating password for user: ${email}`);
    console.log(`🧪 [TEST] New hash: ${hashedPassword.substring(0, 20)}...`);

    // Update using the direct password update method
    const updatedUser = await this.usersService.updatePasswordDirect(user.id, hashedPassword, user.id);
    
    return {
      message: 'Password updated successfully (TEST)',
      userId: user.id,
      email: user.email,
      passwordUpdated: true
    };
  }

  @Post('debug-user-password')
  @ApiOperation({ summary: 'Complete password debug (DEBUG)' })
  async debugUserPassword(@Body() body: { email: string; testPassword?: string }) {
    const { email, testPassword } = body;
    
    console.log(`🔍 [DEBUG] Full password debug for: ${email}`);
    
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { error: 'User not found', email };
    }

    const result = {
      email: user.email,
      username: user.username,
      userId: user.id,
      isActive: user.isActive,
      passwordHash: user.password,
      passwordHashLength: user.password.length,
      passwordHashPreview: user.password.substring(0, 30) + '...',
      passwordHint: user.passwordhint,
      testResults: {}
    };

    // Test password if provided
    if (testPassword) {
      console.log(`🧪 [DEBUG] Testing password: "${testPassword}"`);
      
      try {
        const isMatch = await bcrypt.compare(testPassword, user.password);
        result.testResults = {
          testPassword: testPassword,
          passwordMatch: isMatch,
          message: isMatch ? 'Password is CORRECT' : 'Password is INCORRECT'
        };
        console.log(`🧪 [DEBUG] Password test result: ${isMatch}`);
      } catch (error) {
        result.testResults = {
          testPassword: testPassword,
          error: error.message,
          message: 'Error during password comparison'
        };
        console.log(`❌ [DEBUG] Password test error:`, error);
      }
    }

    return result;
  }

  // =============== SEPARATE STEP APIs ===============

  @Post('verify-email')
  @ApiOperation({ summary: 'Step 1: Verify email exists' })
  async verifyEmail(@Body() body: { email: string }) {
    const { email } = body;
    
    console.log(`📧 [VERIFY EMAIL] Checking email: ${email}`);
    
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Email not found');
    }

    console.log(`✅ [VERIFY EMAIL] Email found: ${email}`);
    
    return {
      message: 'Email verified successfully',
      email: email,
      success: true
    };
  }

  @Post('verify-password-hint')
  @ApiOperation({ summary: 'Step 2: Verify password hint' })
  async verifyPasswordHint(@Body() body: { email: string; passwordHint: string }) {
    const { email, passwordHint } = body;
    
    console.log(`🔑 [VERIFY HINT] Checking password hint for: ${email}`);
    
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Email not found');
    }

    // Validate password hint (case-insensitive comparison)
    if (user.passwordhint.toLowerCase().trim() !== passwordHint.toLowerCase().trim()) {
      throw new BadRequestException('Invalid password hint');
    }

    console.log(`✅ [VERIFY HINT] Password hint verified for: ${email}`);
    
    return {
      message: 'Password hint verified successfully',
      email: email,
      success: true
    };
  }
@Post('reset-password-direct')
async directResetPassword(@Body() body: { email: string; newPassword: string }) {
  return this.usersService.directResetPassword(body.email, body.newPassword);
}
  @Post('change-password-final')
  @ApiOperation({ summary: 'Step 3: Change password after verification' })
  async changePasswordFinal(@Body() body: { email: string; passwordHint: string; newPassword: string }) {
    const { email, passwordHint, newPassword } = body;
    
    console.log(`🔄 [CHANGE PASSWORD] Starting for email: ${email}`);
    
    // Find user by email
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Email not found');
    }

    // Double-check password hint again for security
    if (user.passwordhint.toLowerCase().trim() !== passwordHint.toLowerCase().trim()) {
      throw new BadRequestException('Invalid password hint');
    }

    console.log(`🔐 [CHANGE PASSWORD] Hashing new password for: ${email}`);

    // Hash new password using the same method as the rest of the system
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    console.log(`💾 [CHANGE PASSWORD] Updating user password in database for: ${email}`);

    // Create a special method in service for direct password update to avoid double hashing
    const updatedUser = await this.usersService.updatePasswordDirect(user.id, hashedPassword, user.id);
    
    console.log(`✅ [CHANGE PASSWORD] Password updated successfully for: ${email}`);

    return {
      message: 'Password changed successfully',
      email: email,
      success: true
    };
  }
}