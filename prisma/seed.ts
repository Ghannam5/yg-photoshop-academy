// prisma/seed.ts

import { PrismaClient, UserRole, UserStatus, CourseStatus, EnrollmentCodeStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ============================================================================
  // 1. ROLES
  // ============================================================================
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'Full system access with all permissions',
    },
  });

  const studentRole = await prisma.role.upsert({
    where: { name: 'STUDENT' },
    update: {},
    create: {
      name: 'STUDENT',
      description: 'Student access to courses and learning features',
    },
  });

  const instructorRole = await prisma.role.upsert({
    where: { name: 'INSTRUCTOR' },
    update: {},
    create: {
      name: 'INSTRUCTOR',
      description: 'Instructor access to manage courses and students',
    },
  });

  console.log('✅ Roles created');

  // ============================================================================
  // 2. PERMISSIONS
  // ============================================================================
  const permissions = [
    { name: 'users.read', module: 'users', description: 'View user profiles and details' },
    { name: 'users.write', module: 'users', description: 'Create, update, and delete users' },
    { name: 'courses.read', module: 'courses', description: 'View course catalog and details' },
    { name: 'courses.write', module: 'courses', description: 'Create, update, and publish courses' },
    { name: 'settings.read', module: 'settings', description: 'View system settings' },
    { name: 'settings.write', module: 'settings', description: 'Manage system and website settings' },
    { name: 'analytics.read', module: 'analytics', description: 'View platform analytics and reports' },
    { name: 'support.read', module: 'support', description: 'View support tickets' },
    { name: 'support.write', module: 'support', description: 'Manage support tickets and replies' },
    { name: 'content.read', module: 'content', description: 'View media and content' },
    { name: 'content.write', module: 'content', description: 'Upload and manage media files' },
    { name: 'enrollment_codes.read', module: 'enrollment_codes', description: 'View enrollment codes' },
    { name: 'enrollment_codes.write', module: 'enrollment_codes', description: 'Create and manage enrollment codes' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }

  console.log('✅ Permissions created');

  // ============================================================================
  // 3. ROLE PERMISSIONS
  // ============================================================================
  const allPermissions = await prisma.permission.findMany();

  // Admin gets all permissions
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: perm.id,
      },
    });
  }

  // Student gets read-only permissions
  const studentPermissions = allPermissions.filter((p) =>
    ['courses.read', 'users.read', 'content.read'].includes(p.name)
  );

  for (const perm of studentPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: studentRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: studentRole.id,
        permissionId: perm.id,
      },
    });
  }

  // Instructor gets course and content permissions
  const instructorPermissions = allPermissions.filter((p) =>
    ['courses.read', 'courses.write', 'content.read', 'content.write', 'users.read'].includes(p.name)
  );

  for (const perm of instructorPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: instructorRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: instructorRole.id,
        permissionId: perm.id,
      },
    });
  }

  console.log('✅ Role permissions assigned');

  // ============================================================================
  // 4. USERS (ADMIN, INSTRUCTOR, STUDENT)
  // ============================================================================
  const hashedPassword = await bcrypt.hash('Admin@123456', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ygacademy.com' },
    update: {},
    create: {
      email: 'admin@ygacademy.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      roleId: adminRole.id,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  const instructorPassword = await bcrypt.hash('Instructor@123456', 12);
  const instructor = await prisma.user.upsert({
    where: { email: 'instructor@ygacademy.com' },
    update: {},
    create: {
      email: 'instructor@ygacademy.com',
      password: instructorPassword,
      firstName: 'Youssef',
      lastName: 'Gharib',
      role: UserRole.INSTRUCTOR,
      roleId: instructorRole.id,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      bio: 'Master Photoshop Instructor & Digital Artist with 10+ years experience.',
    },
  });

  const studentPassword = await bcrypt.hash('Student@123456', 12);
  const student = await prisma.user.upsert({
    where: { email: 'student@ygacademy.com' },
    update: {},
    create: {
      email: 'student@ygacademy.com',
      password: studentPassword,
      firstName: 'Demo',
      lastName: 'Student',
      role: UserRole.STUDENT,
      roleId: studentRole.id,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  console.log('✅ Default users created (Admin, Instructor, Student)');

  // ============================================================================
  // 5. WEBSITE SETTINGS
  // ============================================================================
  const websiteSettings = [
    {
      key: 'seo.title',
      value: { default: 'YG Photoshop Academy — Master Photoshop' },
      group: 'seo',
      description: 'Default page title',
    },
    {
      key: 'seo.description',
      value: { default: 'Learn Photoshop with premium education from industry professionals.' },
      group: 'seo',
      description: 'Default meta description',
    },
    {
      key: 'brand.primaryColor',
      value: { default: '#08CB00' },
      group: 'brand',
      description: 'Primary brand color',
    },
    {
      key: 'brand.darkColor',
      value: { default: '#253900' },
      group: 'brand',
      description: 'Dark brand color',
    },
  ];

  for (const setting of websiteSettings) {
    await prisma.websiteSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log('✅ Website settings created');

  // ============================================================================
  // 6. SYSTEM SETTINGS
  // ============================================================================
  const systemSettings = [
    {
      key: 'site.name',
      value: 'YG Photoshop Academy',
      group: 'general',
      type: 'string',
      description: 'Site name',
      isPublic: true,
    },
    {
      key: 'auth.jwt.expiresIn',
      value: '15m',
      group: 'auth',
      type: 'string',
      description: 'JWT token expiration',
      isPublic: false,
    },
    {
      key: 'auth.refresh.expiresIn',
      value: '7d',
      group: 'auth',
      type: 'string',
      description: 'Refresh token expiration',
      isPublic: false,
    },
  ];

  for (const setting of systemSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log('✅ System settings created');

  // ============================================================================
  // 7. COURSE CATEGORIES
  // ============================================================================
  const designCategory = await prisma.courseCategory.upsert({
    where: { slug: 'design' },
    update: {},
    create: {
      name: 'Design',
      slug: 'design',
      icon: 'palette',
      order: 1,
    },
  });

  console.log('✅ Course categories created');

  // ============================================================================
  // 8. PHOTOSHOP MASTERY COURSE
  // ============================================================================
  const course = await prisma.course.upsert({
    where: { slug: 'photoshop-masterclass-2026' },
    update: {},
    create: {
      title: 'Photoshop Masterclass 2026',
      slug: 'photoshop-masterclass-2026',
      subtitle: 'From Zero to Professional Photo Editor',
      description:
        'The definitive Photoshop course covering everything from basics to advanced techniques.',
      price: 199.0,
      compareAtPrice: 499.0,
      currency: 'EGP',
      status: CourseStatus.PUBLISHED,
      level: 'BEGINNER',
      language: 'ar',
      totalDuration: '40h 30m',
      totalLessons: 120,
      totalModules: 12,
      publishedAt: new Date(),
    },
  });

  await prisma.courseInstructor.upsert({
    where: {
      courseId_userId: {
        courseId: course.id,
        userId: instructor.id,
      },
    },
    update: {},
    create: {
      courseId: course.id,
      userId: instructor.id,
      isPrimary: true,
    },
  });

  console.log('✅ Photoshop Masterclass course & instructor created');

  // ============================================================================
  // 9. CERTIFICATE TEMPLATE
  // ============================================================================
  await prisma.certificateTemplate.upsert({
    where: { courseId: course.id },
    update: {},
    create: {
      courseId: course.id,
      name: 'Photoshop Mastery Certificate',
      description: 'Certificate of completion for Photoshop Masterclass 2026',
      templateUrl: 'https://storage.ygacademy.com/certificates/photoshop-template.jpg',
      signatureUrl: 'https://storage.ygacademy.com/signatures/instructor-signature.png',
      prefix: 'YG',
      isActive: true,
    },
  });

  console.log('✅ Certificate template created');

  // ============================================================================
  // 10. ENROLLMENT CODE
  // ============================================================================
  await prisma.enrollmentCode.upsert({
    where: { code: 'TEST-CODE-2026' },
    update: {},
    create: {
      code: 'TEST-CODE-2026',
      courseId: course.id,
      status: EnrollmentCodeStatus.ACTIVE,
      createdById: admin.id,
      expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    },
  });
  console.log('✅ Enrollment code created');

  const emailTemplates = [
    {
      slug: 'welcome',
      name: 'Welcome Email',
      subject: 'Welcome to YG Photoshop Academy!',
      htmlContent: '<h1>Welcome to YG Photoshop Academy!</h1><p>We are glad to have you on board, {{name}}.</p>',
      textContent: 'Welcome to YG Photoshop Academy, {{name}}!',
      variables: ['name'],
    },
    {
      slug: 'password-reset',
      name: 'Password Reset',
      subject: 'Reset Your Password',
      htmlContent: '<h1>Password Reset</h1><p>Click <a href="{{resetLink}}">here</a> to reset your password.</p>',
      textContent: 'Reset your password here: {{resetLink}}',
      variables: ['resetLink'],
    },
    {
      slug: 'email-verification',
      name: 'Email Verification',
      subject: 'Verify Your Email Address',
      htmlContent: '<h1>Email Verification</h1><p>Click <a href="{{verifyLink}}">here</a> to verify your email.</p>',
      textContent: 'Verify your email here: {{verifyLink}}',
      variables: ['verifyLink'],
    },
    {
      slug: 'enrollment-confirmation',
      name: 'Enrollment Confirmation',
      subject: 'You are enrolled!',
      htmlContent: '<h1>Enrollment Confirmation</h1><p>You have successfully enrolled in {{courseName}}.</p>',
      textContent: 'You have successfully enrolled in {{courseName}}.',
      variables: ['courseName'],
    },
  ];

  for (const template of emailTemplates) {
    await prisma.emailTemplate.upsert({
      where: { slug: template.slug },
      update: {},
      create: template,
    });
  }
  console.log('✅ Email templates created');

  console.log('\n🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
