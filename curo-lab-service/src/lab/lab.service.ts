import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceRequest } from '../entities/service-request.entity';
import { DiagnosticReport } from '../entities/diagnostic-report.entity';
import { Observation } from '../entities/observation.entity';
import { QrCode } from '../entities/qr-code.entity';
import { LabInstrument } from '../entities/lab-instrument.entity';
import { EnterResultsDto } from './dto/enter-results.dto';
import { ScanQrDto } from './dto/scan-qr.dto';
import { ServiceRequestStatus, DiagnosticReportStatus, ObservationStatus, InstrumentStatus } from '../enums';
import { generateLabReportPdf } from './pdf.generator';

function toFhirServiceRequest(s: ServiceRequest) {
  return {
    resourceType: 'ServiceRequest',
    id: s.id,
    status: s.status,
    code: { coding: [{ code: s.code, display: s.display }] },
    subject: { reference: `Patient/${s.patientId}` },
    requester: { reference: `Practitioner/${s.requesterId}` },
    authoredOn: s.authoredOn,
    priority: s.priority,
    testPanel: s.testPanel,
    receivedAt: s.receivedAt,
    completedAt: s.completedAt,
  };
}

function toFhirReport(r: DiagnosticReport) {
  return {
    resourceType: 'DiagnosticReport',
    id: r.id,
    status: r.status,
    code: { coding: [{ code: r.code, display: r.display }] },
    subject: { reference: `Patient/${r.patientId}` },
    performer: [{ reference: `Practitioner/${r.performerId}` }],
    basedOn: [{ reference: `ServiceRequest/${r.serviceRequestId}` }],
    effectiveDateTime: r.effectiveDateTime,
    issued: r.issued,
    conclusion: r.conclusion,
    result: (r.results || []).map((res: any) => ({ display: res.display })),
    presentedForm: r.pdfBase64 ? [{ contentType: 'application/pdf', data: r.pdfBase64 }] : [],
  };
}

@Injectable()
export class LabService {
  constructor(
    @InjectRepository(ServiceRequest)
    private ordersRepo: Repository<ServiceRequest>,
    @InjectRepository(DiagnosticReport)
    private reportsRepo: Repository<DiagnosticReport>,
    @InjectRepository(Observation)
    private observationsRepo: Repository<Observation>,
    @InjectRepository(QrCode)
    private qrRepo: Repository<QrCode>,
    @InjectRepository(LabInstrument)
    private instrumentsRepo: Repository<LabInstrument>,
  ) {}

  // Lab orders queue
  async getOrders(status?: string): Promise<any[]> {
    const query = this.ordersRepo.createQueryBuilder('s');
    if (status) query.where('s.status = :status', { status });
    const orders = await query.orderBy('s.authoredOn', 'ASC').getMany();
    return orders.map(toFhirServiceRequest);
  }

  async getOrder(id: string): Promise<any> {
    const order = await this.ordersRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException(`Lab order ${id} not found`);
    const qr = order.qrCodeId ? await this.qrRepo.findOne({ where: { id: order.qrCodeId } }) : null;
    return { ...toFhirServiceRequest(order), qrCode: qr ? { id: qr.id, imageBase64: qr.imageBase64 } : null };
  }

  async scanQr(dto: ScanQrDto, performerId: string): Promise<any> {
    // QR encodes URL like http://localhost:3000/lab/orders/:id
    const parts = dto.qrData.split('/');
    const orderId = parts[parts.length - 1];

    const qr = await this.qrRepo.findOne({ where: { serviceRequestId: orderId } });
    if (qr && !qr.scannedAt) {
      qr.scannedAt = new Date();
      qr.scannedBy = performerId;
      await this.qrRepo.save(qr);
    }

    // Mark order as received
    const order = await this.ordersRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Lab order not found for QR data`);
    if (!order.receivedAt) {
      order.receivedAt = new Date();
      order.performerId = performerId;
      await this.ordersRepo.save(order);
    }

    return toFhirServiceRequest(order);
  }

  async receiveOrder(id: string, performerId: string): Promise<any> {
    const order = await this.ordersRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException(`Lab order ${id} not found`);
    order.receivedAt = new Date();
    order.performerId = performerId;
    const saved = await this.ordersRepo.save(order);
    return toFhirServiceRequest(saved);
  }

  // Enter results and generate PDF report
  async enterResults(dto: EnterResultsDto, performerId: string): Promise<any> {
    const order = await this.ordersRepo.findOne({ where: { id: dto.serviceRequestId } });
    if (!order) throw new NotFoundException(`Lab order ${dto.serviceRequestId} not found`);

    // Save individual observations
    for (const r of dto.results) {
      const obs = this.observationsRepo.create({
        patientId: order.patientId,
        practitionerId: performerId,
        serviceRequestId: order.id,
        status: ObservationStatus.FINAL,
        category: 'laboratory',
        code: r.code,
        display: r.display,
        valueQuantity: r.value,
        valueUnit: r.unit,
        valueString: r.valueString,
        interpretation: r.interpretation,
        referenceRangeLow: r.referenceRangeLow,
        referenceRangeHigh: r.referenceRangeHigh,
        referenceRangeText: r.referenceRangeText,
        effectiveDateTime: new Date(),
      });
      await this.observationsRepo.save(obs);
    }

    // Generate PDF report
    const pdfBase64 = await generateLabReportPdf({
      patientName: `Patient ${order.patientId}`,
      patientCode: order.patientId,
      birthDate: 'On file',
      testName: order.display,
      results: dto.results,
      conclusion: dto.conclusion,
      labStaffName: `Staff ${performerId}`,
      clinicName: 'Curo Medical Center',
      reportDate: new Date().toLocaleDateString(),
    });

    // Create DiagnosticReport
    const reportData: Partial<DiagnosticReport> = {
      patientId: order.patientId,
      serviceRequestId: order.id,
      performerId,
      status: DiagnosticReportStatus.FINAL,
      code: order.code,
      display: order.display,
      results: dto.results as unknown as Record<string, unknown>[],
      conclusion: dto.conclusion,
      pdfBase64,
      effectiveDateTime: new Date(),
      issued: new Date(),
    };
    const savedReports = await this.reportsRepo.save([reportData as DiagnosticReport]);
    const savedReport = savedReports[0];

    // Mark order as completed
    await this.ordersRepo.update(order.id, {
      status: ServiceRequestStatus.COMPLETED,
      completedAt: new Date(),
    });

    return toFhirReport(savedReport);
  }

  async getReports(patientId?: string): Promise<any[]> {
    const where = patientId ? { patientId } : {};
    const reports = await this.reportsRepo.find({ where, order: { issued: 'DESC' } });
    return reports.map(toFhirReport);
  }

  async getReport(id: string): Promise<any> {
    const r = await this.reportsRepo.findOne({ where: { id } });
    if (!r) throw new NotFoundException(`Report ${id} not found`);
    return toFhirReport(r);
  }

  // Instruments
  async getInstruments(): Promise<LabInstrument[]> {
    return this.instrumentsRepo.find();
  }

  async updateInstrumentStatus(id: string, status: InstrumentStatus, notes?: string): Promise<LabInstrument> {
    const instrument = await this.instrumentsRepo.findOne({ where: { id } });
    if (!instrument) throw new NotFoundException(`Instrument ${id} not found`);
    instrument.status = status;
    if (notes) instrument.notes = notes;
    if (status === InstrumentStatus.MAINTENANCE) instrument.lastMaintenanceDate = new Date().toISOString().split('T')[0];
    return this.instrumentsRepo.save(instrument);
  }

  async createInstrument(dto: Partial<LabInstrument>): Promise<LabInstrument> {
    const instrument = this.instrumentsRepo.create(dto);
    return this.instrumentsRepo.save(instrument);
  }

  // TAT calculation
  async getTatStats(): Promise<any> {
    const completed = await this.ordersRepo.find({ where: { status: ServiceRequestStatus.COMPLETED } });
    const withTat = completed.filter(o => o.receivedAt && o.completedAt);
    if (!withTat.length) return { averageTatMinutes: null, count: 0 };

    const tats = withTat.map(o => (o.completedAt.getTime() - o.receivedAt.getTime()) / 60000);
    const avg = tats.reduce((a, b) => a + b, 0) / tats.length;
    return { averageTatMinutes: Math.round(avg), count: withTat.length, tats };
  }
}
