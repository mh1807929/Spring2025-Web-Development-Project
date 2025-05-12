'use server';

import { Repository } from '@/repository';
import { revalidatePath } from 'next/cache';

const repository = new Repository();

/**
 * Server action to get all courses
 */
export async function getAllCourses() {
  return repository.getAllCourses();
}

/**
 * Server action to get a course by code
 */
export async function getCourseByCode(code) {
  return repository.getCourseByCode(code);
}

/**
 * Server action to register a student for a class
 */
export async function registerForClass(formData) {
  const classId = formData.get('classId');
  const userId = formData.get('userId');
  
  try {
    await repository.registerStudentForClass(classId, userId);
    revalidatePath('/courses');
    revalidatePath(`/courses/${classId}`);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error registering for class:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Server action to unregister a student from a class
 */
export async function unregisterFromClass(formData) {
  const classId = formData.get('classId');
  const userId = formData.get('userId');
  
  try {
    await repository.unregisterStudentFromClass(classId, userId);
    revalidatePath('/courses');
    revalidatePath(`/courses/${classId}`);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error unregistering from class:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Server action to express interest in a course (for instructors)
 */
export async function expressInterestInCourse(formData) {
  const courseId = formData.get('courseId');
  const userId = formData.get('userId');
  
  try {
    await repository.expressInterestInCourse(userId, courseId);
    revalidatePath('/courses');
    revalidatePath(`/courses/${courseId}`);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error expressing interest in course:', error);
    return { success: false, error: error.message };
  }
}