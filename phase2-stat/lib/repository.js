import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export class Repository {
  // User related methods
  async getUserByUsername(username) {
    return prisma.user.findUnique({
      where: { username },
      include: {
        completedCourses: {
          include: {
            course: true
          }
        }
      }
    });
  }

  async getUserById(id) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        completedCourses: {
          include: {
            course: true
          }
        }
      }
    });
  }

  async getStudentById(studentId) {
    return prisma.user.findUnique({
      where: { studentId },
      include: {
        completedCourses: {
          include: {
            course: true
          }
        },
        registeredClasses: {
          include: {
            course: true
          }
        }
      }
    });
  }

  async getAllStudents() {
    return prisma.user.findMany({
      where: { role: 'student' },
      include: {
        completedCourses: {
          include: {
            course: true
          }
        },
        registeredClasses: {
          include: {
            course: true
          }
        }
      }
    });
  }

  async getAllInstructors() {
    return prisma.user.findMany({
      where: { role: 'instructor' },
      include: {
        assignedClasses: {
          include: {
            course: true
          }
        },
        interests: {
          include: {
            course: true
          }
        }
      }
    });
  }

  // Course related methods
  async getAllCourses() {
    return prisma.course.findMany({
      include: {
        classes: {
          include: {
            instructor: true,
            registeredStudents: true
          }
        }
      }
    });
  }

  async getCourseByCode(code) {
    return prisma.course.findUnique({
      where: { code },
      include: {
        classes: {
          include: {
            instructor: true,
            registeredStudents: true
          }
        }
      }
    });
  }

  async getCourseById(id) {
    return prisma.course.findUnique({
      where: { id },
      include: {
        classes: {
          include: {
            instructor: true,
            registeredStudents: true
          }
        }
      }
    });
  }

  async getCoursesByCategory(category) {
    return prisma.course.findMany({
      where: { category },
      include: {
        classes: {
          include: {
            instructor: true,
            registeredStudents: true
          }
        }
      }
    });
  }

  async getCoursesByStatus(status) {
    return prisma.course.findMany({
      where: { status },
      include: {
        classes: {
          include: {
            instructor: true,
            registeredStudents: true
          }
        }
      }
    });
  }

  async createCourse(courseData) {
    const { classes, ...courseInfo } = courseData;
    
    return prisma.course.create({
      data: {
        ...courseInfo,
        classes: {
          create: classes.map(classData => {
            const { registeredStudents, instructor, ...classInfo } = classData;
            return classInfo;
          })
        }
      },
      include: {
        classes: true
      }
    });
  }

  async updateCourse(id, courseData) {
    const { classes, ...courseInfo } = courseData;
    
    return prisma.course.update({
      where: { id },
      data: courseInfo,
      include: {
        classes: true
      }
    });
  }

  async deleteCourse(id) {
    return prisma.course.delete({
      where: { id }
    });
  }

  // Class related methods
  async getClassById(id) {
    return prisma.class.findUnique({
      where: { id },
      include: {
        course: true,
        instructor: true,
        registeredStudents: true
      }
    });
  }

  async getClassByClassId(classId) {
    return prisma.class.findUnique({
      where: { classId },
      include: {
        course: true,
        instructor: true,
        registeredStudents: true
      }
    });
  }

  async registerStudentForClass(classId, userId) {
    return prisma.class.update({
      where: { id: classId },
      data: {
        registeredStudents: {
          connect: { id: userId }
        }
      }
    });
  }

  async unregisterStudentFromClass(classId, userId) {
    return prisma.class.update({
      where: { id: classId },
      data: {
        registeredStudents: {
          disconnect: { id: userId }
        }
      }
    });
  }

  async assignInstructorToClass(classId, instructorId) {
    return prisma.class.update({
      where: { id: classId },
      data: {
        instructorId
      }
    });
  }

  // Course interest methods
  async expressInterestInCourse(userId, courseId) {
    return prisma.courseInterest.create({
      data: {
        userId,
        courseId
      }
    });
  }

  async removeInterestInCourse(userId, courseId) {
    return prisma.courseInterest.deleteMany({
      where: {
        userId,
        courseId
      }
    });
  }

  async getInstructorInterests(instructorId) {
    return prisma.courseInterest.findMany({
      where: {
        userId: instructorId
      },
      include: {
        course: true
      }
    });
  }

  async getCourseInterests(courseId) {
    return prisma.courseInterest.findMany({
      where: {
        courseId
      },
      include: {
        user: true
      }
    });
  }

  // Completion related methods
  async addCompletedCourse(userId, courseId, grade) {
    return prisma.completion.create({
      data: {
        userId,
        courseId,
        grade
      }
    });
  }

  async updateCompletedCourseGrade(userId, courseId, grade) {
    return prisma.completion.update({
      where: {
        userId_courseId: {
          userId,
          courseId
        }
      },
      data: {
        grade
      }
    });
  }
}

