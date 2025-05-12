import { Repository } from '@/lib/repository';
import { NextResponse } from 'next/server';

const repository = new Repository();

/**
 * GET handler for retrieving a specific class by ID
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const classData = await repository.getClassByClassId(id);
    
    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }
    
    return NextResponse.json({ class: classData }, { status: 200 });
  } catch (error) {
    console.error(`Error fetching class ${params.id}:`, error);
    return NextResponse.json({ error: 'Failed to fetch class' }, { status: 500 });
  }
}

/**
 * POST handler for registering a student for a class
 */
export async function POST(request, { params }) {
  try {
    const { id } = params;
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Find class by classId first
    const classData = await repository.getClassByClassId(id);
    
    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }
    
    // Register student using the class ID
    const updatedClass = await repository.registerStudentForClass(classData.id, userId);
    return NextResponse.json({ class: updatedClass }, { status: 200 });
  } catch (error) {
    console.error(`Error registering for class ${params.id}:`, error);
    return NextResponse.json({ error: 'Failed to register for class' }, { status: 500 });
  }
}

/**
 * DELETE handler for unregistering a student from a class
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Find class by classId first
    const classData = await repository.getClassByClassId(id);
    
    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }
    
    // Unregister student using the class ID
    const updatedClass = await repository.unregisterStudentFromClass(classData.id, userId);
    return NextResponse.json({ class: updatedClass }, { status: 200 });
  } catch (error) {
    console.error(`Error unregistering from class ${params.id}:`, error);
    return NextResponse.json({ error: 'Failed to unregister from class' }, { status: 500 });
  }
}