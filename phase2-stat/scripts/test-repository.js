import { Repository } from '../lib/repository.js';

const repository = new Repository();

async function testRepository() {
  console.log('\n--- Testing Repository Functions ---\n');

  try {
    // Test retrieving all courses
    console.log('Testing getAllCourses():');
    const courses = await repository.getAllCourses();
    console.log(`✅ Retrieved ${courses.length} courses`);

    // Test retrieving a course by code
    console.log('\nTesting getCourseByCode():');
    const course = await repository.getCourseByCode('CMPS350');
    if (course) {
      console.log(`✅ Retrieved course: ${course.name}`);
    } else {
      console.log('❌ Failed to retrieve course');
    }

    // Test retrieving courses by category
    console.log('\nTesting getCoursesByCategory():');
    const programmingCourses = await repository.getCoursesByCategory('Programming');
    console.log(`✅ Retrieved ${programmingCourses.length} programming courses`);

    // Test retrieving all students
    console.log('\nTesting getAllStudents():');
    const students = await repository.getAllStudents();
    console.log(`✅ Retrieved ${students.length} students`);

    // Test retrieving student by ID
    if (students.length > 0) {
      console.log('\nTesting getStudentById():');
      const studentId = students[0].studentId;
      const student = await repository.getStudentById(studentId);
      if (student) {
        console.log(`✅ Retrieved student: ${student.name}`);
      } else {
        console.log('❌ Failed to retrieve student');
      }
    }

    // Test retrieving all instructors
    console.log('\nTesting getAllInstructors():');
    const instructors = await repository.getAllInstructors();
    console.log(`✅ Retrieved ${instructors.length} instructors`);

    console.log('\nRepository tests completed successfully!');
  } catch (error) {
    console.error('❌ Error during repository tests:', error);
  } finally {
    process.exit(0);
  }
}

testRepository();