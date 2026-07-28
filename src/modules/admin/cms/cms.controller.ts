import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CmsService } from './cms.service';
import { JwtAuthGuard, RolesGuard } from '../../auth/guards';
import { Roles, Public } from '../../auth/decorators';
import {
  CreateBannerDto, UpdateBannerDto,
  CreateFaqDto, UpdateFaqDto,
  CreateTestimonialDto, UpdateTestimonialDto,
  CreateContactDto, UpdateContactStatusDto,
  UpdateSettingDto,
  UpdateEmailTemplateDto,
} from './dto';

@ApiTags('CMS Dashboard')
@ApiBearerAuth()
@Controller()
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  // ==========================
  // Banners (Admin)
  // ==========================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/cms/banners')
  @ApiOperation({ summary: 'List all banners' })
  getBanners() {
    return this.cmsService.getBanners();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('admin/cms/banners')
  @ApiOperation({ summary: 'Create banner' })
  createBanner(@Body() dto: CreateBannerDto) {
    return this.cmsService.createBanner(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put('admin/cms/banners/:id')
  @ApiOperation({ summary: 'Update banner' })
  updateBanner(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    return this.cmsService.updateBanner(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('admin/cms/banners/:id')
  @ApiOperation({ summary: 'Delete banner' })
  deleteBanner(@Param('id') id: string) {
    return this.cmsService.deleteBanner(id);
  }

  // ==========================
  // FAQs
  // ==========================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/cms/faqs')
  @ApiOperation({ summary: 'List all FAQs (admin view)' })
  getAdminFaqs() {
    return this.cmsService.getFaqs(true);
  }

  @Public()
  @Get('cms/faqs')
  @ApiOperation({ summary: 'List active FAQs' })
  getPublicFaqs() {
    return this.cmsService.getFaqs(false);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('admin/cms/faqs')
  @ApiOperation({ summary: 'Create FAQ' })
  createFaq(@Body() dto: CreateFaqDto) {
    return this.cmsService.createFaq(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put('admin/cms/faqs/:id')
  @ApiOperation({ summary: 'Update FAQ' })
  updateFaq(@Param('id') id: string, @Body() dto: UpdateFaqDto) {
    return this.cmsService.updateFaq(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('admin/cms/faqs/:id')
  @ApiOperation({ summary: 'Soft delete FAQ' })
  deleteFaq(@Param('id') id: string) {
    return this.cmsService.deleteFaq(id);
  }

  // ==========================
  // Testimonials
  // ==========================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/cms/testimonials')
  @ApiOperation({ summary: 'List all testimonials' })
  getAdminTestimonials() {
    return this.cmsService.getTestimonials(false);
  }

  @Public()
  @Get('cms/testimonials')
  @ApiOperation({ summary: 'List featured testimonials' })
  getPublicTestimonials() {
    return this.cmsService.getTestimonials(true);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('admin/cms/testimonials')
  @ApiOperation({ summary: 'Create testimonial' })
  createTestimonial(@Body() dto: CreateTestimonialDto) {
    return this.cmsService.createTestimonial(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put('admin/cms/testimonials/:id')
  @ApiOperation({ summary: 'Update testimonial' })
  updateTestimonial(@Param('id') id: string, @Body() dto: UpdateTestimonialDto) {
    return this.cmsService.updateTestimonial(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('admin/cms/testimonials/:id')
  @ApiOperation({ summary: 'Delete testimonial' })
  deleteTestimonial(@Param('id') id: string) {
    return this.cmsService.deleteTestimonial(id);
  }

  // ==========================
  // Settings
  // ==========================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/settings/website')
  @ApiOperation({ summary: 'Get all website settings' })
  getWebsiteSettings() {
    return this.cmsService.getWebsiteSettings();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put('admin/settings/website/:key')
  @ApiOperation({ summary: 'Update a website setting' })
  updateWebsiteSetting(@Param('key') key: string, @Body() dto: UpdateSettingDto) {
    return this.cmsService.updateWebsiteSetting(key, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/settings/system')
  @ApiOperation({ summary: 'Get all system settings' })
  getSystemSettings() {
    return this.cmsService.getSystemSettings(false);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put('admin/settings/system/:key')
  @ApiOperation({ summary: 'Update a system setting' })
  updateSystemSetting(@Param('key') key: string, @Body() dto: UpdateSettingDto) {
    return this.cmsService.updateSystemSetting(key, dto);
  }

  @Public()
  @Get('settings/public')
  @ApiOperation({ summary: 'Get public system settings' })
  getPublicSettings() {
    return this.cmsService.getSystemSettings(true);
  }

  // ==========================
  // Contact Messages
  // ==========================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/cms/contacts')
  @ApiOperation({ summary: 'List all contact messages' })
  getContactMessages() {
    return this.cmsService.getContactMessages();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/cms/contacts/:id')
  @ApiOperation({ summary: 'Get message details' })
  getContactMessage(@Param('id') id: string) {
    return this.cmsService.getContactMessage(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('admin/cms/contacts/:id/status')
  @ApiOperation({ summary: 'Update message status' })
  updateContactStatus(@Param('id') id: string, @Body() dto: UpdateContactStatusDto) {
    return this.cmsService.updateContactStatus(id, dto);
  }

  @Public()
  @Post('cms/contact')
  @ApiOperation({ summary: 'Submit a contact message' })
  submitContactMessage(@Body() dto: CreateContactDto) {
    return this.cmsService.submitContactMessage(dto);
  }

  // ==========================
  // Email Templates
  // ==========================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/cms/email-templates')
  @ApiOperation({ summary: 'List all email templates' })
  getEmailTemplates() {
    return this.cmsService.getEmailTemplates();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/cms/email-templates/:id')
  @ApiOperation({ summary: 'Get email template details' })
  getEmailTemplate(@Param('id') id: string) {
    return this.cmsService.getEmailTemplate(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put('admin/cms/email-templates/:id')
  @ApiOperation({ summary: 'Update email template' })
  updateEmailTemplate(@Param('id') id: string, @Body() dto: UpdateEmailTemplateDto) {
    return this.cmsService.updateEmailTemplate(id, dto);
  }
}
