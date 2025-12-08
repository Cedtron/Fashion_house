import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('logs')
export class Log {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column({ length: 50 })
  level: string; // 'info', 'warning', 'error', 'debug'

  @ApiProperty()
  @Column({ length: 255 })
  action: string;

  @ApiProperty({ required: false })
  @Column({ type: 'text', nullable: true })
  message: string;

  @ApiProperty({ required: false })
  @Column({ type: 'text', nullable: true })
  details: string;

  @ApiProperty({ required: false })
  @Column({ length: 100, nullable: true })
  userId: string;

  @ApiProperty({ required: false })
  @Column({ length: 150, nullable: true })
  username: string;

  @ApiProperty({ required: false })
  @Column({ length: 10, nullable: true })
  method: string;

  @ApiProperty({ required: false })
  @Column({ length: 255, nullable: true })
  path: string;

  @ApiProperty({ required: false })
  @Column({ type: 'int', nullable: true })
  statusCode: number;

  @ApiProperty({ required: false })
  @Column({ type: 'json', nullable: true })
  payload: any;

  @ApiProperty({ required: false })
  @Column({ length: 255, nullable: true })
  ipAddress: string;

  @ApiProperty({ required: false })
  @Column({ length: 255, nullable: true })
  userAgent: string;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}

