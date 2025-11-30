import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Request, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '../entities/user.entity';
import { existsSync, mkdirSync, unlinkSync } from 'fs';

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
}
