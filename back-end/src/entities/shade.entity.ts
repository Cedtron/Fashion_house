import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Stock } from './stock.entity';

@Entity("shade")
export class Shade {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  colorName: string;

  @Column()
  color: string; // hex

  @Column({ type: "int" })
  quantity: number;

  @Column()
  unit: string; // Rolls, Pieces, Boxes

  @Column({ type: "float" })
  length: number;

  @Column()
  lengthUnit: string; // Yards, Meters, Inches

  @ManyToOne(() => Stock, (stock) => stock.shades, { onDelete: "CASCADE" })
  @JoinColumn({ name: 'stockId' })
  stock: Stock;

  @Column()
  stockId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}