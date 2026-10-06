import { IsNotEmpty, IsString } from 'class-validator';

export class ScanQrDto {
  @IsNotEmpty()
  @IsString()
  qrData: string; // the URL or ID encoded in the QR
}
