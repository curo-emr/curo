import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

@Entity('qr_codes')
export class QrCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  serviceRequestId: string;

  @Column()
  encodedUrl: string; // the URL encoded in the QR

  @Column({ type: 'text' })
  imageBase64: string; // base64 PNG

  @Column({ nullable: true })
  scannedAt: Date;

  @Column({ nullable: true })
  scannedBy: string; // practitioner id

  @CreateDateColumn()
  createdAt: Date;
}
