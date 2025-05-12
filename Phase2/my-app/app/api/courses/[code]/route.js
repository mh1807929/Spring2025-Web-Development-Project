import { Repository } from '@/repository';
import { NextResponse } from 'next/server';

const repository = new Repository();

/**
 * GET handler for retrieving a specific course by code
 */
export async function GET(request, { params }) {
  try {
    const { code } = params;
    const course = await repository.getCourseByCode(code);
    
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    
    return NextResponse.json({ course }, { status: 200 });
  } catch (error) {
    console.error(`Error fetching course ${params.code}:`, error);
    return NextResponse.json({ error: 'Failed to fetch course' }, { status: 500 });
  }
}

/**
 * PUT handler for updating a course
 */
export async function PUT(request, { params }) {
  try {
    const { code } = params;
    const courseData = await request.json();
    
    // Find course by code first
    const existingCourse = await repository.getCourseByCode(code);
    
    if (!existingCourse) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    
    // Update course using its ID
    const updatedCourse = await repository.updateCourse(existingCourse.id, courseData);
    return NextResponse.json({ course: updatedCourse }, { status: 200 });
  } catch (error) {
    console.error(`Error updating course ${params.code}:`, error);
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 });
  }
}

/**
 * DELETE handler for removing a course
 */
export async function DELETE(request, { params }) {
  try {
    const { code } = params;
    
    // Find course by code first
    const existingCourse = await repository.getCourseByCode(code);
    
    if (!existingCourse) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    
    // Delete course using its ID
    await repository.deleteCourse(existingCourse.id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(`Error deleting course ${params.code}:`, error);
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
  }
}