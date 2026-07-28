import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateBannerDto, UpdateBannerDto,
  CreateFaqDto, UpdateFaqDto,
  CreateTestimonialDto, UpdateTestimonialDto,
  CreateContactDto, UpdateContactStatusDto,
  UpdateSettingDto,
  UpdateEmailTemplateDto,
} from './dto';

@Injectable()
export class CmsService {
  constructor(private prisma: PrismaService) {}

  // ==========================
  // Banners
  // ==========================
  async getBanners() {
    return this.prisma.banner.findMany({ orderBy: { order: 'asc' } });
  }

  async createBanner(dto: CreateBannerDto) {
    return this.prisma.banner.create({ data: dto });
  }

  async updateBanner(id: string, dto: UpdateBannerDto) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    return this.prisma.banner.update({ where: { id }, data: dto });
  }

  async deleteBanner(id: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    return this.prisma.banner.delete({ where: { id } });
  }

  // ==========================
  // FAQs
  // ==========================
  async getFaqs(includeInactive = false) {
    const where = includeInactive ? { deletedAt: null } : { isActive: true, deletedAt: null };
    return this.prisma.fAQ.findMany({ where, orderBy: { order: 'asc' } });
  }

  async createFaq(dto: CreateFaqDto) {
    return this.prisma.fAQ.create({ data: dto });
  }

  async updateFaq(id: string, dto: UpdateFaqDto) {
    const faq = await this.prisma.fAQ.findUnique({ where: { id, deletedAt: null } });
    if (!faq) throw new NotFoundException('FAQ not found');
    return this.prisma.fAQ.update({ where: { id }, data: dto });
  }

  async deleteFaq(id: string) {
    const faq = await this.prisma.fAQ.findUnique({ where: { id, deletedAt: null } });
    if (!faq) throw new NotFoundException('FAQ not found');
    return this.prisma.fAQ.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // ==========================
  // Testimonials
  // ==========================
  async getTestimonials(featuredOnly = false) {
    const where = featuredOnly ? { isFeatured: true } : {};
    return this.prisma.testimonial.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async createTestimonial(dto: CreateTestimonialDto) {
    return this.prisma.testimonial.create({ data: dto });
  }

  async updateTestimonial(id: string, dto: UpdateTestimonialDto) {
    const testimonial = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!testimonial) throw new NotFoundException('Testimonial not found');
    return this.prisma.testimonial.update({ where: { id }, data: dto });
  }

  async deleteTestimonial(id: string) {
    const testimonial = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!testimonial) throw new NotFoundException('Testimonial not found');
    return this.prisma.testimonial.delete({ where: { id } });
  }

  // ==========================
  // Settings
  // ==========================
  async getWebsiteSettings() {
    return this.prisma.websiteSetting.findMany();
  }

  async updateWebsiteSetting(key: string, dto: UpdateSettingDto) {
    return this.prisma.websiteSetting.update({
      where: { key },
      data: { value: dto.value },
    });
  }

  async getSystemSettings(publicOnly = false) {
    const where = publicOnly ? { isPublic: true } : {};
    return this.prisma.systemSetting.findMany({ where });
  }

  async updateSystemSetting(key: string, dto: UpdateSettingDto) {
    return this.prisma.systemSetting.update({
      where: { key },
      data: { value: String(dto.value) },
    });
  }

  // ==========================
  // Contact Messages
  // ==========================
  async getContactMessages() {
    return this.prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async getContactMessage(id: string) {
    const msg = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!msg) throw new NotFoundException('Message not found');
    return msg;
  }

  async updateContactStatus(id: string, dto: UpdateContactStatusDto) {
    const msg = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!msg) throw new NotFoundException('Message not found');
    return this.prisma.contactMessage.update({ where: { id }, data: { status: dto.status } });
  }

  async submitContactMessage(dto: CreateContactDto) {
    return this.prisma.contactMessage.create({ data: dto });
  }

  // ==========================
  // Email Templates
  // ==========================
  async getEmailTemplates() {
    return this.prisma.emailTemplate.findMany({ where: { deletedAt: null } });
  }

  async getEmailTemplate(id: string) {
    const tpl = await this.prisma.emailTemplate.findUnique({ where: { id, deletedAt: null } });
    if (!tpl) throw new NotFoundException('Email template not found');
    return tpl;
  }

  async updateEmailTemplate(id: string, dto: UpdateEmailTemplateDto) {
    const tpl = await this.prisma.emailTemplate.findUnique({ where: { id, deletedAt: null } });
    if (!tpl) throw new NotFoundException('Email template not found');
    return this.prisma.emailTemplate.update({ where: { id }, data: dto });
  }
}
