import { PrismaClient } from '@prisma/client';
import fs from 'fs-extra';
import path from 'path';

const prisma = new PrismaClient();

async function seedUsers() {
  const users = await fs.readJSON(path.join(process.cwd(), 'data/users.json'));
  for (const user of users) {
    const exists = await prisma.user.findUnique({ where: { username: user.username } });
    if (!exists) {
      await prisma.user.create({ data: user });
      console.log(`✅ Created user: ${user.username}`);
    } else {
      console.log(`ℹ️ User ${user.username} already exists.`);
    }
  }
}

async function seedCourses() {
  const courses = await fs.readJSON(path.join(process.cwd(), 'data/courses.json'));
  for (const course of courses) {
    const exists = await prisma.course.findUnique({ where: { code: course.code } });
    if (!exists) {
      await prisma.course.create({ data: course });
      console.log(`✅ Created course: ${course.code}`);
    } else {
      console.log(`ℹ️ Course ${course.code} already exists.`);
    }
  }
}

async function seedRegistrations() {
  const student = await prisma.user.findUnique({ where: { username: 'student1' } });
  if (!student) return console.warn('⚠️ Student user not found, skipping registrations.');

  const course = await prisma.course.findUnique({ where: { code: 'CS101' } });
  if (!course) return console.warn('⚠️ Course CS101 not found, skipping registration.');

  const exists = await prisma.registration.findFirst({
    where: {
      userId: student.id,
      courseId: course.id,
    },
  });

  if (!exists) {
    await prisma.registration.create({
      data: {
        userId: student.id,
        courseId: course.id,
      },
    });
    console.log(`✅ Registered student1 in CS101`);
  } else {
    console.log(`ℹ️ student1 already registered in CS101`);
  }
}

async function main() {
  console.log('🌱 Starting seed...');
  await seedUsers();
  await seedCourses();
  await seedRegistrations();
  console.log('✅ Seeding complete!');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Error seeding:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
