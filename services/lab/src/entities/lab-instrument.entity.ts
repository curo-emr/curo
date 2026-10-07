import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { InstrumentStatus } from '../enums';

@Entity('lab_instruments')
export class LabInstrument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  // The lab the instrument is in: only its staff see and look after it.
  // Null only on instruments added before instruments belonged to a lab.
  @Index()
  @Column({ nullable: true })
  organizationId: string;

  @Column({ nullable: true })
  model: string;

  @Column({ nullable: true })
  manufacturer: string;

  @Column({ nullable: true })
  serialNumber: string;

  @Column({
    type: 'enum',
    enum: InstrumentStatus,
    default: InstrumentStatus.OPERATIONAL,
  })
  status: InstrumentStatus;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  category: string; // hematology | chemistry | microbiology | immunology

  @Column({ type: 'date', nullable: true })
  lastMaintenanceDate: string;

  @Column({ type: 'date', nullable: true })
  nextMaintenanceDate: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ nullable: true })
  responsibleTechnicianId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
