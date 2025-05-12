import { Repository } from '@/repository';
import { NextResponse } from 'next/server';

const repository = new Repository();

/**
 * GET handler for retrieving all courses
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    
    let courses;
    
    if (category) {
      courses = await repository.getCoursesByCategory(category);
    } else if (status) {
      courses = await repository.getCoursesByStatus(status);
    } else {
      courses = await repository.getAllCourses();
    }
    
    return NextResponse.json({ courses }, { status: 200 });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}

/**
 * POST handler for creating a new course
 */
export async function POST(request) {
  try {
    const courseData = await request.json();
    
    // Validate course data
    if (!courseData.code || !courseData.name) {
      return NextResponse.json({ error: 'Course code and name are required' }, { status: 400 });
    }
    
    const course = await repository.createCourse(courseData);
    return NextResponse.json({ course }, { status: 201 });
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
}