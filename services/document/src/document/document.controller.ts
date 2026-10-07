import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Header,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { DocumentService } from './document.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  CurrentUser,
  type AuthUser,
} from '@curo/shared/auth';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentController {
  constructor(private documentService: DocumentService) {}

  // Doctor or lab staff uploads a document (multipart/form-data: `file` + fields).
  @Post()
  @Roles('DOCTOR', 'LAB_STAFF', 'SUPER_ADMIN')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }),
  )
  @Header('Content-Type', 'application/fhir+json')
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateDocumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.documentService.upload(file, dto, user);
  }

  // Staff list documents (metadata only) for a patient, visit or lab order;
  // lab staff see only their lab's report files.
  @Get()
  @Roles('DOCTOR', 'LAB_STAFF', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  list(
    @CurrentUser() user: AuthUser,
    @Query('patientId') patientId?: string,
    @Query('encounterId') encounterId?: string,
    @Query('serviceRequestId') serviceRequestId?: string,
  ) {
    return this.documentService.listForStaff(user, {
      patientId,
      encounterId,
      serviceRequestId,
    });
  }

  // Patient lists only their own documents; identity comes from the JWT.
  @Get('me')
  @Roles('PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  listMine(@CurrentUser() user: AuthUser) {
    return this.documentService.listForPatient(user);
  }

  // Stream the binary content (access-checked inside the service).
  @Get(':id/content')
  @Roles('PATIENT', 'DOCTOR', 'LAB_STAFF', 'SUPER_ADMIN')
  async content(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const { doc, stream } = await this.documentService.openContent(id, user);
    res.setHeader(
      'Content-Type',
      doc.contentType || 'application/octet-stream',
    );
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${doc.fileName || 'document'}"`,
    );
    stream.on('error', () => {
      if (!res.headersSent) res.status(500).end();
    });
    stream.pipe(res);
  }
}
