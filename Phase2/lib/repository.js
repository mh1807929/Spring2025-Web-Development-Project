
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 1. Total number of users by role
export async function getUserCountsByRole() {
  return prisma.user.groupBy({
    by: ['role'],
    _count: true,
  });
}

// 2. Number of students registered per course
export async function getStudentCountPerCourse() {
  return prisma.course.findMany({
    select: {
      code: true,
      name: true,
      classes: {
        select: {
          registeredStudents: {
            select: { id: true }
          }
        }
      }
    }
  });
}

// 3. Instructor teaching load
export async function getInstructorClassCount() {
  return prisma.user.findMany({
    where: { role: 'instructor' },
    select: {
      username: true,
      name: true,
      _count: {
        select: { assignedClasses: true }
      }
    }
  });
}

// 4. Course completion rates
export async function getCourseCompletionRates() {
  const courses = await prisma.course.findMany({
    include: {
      completions: true,
      classes: {
        select: {
          registeredStudents: true
        }
      }
    }
  });

  return courses.map(course => {
    const registered = course.classes.reduce((sum, cls) => sum + cls.registeredStudents.length, 0);
    return {
      code: course.code,
      name: course.name,
      completed: course.completions.length,
      registered,
      completionRate: registered ? (course.completions.length / registered) : 0
    };
  });
}

// 5. Most completed courses
export async function getMostCompletedCourses(limit = 5) {
  return prisma.course.findMany({
    orderBy: {
      completions: {
        _count: 'desc'
      }
    },
    take: limit,
    select: {
      code: true,
      name: true,
      _count: {
        select: { completions: true }
      }
    }
  });
}

// 6. Total active classes
export async function getTotalActiveClasses() {
  return prisma.class.count();
}

// 7. Courses by status
export async function getCourseCountByStatus() {
  return prisma.course.groupBy({
    by: ['status'],
    _count: true
  });
}

// 8. Instructor interest count per course
export async function getInstructorInterestPerCourse() {
  return prisma.course.findMany({
    select: {
      code: true,
      name: true,
      _count: {
        select: { interests: true }
      }
    }
  });
}

// 9. Average number of prerequisites per course
export async function getAveragePrerequisiteCount() {
  const courses = await prisma.course.findMany();
  const total = courses.reduce((sum, course) => {
    const count = course.prerequisites ? course.prerequisites.split(',').length : 0;
    return sum + count;
  }, 0);
  return courses.length ? (total / courses.length).toFixed(2) : 0;
}

// 10. Students who completed all core courses
const coreCourses = ['CMPS151', 'CMPS251', 'CMPS350'];
export async function getStudentsCompletedCoreCourses() {
  const students = await prisma.user.findMany({
    where: { role: 'student' },
    include: {
      completedCourses: {
        include: { course: true }
      }
    }
  });

  return students.filter(student => {
    const completedCodes = student.completedCourses.map(c => c.course.code);
    return coreCourses.every(code => completedCodes.includes(code));
  }).map(s => ({ id: s.id, name: s.name, username: s.username }));
}
