import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  // Read JSON files
  const usersData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'users.json'), 'utf8'));
  const coursesData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'courses.json'), 'utf8'));

  console.log('Seeding users...');
  // Seed users
  for (const userData of usersData) {
    const { username, password, name, role } = userData;
    
    // Create base user
    const user = await prisma.user.create({
      data: {
        username,
        password,  // In production, this should be hashed
        name,
        role,
      },
    });
    
    // Update with role-specific data
    if (role === 'student') {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          studentId: userData.id,
        },
      });
      
      // Add completed courses if any
      if (userData.completedCourses && userData.completedCourses.length > 0) {
        for (const completedCourse of userData.completedCourses) {
          // Find course by code
          const course = await prisma.course.findUnique({
            where: { code: completedCourse.code },
          });
          
          if (course) {
            await prisma.completion.create({
              data: {
                userId: user.id,
                courseId: course.id,
                grade: completedCourse.grade,
              },
            });
          }
        }
      }
    } else if (role === 'instructor') {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          expertise: Array.isArray(userData.expertise) ? userData.expertise.join(',') : userData.expertise || '',
        },
      });
    }
  }
  
  console.log('Seeding courses...');
  // Seed courses
  for (const courseData of coursesData.courses) {
    const { code, name, category, description, prerequisites, status, classes } = courseData;
    
    // Create course
    const course = await prisma.course.create({
      data: {
        code,
        name,
        category,
        description,
        prerequisites: Array.isArray(prerequisites) ? prerequisites.join(',') : prerequisites || '',
        status,
      },
    });
    
    // Create classes for this course
    if (classes && classes.length > 0) {
      for (const classData of classes) {
        // Find instructor by name if provided
        let instructorId = null;
        
        if (classData.instructor) {
          const instructor = await prisma.user.findFirst({
            where: { 
              name: classData.instructor,
              role: 'instructor'
            },
          });
          
          if (instructor) {
            instructorId = instructor.id;
          }
        }
        
        // Create class
        const classObj = await prisma.class.create({
          data: {
            classId: classData.classId,
            schedule: classData.schedule,
            capacity: classData.capacity,
            courseId: course.id,
            instructorId,
          },
        });
        
        // Register students if any
        if (classData.registeredStudents && classData.registeredStudents.length > 0) {
          for (const studentId of classData.registeredStudents) {
            const student = await prisma.user.findFirst({
              where: { studentId },
            });
            
            if (student) {
              await prisma.class.update({
                where: { id: classObj.id },
                data: {
                  registeredStudents: {
                    connect: { id: student.id },
                  },
                },
              });
            }
          }
        }
      }
    }
    
    // Add interested instructors if any
    if (courseData.interestedInstructors && courseData.interestedInstructors.length > 0) {
      for (const instructorName of courseData.interestedInstructors) {
        const instructor = await prisma.user.findFirst({
          where: { 
            name: instructorName,
            role: 'instructor'
          },
        });
        
        if (instructor) {
          await prisma.courseInterest.create({
            data: {
              userId: instructor.id,
              courseId: course.id,
            },
          });
        }
      }
    }
  }

  // Generate additional data for statistics (500+ students, 50+ courses)
  await generateAdditionalData();
  
  console.log('Seeding completed!');
}

async function generateAdditionalData() {
  console.log('Generating additional data for statistics...');
  
  // Generate course categories
  const categories = [
    'Programming', 
    'Databases', 
    'Networks', 
    'Security', 
    'Artificial Intelligence', 
    'Machine Learning',
    'Web Development',
    'Mobile Development',
    'Cloud Computing',
    'Data Science'
  ];
  
  // Generate additional courses (ensure we have at least 50)
  const existingCoursesCount = await prisma.course.count();
  const coursesToCreate = Math.max(0, 50 - existingCoursesCount);
  
  for (let i = 0; i < coursesToCreate; i++) {
    const categoryIndex = Math.floor(Math.random() * categories.length);
    const courseCode = `CMPS${500 + i}`;
    const courseName = `${categories[categoryIndex]} ${i + 1}`;
    
    await prisma.course.create({
      data: {
        code: courseCode,
        name: courseName,
        category: categories[categoryIndex],
        description: `Description for ${courseName}`,
        prerequisites: 'CMPS151',
        status: ['open', 'draft', 'in-progress'][Math.floor(Math.random() * 3)],
      },
    });
  }
  
  // Generate additional students (ensure we have at least 500)
  const existingStudentsCount = await prisma.user.count({
    where: { role: 'student' }
  });
  const studentsToCreate = Math.max(0, 500 - existingStudentsCount);
  
  for (let i = 0; i < studentsToCreate; i++) {
    const studentId = `202${10000 + i}`;
    await prisma.user.create({
      data: {
        username: `student${i + existingStudentsCount}`,
        password: 'password123',
        name: `Student ${i + existingStudentsCount}`,
        role: 'student',
        studentId,
      },
    });
  }
  
  // Generate class registrations and completed courses for statistical data
  const allStudents = await prisma.user.findMany({
    where: { role: 'student' }
  });
  
  const allCourses = await prisma.course.findMany();
  const allClasses = await prisma.class.findMany();
  
  // Register students in classes (randomly)
  for (const student of allStudents) {
    const classesToRegister = Math.floor(Math.random() * 5) + 1; // 1-5 classes per student
    const selectedClasses = new Set();
    
    for (let i = 0; i < classesToRegister; i++) {
      const randomClass = allClasses[Math.floor(Math.random() * allClasses.length)];
      if (!selectedClasses.has(randomClass.id)) {
        selectedClasses.add(randomClass.id);
        
        try {
          await prisma.class.update({
            where: { id: randomClass.id },
            data: {
              registeredStudents: {
                connect: { id: student.id }
              }
            }
          });
        } catch (error) {
          // Skip if already registered
        }
      }
    }
  }
  
  // Add completed courses with grades
  const grades = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'];
  
  for (const student of allStudents) {
    const completedCoursesCount = Math.floor(Math.random() * 10); // 0-9 completed courses
    const completedCourses = new Set();
    
    for (let i = 0; i < completedCoursesCount; i++) {
      const randomCourse = allCourses[Math.floor(Math.random() * allCourses.length)];
      
      if (!completedCourses.has(randomCourse.id)) {
        completedCourses.add(randomCourse.id);
        const randomGrade = grades[Math.floor(Math.random() * grades.length)];
        
        try {
          await prisma.completion.create({
            data: {
              userId: student.id,
              courseId: randomCourse.id,
              grade: randomGrade
            }
          });
        } catch (error) {
          // Skip if already completed
        }
      }
    }
  }
  
  console.log('Additional data generation completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });