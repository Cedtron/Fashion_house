import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Stock } from './stock.entity';
import { User } from './user.entity';

@Entity('stock_history')
export class StockHistory {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column({ type: 'int' })
  stockId: number;

  @ApiProperty({ type: () => Stock })
  @ManyToOne(() => Stock, (stock) => stock.history)
  @JoinColumn({ name: 'stockId' })
  stock: Stock;

  @ApiProperty()
  @Column({ length: 50 })
  action: string; // 'created', 'updated', 'stock_added', 'stock_removed', 'stock_adjusted'

  @ApiProperty({ required: false })
  @Column({ type: 'int', nullable: true })
  previousQuantity: number;

  @ApiProperty({ required: false })
  @Column({ type: 'int', nullable: true })
  newQuantity: number;

  @ApiProperty({ required: false })
  @Column({ type: 'int', nullable: true })
  quantityChange: number;

  @ApiProperty({ required: false })
  @Column({ type: 'text', nullable: true })
  notes: string;

  @ApiProperty({ required: false })
  @Column({ type: 'int', nullable: true })
  userId: number;

  @ApiProperty({ type: () => User, required: false })
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({ required: false })
  @Column({ type: 'text', nullable: true })
  changes: string; // JSON string of changed fields

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}

