'use server'
import * as repo from '../../lib/repository.js';

export async function getTotalUsersByRole(role) {
  return await repo.countUsersByRole(role);
}

export async function getTotalCoursesByStatus(status) {
  return await repo.countCoursesByStatus(status);
}

export async function getTotalRegisteredStudentsInClass(classId) {
  return await repo.countStudentsInClass(classId);
}

export async function getTopCoursesByEnrollment(limit = 5) {
  return await repo.getTopCoursesByEnrollment(limit);
}

export async function getCourseCompletionStats(courseCode) {
  return await repo.getCourseCompletionStats(courseCode);
}

export async function getInstructorCourseLoad(username) {
  return await repo.getInstructorCourseLoad(username);
}

export async function getStudentCompletedCourses(studentId) {
  return await repo.getStudentCompletedCourses(studentId);
}

export async function getCourseInterestStats(courseCode) {
  return await repo.getCourseInterestStats(courseCode);
}

export async function getWeeklyRegistrationTrends() {
  return await repo.getWeeklyRegistrationTrends();
}

export async function getAverageClassOccupancy() {
  return await repo.getAverageClassOccupancy();
}
