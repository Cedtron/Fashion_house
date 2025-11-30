import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('users')
export class User {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column({ length: 100, unique: true })
  email: string;

  @ApiProperty()
  @Column({ length: 255 })
  password: string;

  @ApiProperty()
  @Column({ length: 255 })
  passwordhint: string;

  @ApiProperty()
  @Column({ length: 100, unique: true })
  username: string;

  @ApiProperty({ required: false })
  @Column({ length: 20, nullable: true })
  phone: string;

  @ApiProperty({ required: false })
  @Column({ type: 'text', nullable: true })
  imagePath: string;

  @ApiProperty({ required: false })
  @Column({ length: 50, default: 'user' })
  role: string;

  @ApiProperty({ required: false })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}

