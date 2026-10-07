import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum OrganizationType {
  CLINIC = 'clinic',
  HOSPITAL = 'hospital',
  PHARMACY = 'pharmacy',
  LABORATORY = 'laboratory',
}

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  type: OrganizationType;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  addressLine1: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  licenseNumber: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
