import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Stock } from './stock.entity';

export enum StockAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  ADJUST = 'ADJUST',
  IMAGE_UPLOAD = 'IMAGE_UPLOAD'
}

@Entity("stock_tracking")
export class StockTracking {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Stock, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stockId' })
  stock: Stock;

  @Column()
  stockId: number;

  @Column({
    type: 'enum',
    enum: StockAction,
    default: StockAction.CREATE
  })
  action: StockAction;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  oldData: any;

  @Column({ type: 'json', nullable: true })
  newData: any;

  @Column()
  performedBy: string; // Username who performed the action

  @CreateDateColumn()
  performedAt: Date;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;
}