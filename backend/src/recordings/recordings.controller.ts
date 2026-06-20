import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import {
  CreateRecordingDto,
  RegisterDongleRecordingMetadataDto,
  UpdateDongleRecordingSyncStatusDto,
  UpdateRecordingStatusDto,
} from '@voxa/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';
import { RecordingsService } from './recordings.service';

@Controller('recordings')
export class RecordingsController {
  constructor(private readonly recordingsService: RecordingsService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRecordingDto) {
    return this.recordingsService.create(user.supabaseUserId, user.email, dto);
  }

  @Post('dongle/metadata')
  registerDongleMetadata(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterDongleRecordingMetadataDto,
  ) {
    return this.recordingsService.registerDongleMetadata(user.supabaseUserId, user.email, dto);
  }

  @Patch('dongle/status')
  updateDongleSyncStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateDongleRecordingSyncStatusDto,
  ) {
    return this.recordingsService.updateDongleSyncStatus(user.supabaseUserId, dto);
  }

  @Get('dongle/:deviceId')
  listDongleRecordings(@CurrentUser() user: AuthenticatedUser, @Param('deviceId') deviceId: string) {
    return this.recordingsService.listDongleRecordings(user.supabaseUserId, deviceId);
  }

  @Post(':id/upload-url')
  createUploadUrl(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.recordingsService.createUploadUrl(user.supabaseUserId, id);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateRecordingStatusDto,
  ) {
    return this.recordingsService.updateStatus(user.supabaseUserId, id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.recordingsService.list(user.supabaseUserId);
  }

  @Get('result/:id')
  getResult(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.recordingsService.getResult(user.supabaseUserId, id);
  }

  @Get(':id/result')
  getResultByRecordingId(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.recordingsService.getResult(user.supabaseUserId, id);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.recordingsService.get(user.supabaseUserId, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.recordingsService.remove(user.supabaseUserId, id);
  }
}
