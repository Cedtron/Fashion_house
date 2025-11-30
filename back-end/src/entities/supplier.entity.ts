import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('suppliers')
export class Supplier {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column({ length: 255 })
  name: string;

  @ApiProperty({ required: false })
  @Column({ length: 255, nullable: true })
  contactPerson: string;

  @ApiProperty({ required: false })
  @Column({ length: 100, nullable: true })
  email: string;

  @ApiProperty({ required: false })
  @Column({ length: 20, nullable: true })
  phone: string;

  @ApiProperty({ required: false })
  @Column({ type: 'text', nullable: true })
  address: string;

  @ApiProperty({ required: false })
  @Column({ length: 100, nullable: true })
  city: string;

  @ApiProperty({ required: false })
  @Column({ length: 50, nullable: true })
  country: string;

  @ApiProperty({ required: false })
  @Column({ length: 20, nullable: true })
  postalCode: string;

  @ApiProperty({ required: false })
  @Column({ type: 'text', nullable: true })
  notes: string;

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

