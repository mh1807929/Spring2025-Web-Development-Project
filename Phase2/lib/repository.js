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

  // Statistics related methods
  async getTotalStudentsPerYear() {
    const students = await prisma.user.findMany({
      where: { role: 'student' },
      select: { studentId: true }
    });
    
    // Extract year from studentId and count
    const yearCounts = {};
    students.forEach(student => {
      if (student.studentId) {
        const year = student.studentId.substring(0, 4);
        yearCounts[year] = (yearCounts[year] || 0) + 1;
      }
    });
    
    return Object.entries(yearCounts).map(([year, count]) => ({
      year,
      count
    }));
  }

  async getStudentsPerCourseCategory() {
    return prisma.class.findMany({
      include: {
        course: true,
        registeredStudents: true
      }
    }).then(classes => {
      const categoryCounts = {};
      
      classes.forEach(cls => {
        const category = cls.course.category;
        const studentCount = cls.registeredStudents.length;
        
        categoryCounts[category] = (categoryCounts[category] || 0) + studentCount;
      });
      
      return Object.entries(categoryCounts).map(([category, count]) => ({
        category,
        count
      }));
    });
  }

  async getStudentsPerCourse() {
    return prisma.course.findMany({
      include: {
        classes: {
          include: {
            registeredStudents: true
          }
        }
      }
    }).then(courses => {
      return courses.map(course => {
        let totalStudents = 0;
        course.classes.forEach(cls => {
          totalStudents += cls.registeredStudents.length;
        });
        
        return {
          courseCode: course.code,
          courseName: course.name,
          studentCount: totalStudents
        };
      });
    });
  }

  async getTopCoursesByEnrollment(limit = 3) {
    const coursesWithStudents = await this.getStudentsPerCourse();
    
    // Sort by student count in descending order and take the top 'limit'
    return coursesWithStudents
      .sort((a, b) => b.studentCount - a.studentCount)
      .slice(0, limit);
  }

  async getFailureRatePerCourse() {
    return prisma.completion.findMany({
      include: {
        course: true
      }
    }).then(completions => {
      const courseStats = {};
      
      completions.forEach(completion => {
        const courseId = completion.courseId;
        const isFailing = completion.grade === 'F';
        
        if (!courseStats[courseId]) {
          courseStats[courseId] = {
            courseCode: completion.course.code,
            courseName: completion.course.name,
            totalCompletions: 0,
            failingCompletions: 0
          };
        }
        
        courseStats[courseId].totalCompletions++;
        if (isFailing) {
          courseStats[courseId].failingCompletions++;
        }
      });
      
      return Object.values(courseStats).map(stats => ({
        ...stats,
        failureRate: stats.totalCompletions > 0
          ? (stats.failingCompletions / stats.totalCompletions) * 100
          : 0
      }));
    });
  }

  async getFailureRatePerCategory() {
    return prisma.$queryRaw`
      SELECT c.category, 
             COUNT(comp.id) as totalCompletions,
             SUM(CASE WHEN comp.grade = 'F' THEN 1 ELSE 0 END) as failingCompletions,
             (SUM(CASE WHEN comp.grade = 'F' THEN 1 ELSE 0 END) * 100.0 / COUNT(comp.id)) as failureRate
      FROM Course c
      JOIN Completion comp ON c.id = comp.courseId
      GROUP BY c.category
    `;
  }

  async getAverageGpaPerCourse() {
    // Convert letter grades to GPA points
    function gradeToGpa(grade) {
      const gradeMap = {
        'A': 4.0, 'A-': 3.7,
        'B+': 3.3, 'B': 3.0, 'B-': 2.7,
        'C+': 2.3, 'C': 2.0, 'C-': 1.7,
        'D+': 1.3, 'D': 1.0, 'F': 0.0
      };
      return gradeMap[grade] || 0;
    }

    return prisma.completion.findMany({
      include: {
        course: true
      }
    }).then(completions => {
      const courseGpas = {};
      
      completions.forEach(completion => {
        const courseId = completion.courseId;
        const gpaValue = gradeToGpa(completion.grade);
        
        if (!courseGpas[courseId]) {
          courseGpas[courseId] = {
            courseCode: completion.course.code,
            courseName: completion.course.name,
            totalGpa: 0,
            count: 0
          };
        }
        
        courseGpas[courseId].totalGpa += gpaValue;
        courseGpas[courseId].count++;
      });
      
      return Object.values(courseGpas).map(stats => ({
        ...stats,
        averageGpa: stats.count > 0
          ? (stats.totalGpa / stats.count).toFixed(2)
          : 0
      }));
    });
  }

  async getCoursesWithMostInstructorInterest() {
    return prisma.courseInterest.groupBy({
      by: ['courseId'],
      _count: {
        userId: true
      }
    }).then(async results => {
      // Get course details for each courseId
      const courseDetails = await Promise.all(
        results.map(async result => {
          const course = await prisma.course.findUnique({
            where: { id: result.courseId }
          });
          return {
            courseCode: course.code,
            courseName: course.name,
            interestCount: result._count.userId
          };
        })
      );
      
      // Sort by interest count in descending order
      return courseDetails.sort((a, b) => b.interestCount - a.interestCount);
    });
  }

  async getInstructorWorkload() {
    return prisma.user.findMany({
      where: { role: 'instructor' },
      include: {
        assignedClasses: true
      }
    }).then(instructors => {
      return instructors.map(instructor => ({
        instructorName: instructor.name,
        classCount: instructor.assignedClasses.length
      }));
    });
  }

  async getClassSizeDistribution() {
    return prisma.class.findMany({
      include: {
        registeredStudents: true
      }
    }).then(classes => {
      const sizeRanges = {
        'Empty (0)': 0,
        'Small (1-10)': 0,
        'Medium (11-20)': 0,
        'Large (21-30)': 0,
        'Very Large (30+)': 0
      };
      
      classes.forEach(cls => {
        const size = cls.registeredStudents.length;
        
        if (size === 0) sizeRanges['Empty (0)']++;
        else if (size <= 10) sizeRanges['Small (1-10)']++;
        else if (size <= 20) sizeRanges['Medium (11-20)']++;
        else if (size <= 30) sizeRanges['Large (21-30)']++;
        else sizeRanges['Very Large (30+)']++;
      });
      
      return Object.entries(sizeRanges).map(([range, count]) => ({
        range,
        count
      }));
    });
  }

  async getPrerequisiteChainLength() {
    const courses = await prisma.course.findMany();
    const prereqMap = {};
    
    // Build prerequisite map
    courses.forEach(course => {
      const prerequisites = course.prerequisites.split(',').map(p => p.trim()).filter(p => p && p !== 'no prerequisites');
      prereqMap[course.code] = prerequisites;
    });
    
    // Calculate chain length for each course
    const chainLengths = {};
    courses.forEach(course => {
      chainLengths[course.code] = calculateChainLength(course.code, prereqMap, {});
    });
    
    return Object.entries(chainLengths).map(([courseCode, chainLength]) => {
      const course = courses.find(c => c.code === courseCode);
      return {
        courseCode,
        courseName: course?.name || '',
        prerequisiteChainLength: chainLength
      };
    }).sort((a, b) => b.prerequisiteChainLength - a.prerequisiteChainLength);
  }
}

// Helper function for calculating prerequisite chain length
function calculateChainLength(courseCode, prereqMap, visited) {
  if (visited[courseCode]) return 0; // Avoid cycles
  visited[courseCode] = true;
  
  const prerequisites = prereqMap[courseCode] || [];
  if (prerequisites.length === 0) return 0;
  
  let maxLength = 0;
  prerequisites.forEach(prereq => {
    const length = 1 + calculateChainLength(prereq, prereqMap, { ...visited });
    maxLength = Math.max(maxLength, length);
  });
  
  return maxLength;
}

// Create a singleton instance
const repository = new Repository();
export default repository;