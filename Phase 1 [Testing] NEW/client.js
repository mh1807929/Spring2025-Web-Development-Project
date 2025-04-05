// DOM Elements
const loginScreen = document.getElementById('login-screen');
const appMain = document.getElementById('app-main');
const loginForm = document.getElementById('login-form');
const loginMessage = document.getElementById('login-message');
const welcomeMessage = document.getElementById('welcome-message');
const logoutBtn = document.getElementById('logout-btn');
const courseSearch = document.getElementById('course-search');
const searchBtn = document.getElementById('search-btn');
const filterBtns = document.querySelectorAll('.filter-btn');
const coursesGrid = document.getElementById('courses-grid');

// App State
let currentUser = null;
let allCourses = [];

// Initialize the app
document.addEventListener('DOMContentLoaded', async () => {
    console.log('App initialized');
    await loadData();
    setupEventListeners();
});

// Load data from JSON files
async function loadData() {
    try {
        console.log('Loading data...');
        const [usersResponse, coursesResponse] = await Promise.all([
            fetch('./data/users.json'),
            fetch('./data/courses.json')
        ]);
        
      
        
        const usersData = await usersResponse.json();
        const coursesData = await coursesResponse.json();
        
        localStorage.setItem('users', JSON.stringify(usersData.users));
        allCourses = coursesData.courses || coursesData;
        
        console.log('Data loaded successfully');
        return true;
    } catch (error) {
        console.error('Error loading data:', error);
        showMessage('Error loading application data. Please try again later.', 'error');
        return false;
    }
}

// Set up event listeners
function setupEventListeners() {
    // Login form
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleLogin();
    });
    
    // Logout button
    logoutBtn.addEventListener('click', handleLogout);
    
    // Search functionality
    searchBtn.addEventListener('click', applyFilters);
    courseSearch.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') applyFilters();
    });
    
    // Filter buttons
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            filterBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            applyFilters();
        });
    });
}

// Handle login
async function handleLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!username || !password) {
        showMessage('Please enter both username and password', 'error');
        return;
    }
    
    try {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            currentUser = user;
            loginForm.reset();
            loginScreen.style.display = 'none';
            appMain.style.display = 'block';
            welcomeMessage.textContent = `Welcome, ${user.name}`;
            applyFilters();
            //displays learning path
            displayLearningPath(); 
            setupLearningPathTabs(); 
        } else {
            showMessage('Invalid username or password', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('An error occurred during login', 'error');
    }
}

// Handle logout
function handleLogout() {
    currentUser = null;
    loginScreen.style.display = 'flex';
    appMain.style.display = 'none';
    showMessage('You have been logged out successfully', 'success');
}

// Apply filters and search
function applyFilters() {
    if (!currentUser) return;
    
    const searchTerm = courseSearch.value.toLowerCase().trim();
    const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
    
    let filteredCourses = allCourses.filter(course => {
        // Apply search filter
        const matchesSearch = searchTerm === '' || 
            course.name.toLowerCase().includes(searchTerm) ||
            course.code.toLowerCase().includes(searchTerm) ||
            course.category.toLowerCase().includes(searchTerm);
        
        // Apply category filter
        const matchesCategory = activeFilter === 'all' || 
            course.category.toLowerCase() === activeFilter;
        
        return matchesSearch && matchesCategory;
    });
    
    // For instructors, only show their courses
    if (currentUser.role === 'instructor') {
        filteredCourses = filteredCourses.filter(course => 
            course.classes.some(cls => cls.instructor === currentUser.name)
        );
    }
    
    displayCourses(filteredCourses);
}

// Display courses for the current user
async function displayUserCourses() {
    if (!currentUser) return;
    applyFilters(); // This will handle the initial display with default filters
}

// Display courses in the grid
function displayCourses(courses) {
    coursesGrid.innerHTML = '';
    
    if (!courses || courses.length === 0) {
        coursesGrid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>No courses found matching your criteria</p>
            </div>
        `;
        return;
    }
    
    courses.forEach(course => {
        const courseCard = document.createElement('div');
        courseCard.className = 'course-card';
        
        courseCard.innerHTML = `
            <div class="course-header">
                <h4>${course.name}</h4>
                <span class="course-code">${course.code}</span>
            </div>
            <div class="course-body">
                <div class="course-meta">
                    <span class="course-category">${course.category}</span>
                    <span class="course-status">${course.status.toUpperCase()}</span>
                </div>
                <p class="course-description">${course.description}</p>
                <div class="course-prereqs">
                    <span>Prerequisites:</span> ${course.prerequisites?.join(', ') || 'None'}
                </div>
                
                ${(course.classes || []).map(cls => `
                    <div class="class-info">
                        <p><strong>Class:</strong> ${cls.classId}</p>
                        <p><strong>Instructor:</strong> ${cls.instructor}</p>
                        <p><strong>Schedule:</strong> ${cls.schedule}</p>
                        <p><strong>Availability:</strong> ${cls.capacity - (cls.registeredStudents?.length || 0)}/${cls.capacity}</p>
                    </div>
                `).join('')}
            </div>
        `;
        
        coursesGrid.appendChild(courseCard);
    });
}



// Handle course registration
async function handleRegistration(e) {
    const courseCode = e.target.dataset.course;
    const classId = e.target.dataset.class;
    
    // Find the selected course and class
    const course = allCourses.find(c => c.code === courseCode);
    const cls = course.classes.find(c => c.classId === classId);
    
    // Check prerequisites
    const hasPrerequisites = checkPrerequisites(currentUser, course);
    
    // Target the registration message container
    const registrationMessage = document.getElementById('registration-message');
    
    if (!hasPrerequisites) {
        // Display message if prerequisites are not met
        showMessage(`You must complete all prerequisites for ${course.name}`, 'error', registrationMessage);
        return;
    }
    
    // Check if class is full
    if (cls.registeredStudents.length >= cls.capacity) {
        showMessage(`Class ${classId} is full`, 'error', registrationMessage);
        return;
    }
    
    // Check if already registered
    if (cls.registeredStudents.includes(currentUser.id)) {
        showMessage(`You're already registered for this class`, 'error', registrationMessage);
        return;
    }
    
    try {
        cls.registeredStudents.push(currentUser.id);
        
        // Update UI
        e.target.disabled = true;
        e.target.textContent = 'Pending Approval';
        showMessage(`Registration request submitted for ${course.name}`, 'success', registrationMessage);
        
        console.log(`User ${currentUser.id} registered for ${courseCode}, class ${classId}`);
        
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('Registration failed. Please try again.', 'error', registrationMessage);
    }
}

// Check if student meets prerequisites
function checkPrerequisites(student, course) {
    if (!course.prerequisites || course.prerequisites.length === 0) {
        return true;
    }
    
    const completedCodes = student.completedCourses?.map(c => c.code) || [];
    return course.prerequisites.every(preReq => completedCodes.includes(preReq));
}

// Modify your displayCourses function to add registration buttons:
function displayCourses(courses) {
    coursesGrid.innerHTML = '';
    
    if (!courses || courses.length === 0) {
        coursesGrid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>No courses found matching your criteria</p>
            </div>
        `;
        return;
    }
    
    courses.forEach(course => {
        const courseCard = document.createElement('div');
        courseCard.className = 'course-card';
        
        courseCard.innerHTML = `
            <div class="course-header">
                <h4>${course.name}</h4>
                <span class="course-code">${course.code}</span>
            </div>
            <div class="course-body">
                <div class="course-meta">
                    <span class="course-category">${course.category}</span>
                    <span class="course-status">${course.status.toUpperCase()}</span>
                </div>
                <p class="course-description">${course.description}</p>
                <div class="course-prereqs">
                    <span>Prerequisites:</span> ${course.prerequisites?.join(', ') || 'None'}
                </div>
                
                ${(course.classes || []).map(cls => {
                    const isRegistered = cls.registeredStudents?.includes(currentUser.id);
                    const isFull = cls.registeredStudents?.length >= cls.capacity;
                    
                    return `
                    <div class="class-info">
                        <p><strong>Class:</strong> ${cls.classId}</p>
                        <p><strong>Instructor:</strong> ${cls.instructor}</p>
                        <p><strong>Schedule:</strong> ${cls.schedule}</p>
                        <p><strong>Availability:</strong> ${cls.capacity - (cls.registeredStudents?.length || 0)}/${cls.capacity}</p>
                        ${currentUser.role === 'student' && course.status === 'open' ? `
                            <button class="register-btn" 
                                    data-course="${course.code}" 
                                    data-class="${cls.classId}"
                                    ${isRegistered || isFull ? 'disabled' : ''}>
                                ${isRegistered ? 'Registered' : isFull ? 'Class Full' : 'Register'}
                            </button>
                        ` : ''}
                    </div>
                    `;
                }).join('')}
            </div>
        `;
        
        coursesGrid.appendChild(courseCard);
    });
    
    // Add event listeners to register buttons
    if (currentUser.role === 'student') {
        document.querySelectorAll('.register-btn:not([disabled])').forEach(btn => {
            btn.addEventListener('click', handleRegistration);
        });
    }
}

function setupLearningPathTabs() {
    const tabs = document.querySelectorAll('.path-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Remove active class from all tabs
        tabs.forEach(t => t.classList.remove('active'));
        // Add active class to clicked tab
        tab.classList.add('active');
        
        // Hide all panes
        document.querySelectorAll('.path-pane').forEach(pane => {
          pane.classList.remove('active');
        });
        
        // Show selected pane
        const tabName = tab.dataset.tab;
        document.getElementById(`${tabName}-courses`).classList.add('active');
      });
    });
  }
  
  function displayLearningPath() {
    if (currentUser?.role !== 'student') {
      document.getElementById('learning-path-section').style.display = 'none';
      return;
    }
    
    document.getElementById('learning-path-section').style.display = 'block';
    
    // Get all registered courses (in-progress)
    const inProgressCourses = [];
    allCourses.forEach(course => {
      course.classes.forEach(cls => {
        if (cls.registeredStudents?.includes(currentUser.id)) {
          inProgressCourses.push({
            ...course,
            classInfo: cls,
            status: 'in-progress'
          });
        }
      });
    });
    
    // Get completed courses (from user data)
    const completedCourses = currentUser.completedCourses?.map(course => ({
      ...course,
      status: 'completed'
    })) || [];
    
    // Get pending courses (registered but not started)
    const pendingCourses = inProgressCourses.filter(course => 
      course.status === 'open' && 
      !completedCourses.some(c => c.code === course.code)
    );
    
    // Filter out pending from in-progress
    const filteredInProgress = inProgressCourses.filter(course => 
      !pendingCourses.some(c => c.code === course.code)
    );
    
    // Display each category
    displayPathCourses(completedCourses, 'completed');
    displayPathCourses(filteredInProgress, 'in-progress');
    displayPathCourses(pendingCourses, 'pending');
  }
  
  function displayPathCourses(courses, status) {
    const container = document.getElementById(`${status}-courses`);
    container.innerHTML = '';
    
    if (courses.length === 0) {
      container.innerHTML = `<p class="no-courses">No ${status.replace('-', ' ')} courses found.</p>`;
      return;
    }
    
    courses.forEach(course => {
      const courseEl = document.createElement('div');
      courseEl.className = `path-course ${status}`;
      
      if (status === 'completed') {
        courseEl.innerHTML = `
          <div>
            <h4>${course.name} (${course.code})</h4>
            <p>${course.description}</p>
          </div>
          <div class="course-grade">Grade: ${course.grade}</div>
        `;
      } else {
        courseEl.innerHTML = `
          <div>
            <h4>${course.name} (${course.code})</h4>
            <p>${course.description}</p>
            <p><strong>Instructor:</strong> ${course.classInfo.instructor}</p>
            <p><strong>Schedule:</strong> ${course.classInfo.schedule}</p>
          </div>
          <div>
            ${status === 'pending' ? 
              '<button class="cancel-btn" data-course="${course.code}" data-class="${course.classInfo.classId}">Cancel</button>' : 
              '<div class="status-badge">In Progress</div>'}
          </div>
        `;
      }
      
      container.appendChild(courseEl);
    });
    
    // Add event listeners to cancel buttons
    if (status === 'pending') {
      document.querySelectorAll('.cancel-btn').forEach(btn => {
        btn.addEventListener('click', handleCancelRegistration);
      });
    }
  }
  
  function handleCancelRegistration(e) {
    const courseCode = e.target.dataset.course;
    const classId = e.target.dataset.class;
    
    // Find the course and class
    const course = allCourses.find(c => c.code === courseCode);
    const cls = course.classes.find(c => c.classId === classId);
    
    // Remove student from registeredStudents
    cls.registeredStudents = cls.registeredStudents.filter(id => id !== currentUser.id);
    
    // Update display
    displayLearningPath();
    applyFilters();
    
    showMessage(`Registration canceled for ${course.name}`, 'success');
  }

function showMessage(message, type, target) {
    target.textContent = message;
    target.className = `message ${type} show`;  // Add 'show' class to make it visible
    setTimeout(() => {
        target.classList.remove("show");  // Remove 'show' after 3 seconds
    }, 3000);
}

// Admin Validation for Courses and Classes - Use Case 5
async function handleAdminValidation() {
    if (!currentUser || currentUser.role !== 'admin') return;

    const courseElements = document.querySelectorAll('.course-card');
    courseElements.forEach(courseCard => {
        const courseCode = courseCard.dataset.code;
        const course = allCourses.find(c => c.code === courseCode);

        const validateBtn = courseCard.querySelector('.validate-btn');
        const cancelBtn = courseCard.querySelector('.cancel-btn');

        // Check if course has sufficient registrations
        const allClassesValid = course.classes.every(cls => 
            cls.registeredStudents.length >= 5 // Assume 5 students minimum
        );

        if (allClassesValid) {
            validateBtn.disabled = false;
        } else {
            cancelBtn.disabled = false;
        }

        // Validate the course
        validateBtn?.addEventListener('click', () => {
            course.status = 'validated';
            showMessage(`Course ${course.name} validated successfully!`, 'success');
            applyFilters();  // Update courses display
        });

        // Cancel the course if insufficient registrations
        cancelBtn?.addEventListener('click', () => {
            course.status = 'cancelled';
            showMessage(`Course ${course.name} cancelled due to insufficient registrations.`, 'error');
            applyFilters();  // Update courses display
        });
    });
}

// Admin Create New Course - Use Case 5
async function handleCreateCourse() {
    if (!currentUser || currentUser.role !== 'admin') return;

    const newCourse = {
        code: prompt("Enter the course code:"),
        name: prompt("Enter the course name:"),
        category: prompt("Enter the course category:"),
        status: "open",
        prerequisites: prompt("Enter prerequisites (comma separated):").split(","),
        classes: []
    };

    allCourses.push(newCourse);
    localStorage.setItem('courses', JSON.stringify(allCourses));  // Save to local storage
    showMessage(`Course ${newCourse.name} created successfully!`, 'success');
    applyFilters();  // Update courses display
}

// Display Courses for Admin (Use Case 5)
function displayCourses(courses) {
    coursesGrid.innerHTML = '';

    if (!courses || courses.length === 0) {
        coursesGrid.innerHTML = `<p>No courses available</p>`;
        return;
    }

    courses.forEach(course => {
        const courseCard = document.createElement('div');
        courseCard.className = 'course-card';
        courseCard.dataset.code = course.code;

        // Check if the validate button should be enabled
        const validateBtnDisabled = course.status === 'validated' || course.classes.every(cls => cls.registeredStudents.length < 5);

        courseCard.innerHTML = `
            <div class="course-header">
                <h4>${course.name}</h4>
                <span class="course-code">${course.code}</span>
            </div>
            <div class="course-body">
                <div class="course-meta">
                    <span class="course-category">${course.category}</span>
                    <span class="course-status">${course.status.toUpperCase()}</span>
                </div>
                <p class="course-description">${course.description}</p>
                <div class="course-prereqs">
                    <span>Prerequisites:</span> ${course.prerequisites?.join(', ') || 'None'}
                </div>

                <!-- Display all classes for the course -->
                ${(course.classes || []).map(cls => `
                    <div class="class-info">
                        <p><strong>Class:</strong> ${cls.classId}</p>
                        <p><strong>Instructor:</strong> ${cls.instructor}</p>
                        <p><strong>Schedule:</strong> ${cls.schedule}</p>
                        <p><strong>Availability:</strong> ${cls.capacity - (cls.registeredStudents?.length || 0)}/${cls.capacity}</p>
                    </div>
                `).join('')}
                
                <button class="validate-btn" ${validateBtnDisabled ? 'disabled' : ''} onclick="validateCourse('${course.code}')">Validate Course</button>
                <button class="cancel-btn" onclick="cancelCourse('${course.code}')">Cancel Course</button>
            </div>
        `;

        coursesGrid.appendChild(courseCard);
    });
}

// Validate the Course
async function validateCourse(courseCode) {
    if (currentUser.role !== 'admin') return;

    const course = allCourses.find(c => c.code === courseCode);
    if (course) {
        // Check if course has enough registered students
        const allClassesValid = course.classes.every(cls => cls.registeredStudents.length >= 5);  // Minimum 5 students

        if (allClassesValid) {
            course.status = 'validated';  // Set course status to validated
            alert(`Course ${course.name} has been validated.`);
        } else {
            alert(`Course ${course.name} does not have enough registrations to be validated.`);
        }

        // Refresh the course display
        displayCourses(allCourses);
    }
}

// Cancel the Course
async function cancelCourse(courseCode) {
    if (currentUser.role !== 'admin') return;

    const course = allCourses.find(c => c.code === courseCode);
    if (course) {
        course.status = 'cancelled';  // Set course status to cancelled
        alert(`Course ${course.name} has been cancelled.`);

        // Refresh the course display
        displayCourses(allCourses);
    }
}

// Create New Course (for Admin)
async function createNewCourse() {
    if (currentUser.role !== 'admin') return;

    const newCourse = {
        code: prompt("Enter the course code:"),
        name: prompt("Enter the course name:"),
        category: prompt("Enter the course category:"),
        status: "open",
        description: prompt("Enter course description:"),
        prerequisites: prompt("Enter prerequisites (comma separated):").split(","),
        classes: []
    };

    allCourses.push(newCourse);
    displayCourses(allCourses);  // Refresh the course display
    alert(`Course ${newCourse.name} created successfully!`);
}