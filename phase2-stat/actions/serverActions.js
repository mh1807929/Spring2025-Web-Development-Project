'use server'

import {
  getUserCountsByRole,
  getStudentCountPerCourse,
  getInstructorClassCount,
  getCourseCompletionRates,
  getMostCompletedCourses,
  getTotalActiveClasses,
  getCourseCountByStatus,
  getInstructorInterestPerCourse,
  getAveragePrerequisiteCount,
  getStudentsCompletedCoreCourses
} from '@/lib/analyticsRepository'; // Adjust the import path as needed

// 1. Total number of users by role
export async function fetchUserCountsByRole() {
  return await getUserCountsByRole();
}

// 2. Number of students registered per course
export async function fetchStudentCountPerCourse() {
  return await getStudentCountPerCourse();
}

// 3. Instructor teaching load
export async function fetchInstructorClassCount() {
  return await getInstructorClassCount();
}

// 4. Course completion rates
export async function fetchCourseCompletionRates() {
  return await getCourseCompletionRates();
}

// 5. Most completed courses
export async function fetchMostCompletedCourses(limit = 5) {
  return await getMostCompletedCourses(limit);
}

// 6. Total active classes
export async function fetchTotalActiveClasses() {
  return await getTotalActiveClasses();
}

// 7. Courses by status
export async function fetchCourseCountByStatus() {
  return await getCourseCountByStatus();
}

// 8. Instructor interest count per course
export async function fetchInstructorInterestPerCourse() {
  return await getInstructorInterestPerCourse();
}

// 9. Average number of prerequisites per course
export async function fetchAveragePrerequisiteCount() {
  return await getAveragePrerequisiteCount();
}

// 10. Students who completed all core courses
export async function fetchStudentsCompletedCoreCourses() {
  return await getStudentsCompletedCoreCourses();
}
