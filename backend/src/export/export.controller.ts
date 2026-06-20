import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';
import { ExportService, ExportFormat } from './export.service';

@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('note/:id')
  note(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Query('format') format?: ExportFormat) {
    return this.exportService.exportNote(user.supabaseUserId, id, format);
  }

  @Get('transcript/:id')
  transcript(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Query('format') format?: ExportFormat) {
    return this.exportService.exportTranscript(user.supabaseUserId, id, format);
  }

  @Get('daily/:date')
  daily(@CurrentUser() user: AuthenticatedUser, @Param('date') date: string, @Query('format') format?: ExportFormat) {
    return this.exportService.exportDailyDigest(user.supabaseUserId, date, format);
  }

  @Get('entity/:id')
  entity(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Query('format') format?: ExportFormat) {
    return this.exportService.exportEntity(user.supabaseUserId, id, format);
  }
}
