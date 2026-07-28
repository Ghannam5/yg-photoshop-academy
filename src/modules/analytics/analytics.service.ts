import { Injectable } from '@nestjs/common';
import { EnrollmentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface DailySales {
  date: string;
  revenue: number;
  orders: number;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const [revenueAgg, invoicesCount, totalUsers, activeStudents, completionAgg] =
      await this.prisma.$transaction([
        this.prisma.invoice.aggregate({
          _sum: { amount: true },
          _count: { _all: true },
        }),
        this.prisma.invoice.count(),
        this.prisma.user.count({ where: { deletedAt: null } }),
        this.prisma.user.count({ where: { enrollments: { some: {} }, deletedAt: null } }),
        this.prisma.studentProgress.aggregate({ _avg: { percentage: true } }),
      ]);

    const revenue = Number(revenueAgg._sum.amount ?? 0);
    const completedOrders = revenueAgg._count._all;
    const completionRate = completionAgg._avg.percentage
      ? Math.round(Number(completionAgg._avg.percentage))
      : 0;

    const topCourses = await this.topCourses(5);
    const salesByDay = await this.salesByDay(30);

    return {
      revenue,
      completedOrders,
      pendingOrders: 0,
      totalUsers,
      activeStudents,
      completionRate,
      topCourses,
      salesByDay,
    };
  }

  async salesByDay(days: number): Promise<DailySales[]> {
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const invoices = await this.prisma.invoice.findMany({
      where: { createdAt: { gte: since } },
      select: { amount: true, createdAt: true },
    });

    const buckets = new Map<string, { revenue: number; orders: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setUTCDate(d.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, { revenue: 0, orders: 0 });
    }

    for (const invoice of invoices) {
      const key = invoice.createdAt.toISOString().slice(0, 10);
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.revenue += Number(invoice.amount);
        bucket.orders += 1;
      }
    }

    return Array.from(buckets.entries()).map(([date, val]) => ({
      date,
      revenue: Math.round(val.revenue * 100) / 100,
      orders: val.orders,
    }));
  }

  async topCourses(limit: number) {
    const grouped = await this.prisma.studentEnrollment.groupBy({
      by: ['courseId'],
      where: { status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] } },
      _count: { _all: true },
      orderBy: { _count: { courseId: 'desc' } },
      take: limit,
    });

    const courseIds = grouped.map((g) => g.courseId);
    const courses = await this.prisma.course.findMany({
      where: { id: { in: courseIds } },
      select: { id: true, title: true, slug: true, thumbnailUrl: true },
    });
    const byId = new Map(courses.map((c) => [c.id, c]));

    return grouped.map((g) => ({
      course: byId.get(g.courseId) ?? null,
      enrollments: g._count._all,
    }));
  }
}
