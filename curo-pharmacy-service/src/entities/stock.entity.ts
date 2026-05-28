import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('stock')
export class Stock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  medicationCode: string;

  @Column()
  medicationName: string;

  @Column({ nullable: true })
  genericName: string;

  @Column({ nullable: true })
  form: string; // tablet | capsule | syrup | injection | cream

  @Column({ nullable: true })
  strength: string; // e.g. "500mg", "5mg/ml"

  @Column({ default: 0 })
  quantity: number;

  @Column({ nullable: true })
  unit: string; // tablets | ml | vials

  @Column({ type: 'date', nullable: true })
  expiryDate: string;

  @Column({ default: 10 })
  reorderThreshold: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  unitPrice: number;

  @Column({ nullable: true })
  supplier: string;

  @Column({ nullable: true })
  batchNumber: string;

  @Column({ nullable: true })
  storageLocation: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
