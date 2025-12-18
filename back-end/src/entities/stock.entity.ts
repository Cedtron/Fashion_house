import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { StockHistory } from './stock-history.entity';
import { Shade } from './shade.entity';
import { StockTracking } from './stock-tracking.entity';

@Entity("stock")
export class Stock {
  @PrimaryGeneratedColumn()
  id: number;

   @Column({ unique: true, nullable: false })
  stockId: string;

  @Column()
  product: string;

  @Column()
  category: string; // Fabric, Accessories, etc

  @Column({ type: "int" })
  quantity: number;

  @Column({ type: "float" })
  cost: number;

  @Column({ type: "float" })
  price: number;

  @Column({ nullable: true })
  imagePath: string; // stored file path

  @OneToMany(() => Shade, (shade) => shade.stock, { cascade: true })
  shades: Shade[];

  @OneToMany(() => StockHistory, (history) => history.stock, { cascade: true })
  history: StockHistory[];

  @OneToMany(() => StockTracking, (tracking) => tracking.stock, { cascade: true })
  tracking: StockTracking[];

@Column({ nullable: true })
imageHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}