import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

// Import your server actions
import {
  fetchUserCountsByRole,
  fetchStudentCountPerCourse,
  fetchInstructorClassCount,
  fetchCourseCompletionRates,
  fetchMostCompletedCourses,
  fetchTotalActiveClasses,
  fetchCourseCountByStatus,
  fetchInstructorInterestPerCourse,
  fetchAveragePrerequisiteCount,
  fetchStudentsCompletedCoreCourses
} from '../actions/serverActions';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/signin");
  }

  // Fetch all dashboard data
  const [
    userCountsByRole,
    studentCountPerCourse,
    instructorClassCount,
    courseCompletionRates,
    mostCompletedCourses,
    totalActiveClasses,
    courseCountByStatus,
    instructorInterestPerCourse,
    averagePrereqCount,
    studentsCompletedCore
  ] = await Promise.all([
    fetchUserCountsByRole(),
    fetchStudentCountPerCourse(),
    fetchInstructorClassCount(),
    fetchCourseCompletionRates(),
    fetchMostCompletedCourses(),
    fetchTotalActiveClasses(),
    fetchCourseCountByStatus(),
    fetchInstructorInterestPerCourse(),
    fetchAveragePrerequisiteCount(),
    fetchStudentsCompletedCoreCourses()
  ]);

  return (
    <main className="dashboard">
      <h1 className="text-2xl font-bold">Dashboard Statistics</h1>

      <section>
        <h2 className="text-xl font-semibold">1. User Counts by Role</h2>
        <ul>
          {userCountsByRole.map((item, idx) => (
            <li key={idx}>{item.role}: {item._count}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">2. Students Registered per Course</h2>
        <ul>
          {studentCountPerCourse.map((course, idx) => {
            const studentCount = course.classes.reduce((sum, c) => sum + c.registeredStudents.length, 0);
            return <li key={idx}>{course.code} - {course.name}: {studentCount} students</li>;
          })}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">3. Instructor Class Counts</h2>
        <ul>
          {instructorClassCount.map((instructor, idx) => (
            <li key={idx}>{instructor.name} ({instructor.username}): {instructor._count.assignedClasses} classes</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">4. Course Completion Rates</h2>
        <ul>
          {courseCompletionRates.map((course, idx) => (
            <li key={idx}>
              {course.code} - {course.name}: {course.completed}/{course.registered} completed
              ({(course.completionRate * 100).toFixed(1)}%)
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">5. Most Completed Courses</h2>
        <ul>
          {mostCompletedCourses.map((course, idx) => (
            <li key={idx}>{course.code} - {course.name}: {course._count.completions} completions</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">6. Total Active Classes</h2>
        <p>{totalActiveClasses}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">7. Course Count by Status</h2>
        <ul>
          {courseCountByStatus.map((status, idx) => (
            <li key={idx}>{status.status}: {status._count}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">8. Instructor Interest per Course</h2>
        <ul>
          {instructorInterestPerCourse.map((course, idx) => (
            <li key={idx}>{course.code} - {course.name}: {course._count.interests} instructors interested</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">9. Average Prerequisite Count</h2>
        <p>{averagePrereqCount}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">10. Students Completed All Core Courses</h2>
        <ul>
          {studentsCompletedCore.map((student, idx) => (
            <li key={idx}>{student.name} ({student.username})</li>
          ))}
        </ul>
      </section>
    </main>
  );
}