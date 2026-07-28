import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';
import { EnrollmentStatus } from '@prisma/client';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  async createReview(userId: string, courseId: string, dto: CreateReviewDto) {
    // Check if user is enrolled
    const enrollment = await this.prisma.studentEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE && enrollment.status !== EnrollmentStatus.COMPLETED) {
      throw new ForbiddenException('You must be enrolled in this course to leave a review.');
    }

    // Check if review already exists
    const existingReview = await this.prisma.review.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this course.');
    }

    return this.prisma.review.create({
      data: {
        userId,
        courseId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });
  }

  async updateReview(userId: string, reviewId: string, dto: UpdateReviewDto) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('You can only update your own review.');
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: dto,
    });
  }

  async deleteReview(userId: string, reviewId: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Check if user is the author (or an admin - we could check role if we passed user object)
    if (review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own review.');
    }

    return this.prisma.review.delete({ where: { id: reviewId } });
  }

  async getCourseReviews(courseId: string, page: number = 1, pageSize: number = 10) {
    const skip = (page - 1) * pageSize;

    const [total, reviews] = await Promise.all([
      this.prisma.review.count({ where: { courseId, isPublic: true } }),
      this.prisma.review.findMany({
        where: { courseId, isPublic: true },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      }),
    ]);

    return {
      data: reviews,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getCourseRating(courseId: string) {
    const result = await this.prisma.review.aggregate({
      where: { courseId, isPublic: true },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      averageRating: result._avg.rating || 0,
      totalReviews: result._count.rating,
    };
  }
}
