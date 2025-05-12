import { PrismaClient } from '@prisma/client';
import fs from 'fs-extra';
import path from 'path';

const prisma = new PrismaClient();

async function seedUsers(usersData) {
  console.log(' Seeding users...');
  for (const user of usersData.users) {
    const existing = await prisma.user.findUnique({ where: { username: user.username } });
    if (existing) {
      console.log(` User ${user.username} already exists.`);
      continue;
    }

    const createdUser = await prisma.user.create({
      data: {
        username: user.username,
        password: user.password,
        name: user.name,
        role: user.role,
      },
    });

    if (user.role === 'student') {
      await prisma.user.update({
        where: { id: createdUser.id },
        data: {
          studentId: user.id,
        },
      });

      if (Array.isArray(user.completedCourses)) {
        for (const course of user.completedCourses) {
          const courseObj = await prisma.course.findUnique({ where: { code: course.code } });
          if (courseObj) {
            await prisma.completion.create({
              data: {
                userId: createdUser.id,
                courseId: courseObj.id,
                grade: course.grade,
              },
            });
          }
        }
      }
    }

    if (user.role === 'instructor' && user.expertise) {
      await prisma.user.update({
        where: { id: createdUser.id },
        data: {
          expertise: Array.isArray(user.expertise) ? user.expertise.join(',') : user.expertise,
        },
      });
    }

    console.log(` Created user: ${user.username}`);
  }
}

async function seedCourses(coursesData) {
  console.log(' Seeding courses...');
  for (const course of coursesData.courses) {
    const existing = await prisma.course.findUnique({ where: { code: course.code } });
    if (existing) {
      console.log(` Course ${course.code} already exists.`);
      continue;
    }

    const createdCourse = await prisma.course.create({
      data: {
        code: course.code,
        name: course.name,
        category: course.category,
        description: course.description,
        prerequisites: Array.isArray(course.prerequisites) ? course.prerequisites.join(',') : course.prerequisites,
        status: course.status,
      },
    });

    if (Array.isArray(course.classes)) {
      for (const classData of course.classes) {
        let instructorId = null;
        if (classData.instructor) {
          const instructor = await prisma.user.findFirst({
            where: { name: classData.instructor, role: 'instructor' },
          });
          if (instructor) instructorId = instructor.id;
        }

        const createdClass = await prisma.class.create({
          data: {
            classId: classData.classId,
            schedule: classData.schedule,
            capacity: classData.capacity,
            courseId: createdCourse.id,
            instructorId,
          },
        });

        if (Array.isArray(classData.registeredStudents)) {
          for (const studentId of classData.registeredStudents) {
            const student = await prisma.user.findFirst({ where: { studentId } });
            if (student) {
              await prisma.class.update({
                where: { id: createdClass.id },
                data: {
                  registeredStudents: { connect: { id: student.id } },
                },
              });
            }
          }
        }
      }
    }

    if (Array.isArray(course.interestedInstructors)) {
      for (const instructorName of course.interestedInstructors) {
        const instructor = await prisma.user.findFirst({
          where: { name: instructorName, role: 'instructor' },
        });
        if (instructor) {
          await prisma.courseInterest.create({
            data: {
              userId: instructor.id,
              courseId: createdCourse.id,
            },
          });
        }
      }
    }

    console.log(` Created course: ${course.code}`);
  }
}

async function seedRegistrations() {
  const student = await prisma.user.findUnique({ where: { username: 'student1' } });
  const course = await prisma.course.findUnique({ where: { code: 'CS101' } });

  if (!student || !course) {
    console.warn(' Missing required student or course for default registration.');
    return;
  }

  const alreadyRegistered = await prisma.registration.findFirst({
    where: { userId: student.id, courseId: course.id },
  });

  if (!alreadyRegistered) {
    await prisma.registration.create({
      data: { userId: student.id, courseId: course.id },
    });
    console.log(` Registered ${student.username} in ${course.code}`);
  } else {
    console.log(`${student.username} already registered in ${course.code}`);
  }
}

async function main() {
  console.log(' Reading data...');
  const usersData = await fs.readJSON(path.join(process.cwd(), 'data/users.json'));
  const coursesData = await fs.readJSON(path.join(process.cwd(), 'data/courses.json'));

  console.log('Starting seed process...');
  await seedUsers(usersData);
  await seedCourses(coursesData);
  await seedRegistrations();

  console.log('Seeding complete!');
}

main()
  .catch(async (e) => {
    console.error(' Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
