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
    
    // Load session if exists
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        loginScreen.style.display = 'none';
        appMain.style.display = 'block';
        welcomeMessage.textContent = `Welcome, ${currentUser.name}`;
    }
    
    await loadData();
    setupEventListeners();
    
    if (currentUser) {
        applyFilters();
        
        if (currentUser.role === 'student') {
            displayLearningPath();
            setupLearningPathTabs();
        } 
        
        if (currentUser.role === 'admin') {
            setupAdminPanel();
        }

        if (currentUser.role === 'instructor') {
            setupInstructorView();
        }
    }
});

// Load data from JSON files
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
        
        // Merge with saved registrations if they exist
        const savedCourses = localStorage.getItem('courseRegistrations');
        allCourses = savedCourses ? JSON.parse(savedCourses) : coursesData.courses || coursesData;
        
        // Convert old string-based registrations to objects if needed
        allCourses.forEach(course => {
            course.classes?.forEach(cls => {
                if (cls.registeredStudents && cls.registeredStudents.length > 0 && typeof cls.registeredStudents[0] === 'string') {
                    cls.registeredStudents = cls.registeredStudents.map(studentId => ({
                        studentId,
                        status: 'approved' // Assume old registrations were pre-approved
                    }));
                }
            });
        });

        localStorage.setItem('users', JSON.stringify(usersData.users));
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
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            applyFilters();
        });
    });
    
    // Approve button delegation
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('approve-btn')) {
            handleApproval(e);
        }
        if (e.target.classList.contains('register-btn')) {
            handleRegistration(e);
        }
        if (e.target.classList.contains('cancel-btn')) {
            handleCancelRegistration(e);
        }
        if (e.target.classList.contains('validate-btn')) validateClass(e);
        if (e.target.classList.contains('cancel-class-btn')) cancelClass(e);
    });
}

// Add initialization of admin panel to handleLogin
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
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            loginForm.reset();
            loginScreen.style.display = 'none';
            appMain.style.display = 'block';
            welcomeMessage.textContent = `Welcome, ${user.name}`;

            // Get section references
            const coursesSection = document.querySelector('.courses-section');
            const adminSection = document.getElementById('admin-section');
            const instructorSection = document.getElementById('instructor-section');
            const learningPathSection = document.getElementById('learning-path-section');

            // Reset all sections
            coursesSection.style.display = 'none';
            adminSection.style.display = 'none';
            instructorSection.style.display = 'none';
            learningPathSection.style.display = 'none';

            if (user.role === 'student') {
                coursesSection.style.display = 'block';
                learningPathSection.style.display = 'block';
                displayLearningPath();
                setupLearningPathTabs();
            } 
            else if (user.role === 'admin') {
                adminSection.style.display = 'block';
                setupAdminPanel();
            }
            else if (user.role === 'instructor') {
                instructorSection.style.display = 'block';
                setupInstructorView();
            }

            applyFilters();

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
    sessionStorage.removeItem('currentUser');
    loginScreen.style.display = 'flex';
    appMain.style.display = 'none';
    showMessage('You have been logged out successfully', 'success');
}

// Apply filters and search
function applyFilters() {
    if (!currentUser) return;

    const coursesGrid = document.getElementById('courses-grid');
    const coursesSection = document.querySelector('.courses-section');
    
    // Hide courses section from non-students
    if(currentUser.role !== 'student') {
        coursesSection.style.display = 'none';
        coursesGrid.innerHTML = '';
        return;
    }
    
    coursesSection.style.display = 'block';

    const searchTerm = courseSearch.value.toLowerCase().trim();
    const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;

    let filteredCourses = allCourses.filter(course => {
        const matchesSearch = searchTerm === '' || 
            course.name.toLowerCase().includes(searchTerm) ||
            course.code.toLowerCase().includes(searchTerm) ||
            course.category.toLowerCase().includes(searchTerm);

        const matchesCategory = activeFilter === 'all' || 
            course.category.toLowerCase() === activeFilter;

        const hasActiveClasses = course.classes?.some(cls => 
            cls.status !== 'cancelled' && 
            course.status === 'open'
        );

        const isCompleted = currentUser.completedCourses?.some(c => c.code === course.code);

        return matchesSearch && matchesCategory && hasActiveClasses && !isCompleted;
    });

    displayCourses(filteredCourses);
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
                
                ${(course.classes || [])
                    .filter(cls => cls.status !== 'cancelled')
                    .map(cls => {
                        const studentRegistration = cls.registeredStudents?.find(r => 
                            r.studentId === currentUser?.id
                        );
                        const isPending = studentRegistration?.status === 'pending';
                        const isApproved = studentRegistration?.status === 'approved';
                        const isFull = cls.registeredStudents?.length >= cls.capacity;
                        
                        return `
                        <div class="class-info">
                            <p><strong>Class:</strong> ${cls.classId}</p>
                            <p><strong>Instructor:</strong> ${cls.instructor}</p>
                            <p><strong>Schedule:</strong> ${cls.schedule}</p>
                            <p><strong>Availability:</strong> ${cls.capacity - (cls.registeredStudents?.length || 0)}/${cls.capacity}</p>
                            ${currentUser?.role === 'student' && 
                             course.status === 'open' && 
                             cls.status !== 'cancelled' ? `
                                <button class="register-btn" 
                                        data-course="${course.code}" 
                                        data-class="${cls.classId}"
                                        ${isPending || isApproved || isFull ? 'disabled' : ''}>
                                    ${isApproved ? 'Registered' : 
                                     isPending ? 'Pending Approval' : 
                                     isFull ? 'Class Full' : 'Register'}
                                </button>
                            ` : ''}
                        </div>
                        `;
                    }).join('')}
            </div>
        `;
        
        coursesGrid.appendChild(courseCard);
    });
}

// Handle course registration
async function handleRegistration(e) {
    const courseCode = e.target.dataset.course;
    const classId = e.target.dataset.class;
    
    const course = allCourses.find(c => c.code === courseCode);
    const cls = course.classes.find(c => c.classId === classId);
    
    // Check prerequisites
    if (!checkPrerequisites(currentUser, course)) {
        showMessage(`You must complete all prerequisites for ${course.name}`, 'error');
        return;
    }
    
    // Check capacity
    if (cls.registeredStudents?.length >= cls.capacity) {
        showMessage(`Class ${classId} is full`, 'error');
        return;
    }
    
    // Check if already registered
    if (cls.registeredStudents?.some(r => r.studentId === currentUser.id)) {
        showMessage(`You're already registered for this class`, 'error');
        return;
    }
    
    try {
        // Add registration with pending status
        if (!cls.registeredStudents) cls.registeredStudents = [];
        cls.registeredStudents.push({
            studentId: currentUser.id,
            status: 'pending'
        });
        
        // Update UI
        e.target.disabled = true;
        e.target.textContent = 'Pending Approval';
        showMessage(`Registration requested for ${course.name}. Waiting for admin approval.`, 'success');
        
        // Save state
        localStorage.setItem('courseRegistrations', JSON.stringify(allCourses));
        displayLearningPath();
        
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('Registration failed. Please try again.', 'error');
    }
}

// Handle approval by admin/instructor
function handleApproval(e) {
    const courseCode = e.target.dataset.course;
    const classId = e.target.dataset.class;
    const studentId = e.target.dataset.student;

    const course = allCourses.find(c => c.code === courseCode);
    const cls = course.classes.find(c => c.classId === classId);
    const registration = cls.registeredStudents.find(r => r.studentId === studentId);

    if (registration) {
        registration.status = 'approved';
        localStorage.setItem('courseRegistrations', JSON.stringify(allCourses));
        showMessage(`Approved ${studentId} for ${course.name}`, 'success');
        applyFilters();
        displayLearningPath();
    }
}

// Check if student meets prerequisites
function checkPrerequisites(student, course) {
    if (!course.prerequisites || course.prerequisites.length === 0) return true;
    const completedCodes = student.completedCourses?.map(c => c.code) || [];
    return course.prerequisites.every(preReq => completedCodes.includes(preReq));
}

//Display learning path
function displayLearningPath() {
    const learningPathSection = document.getElementById('learning-path-section');
    if (!learningPathSection) return;
    
    if (currentUser?.role !== 'student') {
        learningPathSection.style.display = 'none';
        return;
    }
    
    learningPathSection.style.display = 'block';
    
    // Get completed courses
    const completedCourses = currentUser.completedCourses?.map(c => ({
        ...c,
        status: 'completed'
    })) || [];
    
    // Get all registered courses (excluding cancelled)
    const registeredCourses = allCourses.flatMap(course => 
        course.classes?.flatMap(cls => 
            cls.registeredStudents?.some(r => 
                r.studentId === currentUser.id &&
                cls.status !== 'cancelled'
            ) ? [{ ...course, classInfo: cls }] : []
        ) || []
    );
    
    // Categorize
    const pendingCourses = registeredCourses.filter(c => 
        c.classInfo.registeredStudents.find(r => 
            r.studentId === currentUser.id && 
            r.status === 'pending'
        )
    );
    
    const inProgressCourses = registeredCourses.filter(c => 
        c.classInfo.registeredStudents.find(r => 
            r.studentId === currentUser.id && 
            r.status === 'approved'
        )
    );
    
    // Display
    displayPathCourses(completedCourses, 'completed');
    displayPathCourses(inProgressCourses, 'in-progress');
    displayPathCourses(pendingCourses, 'pending');
}

function displayPathCourses(courses, status) {
    const container = document.getElementById(`${status}-courses`);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (courses.length === 0) {
        container.innerHTML = `<p class="no-courses">No ${status.replace('-', ' ')} courses found.</p>`;
        return;
    }
    
    courses.forEach(course => {
        const courseEl = document.createElement('div');
        courseEl.className = `path-course ${status}`;


        //added
        const isReallyCompleted = status === 'completed' || (status === 'in-progress' && !currentUser
            .completedCourses?.some(c => c.code === course.code));

        if (!isReallyCompleted && status === 'in-progress') return;
        
        if (status === 'completed') {
            courseEl.innerHTML = `
                <div>
                    <h4>${course.name} (${course.code})</h4>
                    <p>${course.description}</p>
                </div>
                <div class="course-grade">Grade: ${course.grade}</div>
            `;
        } else {
            const isPending = status === 'pending';
            courseEl.innerHTML = `
                <div>
                    <h4>${course.name} (${course.code})</h4>
                    <p>${course.description}</p>
                    <p><strong>Instructor:</strong> ${course.classInfo.instructor}</p>
                    <p><strong>Schedule:</strong> ${course.classInfo.schedule}</p>
                </div>
                <div>
                    ${isPending ? 
                        `<button class="cancel-btn" 
                                data-course="${course.code}" 
                                data-class="${course.classInfo.classId}">
                            Cancel
                        </button>` : 
                        '<div class="status-badge">In Progress</div>'}
                </div>
            `;
        }
        
        container.appendChild(courseEl);
    });
}

// Handle cancel registration
function handleCancelRegistration(e) {
    const courseCode = e.target.dataset.course;
    const classId = e.target.dataset.class;
    
    const course = allCourses.find(c => c.code === courseCode);
    const cls = course.classes.find(c => c.classId === classId);
    
    if (cls) {
        cls.registeredStudents = cls.registeredStudents.filter(
            r => r.studentId !== currentUser.id
        );
        
        localStorage.setItem('courseRegistrations', JSON.stringify(allCourses));
        displayLearningPath();
        applyFilters();
        showMessage(`Registration canceled for ${course.name}`, 'success');
    }
}

function setupLearningPathTabs() {
    const tabs = document.querySelectorAll('.path-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.querySelectorAll('.path-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            
            document.getElementById(`${tab.dataset.tab}-courses`).classList.add('active');
        });
    });
}

function showMessage(message, type, target = loginMessage) {
    if (!target) return;
    
    target.textContent = message;
    target.className = `message ${type} show`;
    
    setTimeout(() => {
        target.classList.remove("show");
    }, 3000);
}

// Admin Panel Functions
function setupAdminPanel() {
    const adminSection = document.getElementById('admin-section');
    if (!adminSection) return;
    
    if (currentUser?.role === 'admin') {
        adminSection.style.display = 'block';
        setupAdminTabs();
        setupAdminFilters();
        loadAdminCourses();
        setupCourseForm();
    } else {
        adminSection.style.display = 'none'; 
    }
}

function setupAdminTabs() {
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.querySelectorAll('.admin-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });
}

function setupAdminFilters() {
    const filterBtns = document.querySelectorAll('.admin-filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            loadAdminCourses();
        });
    });
}

function loadAdminCourses() {
    const coursesList = document.getElementById('admin-courses-list');
    if (!coursesList) return;
    
    const activeFilter = document.querySelector('.admin-filter-btn.active').dataset.filter;
    
    // Build filtered courses with classes that match the active filter.
    const filteredCourses = allCourses.map(course => {
        const filteredClasses = course.classes?.filter(cls => {
            if (activeFilter === 'in-progress') {
                return cls.status === 'validated';
            } else if (activeFilter === 'open') {
                return cls.status === 'pending';
            } else if (activeFilter === 'completed') {
                return cls.status === 'completed';
            } else if (activeFilter === 'all') {
                return cls.status !== 'cancelled';
            }
            return false;
        }) || [];
        
        // Only include courses that have at least one matching class.
        if (filteredClasses.length > 0) {
            return { ...course, classes: filteredClasses };
        }
        return null;
    }).filter(course => course !== null);
    
    displayAdminCourses(filteredCourses, coursesList);
}


function displayAdminCourses(courses, container) {
    container.innerHTML = '';
    
    if (!courses || courses.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <p>No courses found matching your criteria</p>
            </div>
        `;
        return;
    }
    
    courses.forEach(course => {
        const courseCard = document.createElement('div');
        courseCard.className = 'admin-course-card';
        
        courseCard.innerHTML = `
            <div class="admin-course-header">
                <div>
                    <h4>${course.name} (${course.code})</h4>
                </div>
            </div>
            <div class="admin-course-body">
                <p><strong>Category:</strong> ${course.category}</p>
                <p>${course.description}</p>
                <p><strong>Prerequisites:</strong> ${course.prerequisites?.join(', ') || 'None'}</p>
                
                ${(course.classes || []).map(cls => {
                    const registeredCount = cls.registeredStudents?.length || 0;
                    const isValidated = cls.status === 'validated';
                    const isCancelled = cls.status === 'cancelled';
                    
                    return `
                    <div class="admin-class-card">
                        <h5>Class: ${cls.classId}</h5>
                        <p><strong>Instructor:</strong> ${cls.instructor}</p>
                        <p><strong>Schedule:</strong> ${cls.schedule}</p>
                        <p><strong>Registrations:</strong> ${registeredCount}/${cls.capacity}</p>
                        <p><strong>Status:</strong> ${cls.status || 'pending'}</p>
                        
                        ${!isValidated && !isCancelled ? `
                        <div class="admin-actions">
                            <button class="validate-btn" 
                                    data-course="${course.code}" 
                                    data-class="${cls.classId}">
                                Validate Class
                            </button>
                            <button class="cancel-class-btn" 
                                    data-course="${course.code}" 
                                    data-class="${cls.classId}">
                                Cancel Class
                            </button>
                        </div>
                        ` : ''}
                    </div>
                    `;
                }).join('')}
            </div>
        `;
        
        container.appendChild(courseCard);
    });
}

/* Helper function to render classes section */
function renderClassesSection(course) {
    return (course.classes || []).map(cls => {
        const registeredCount = cls.registeredStudents?.length || 0;
        const isSufficientRegistrations = registeredCount >= 3; // Minimum students required
        const isValidated = cls.status === 'validated';
        const isCancelled = cls.status === 'cancelled';
        
        return `
        <div class="admin-class-card">
            <h5>Class ${cls.classId}</h5>
            <div class="class-details">
                <p><strong>Instructor:</strong> ${cls.instructor}</p>
                <p><strong>Schedule:</strong> ${cls.schedule}</p>
                <p><strong>Students:</strong> ${registeredCount}/${cls.capacity}</p>
                <p><strong>Status:</strong> <span class="status-badge ${cls.status || 'pending'}">
                    ${cls.status || 'pending'}
                </span></p>
            </div>
            
            ${!isValidated && !isCancelled ? `
            <div class="admin-actions">
                <button class="validate-btn" 
                        data-course="${course.code}" 
                        data-class="${cls.classId}"
                        ${!isSufficientRegistrations ? 'disabled' : ''}>
                    Validate
                </button>
                <button class="cancel-btn" 
                        data-course="${course.code}" 
                        data-class="${cls.classId}">
                    Cancel
                </button>
                
                ${!isSufficientRegistrations ? `
                <div class="validation-hint">
                    Requires 5+ students (currently ${registeredCount})
                </div>
                ` : ''}
            </div>
            ` : ''}
        </div>
        `;
    }).join('');
}

function validateClass(e) {
    // Get button data attributes
    const courseCode = e.target.dataset.course;
    const classId = e.target.dataset.class;
    
    // Find the course and class
    const course = allCourses.find(c => c.code === courseCode);
    if (!course) {
        console.error('Course not found:', courseCode);
        return;
    }
    
    const cls = course.classes.find(c => c.classId === classId);
    if (!cls) {
        console.error('Class not found:', classId);
        return;
    }

    // Calculate registered students
    const registeredCount = cls.registeredStudents?.length || 0;
    const MIN_STUDENTS_REQUIRED = 1;

    // Check minimum student requirement
    if (registeredCount < MIN_STUDENTS_REQUIRED) {
        showMessage(
            `Cannot validate class. Requires at least ${MIN_STUDENTS_REQUIRED} students (currently ${registeredCount}).`, 
            'error', 
            document.getElementById('admin-message')
        );
        return;
    }

    // Set class status to validated.
    cls.status = 'validated';
    
    // Auto-approve all pending students for this class.
    if (cls.registeredStudents) {
        cls.registeredStudents.forEach(student => {
            if (student.status === 'pending') {
                student.status = 'approved';
            }
        });
    }
    
    // Update storage and UI.
    localStorage.setItem('courseRegistrations', JSON.stringify(allCourses));
    showMessage(`Class ${classId} validated successfully!`, 'success', document.getElementById('admin-message'));
    
    // Refresh admin view.
    loadAdminCourses();
    
    // Refresh student views.
    if (currentUser?.role === 'student') {
        displayLearningPath();
        applyFilters();
    }
    
    // Refresh instructor view.
    if (currentUser?.role === 'instructor') {
        loadInstructorClasses();
    }
}



function cancelClass(e) {
    const courseCode = e.target.dataset.course;
    const classId = e.target.dataset.class;
    
    const course = allCourses.find(c => c.code === courseCode);
    if (!course) return;
    
    const cls = course.classes.find(c => c.classId === classId);
    if (!cls) return;
    
    // Cancel the class.
    cls.status = 'cancelled';
    
    // Remove class registrations from all users.
    const allUsers = JSON.parse(localStorage.getItem('users')) || [];
    allUsers.forEach(user => {
        // Remove from completed courses if present.
        if (user.completedCourses) {
            user.completedCourses = user.completedCourses.filter(
                c => c.code !== courseCode
            );
        }
        
        // For student users, remove registration for this class.
        if (user.role === 'student') {
            course.classes.forEach(c => {
                if (c.registeredStudents) {
                    c.registeredStudents = c.registeredStudents.filter(
                        r => r.studentId !== user.id
                    );
                }
            });
        }
    });
    
    // Save changes.
    localStorage.setItem('courseRegistrations', JSON.stringify(allCourses));
    localStorage.setItem('users', JSON.stringify(allUsers));
    
    showMessage(`Class ${classId} for course ${course.name} has been cancelled`, 'success', document.getElementById('admin-message'));
    
    // Refresh all views.
    loadAdminCourses();
    
    if (currentUser?.role === 'student') {
        displayLearningPath();
        applyFilters();
    }
    if (currentUser?.role === 'instructor') {
        loadInstructorClasses();
    }
}



function setupCourseForm() {
    const courseForm = document.getElementById('course-form');
    const classesContainer = document.getElementById('classes-container');
    
    if (!courseForm || !classesContainer) return;
    
    // Add first class form
    addClassForm();
    
    // Setup add class button
    document.getElementById('add-class-btn').addEventListener('click', addClassForm);
    
    // Handle form submission
    courseForm.addEventListener('submit', function(e) {
        e.preventDefault();
        createNewCourse();
    });
}

function addClassForm() {
    const classesContainer = document.getElementById('classes-container');
    const classForms = document.querySelectorAll('.class-form');
    
    // Create new class form
    const classForm = document.createElement('div');
    classForm.className = 'class-form';
    classForm.innerHTML = `
        <div class="form-group">
            <label for="class-id">Class ID:</label>
            <input type="text" class="class-id" required>
        </div>
        <div class="form-group">
            <label for="class-instructor">Instructor:</label>
            <input type="text" class="class-instructor" required>
        </div>
        <div class="form-group">
            <label for="class-schedule">Schedule:</label>
            <input type="text" class="class-schedule" required>
        </div>
        <div class="form-group">
            <label for="class-capacity">Capacity:</label>
            <input type="number" class="class-capacity" min="1" value="20" required>
        </div>
        <button type="button" class="btn-danger remove-class-btn">
            <i class="fas fa-trash"></i> Remove Class
        </button>
    `;
    
    // Add remove button handler
    const removeBtn = classForm.querySelector('.remove-class-btn');
    removeBtn.addEventListener('click', () => {
        if (document.querySelectorAll('.class-form').length > 1) {
            classForm.remove();
        } else {
            showMessage('Each course must have at least one class', 'error');
        }
    });
    
    classesContainer.appendChild(classForm);
}

function createNewCourse() {
    // Get course values
    const name = document.getElementById('course-name').value.trim();
    const code = document.getElementById('course-code').value.trim();
    const category = document.getElementById('course-category').value;
    const description = document.getElementById('course-description').value.trim();
    const prerequisites = document.getElementById('course-prerequisites').value.trim();
    const status = document.getElementById('course-status').value;
    
    // Validate required fields
    if (!name || !code || !description) {
        showMessage('Please fill in all required course fields', 'error', document.getElementById('admin-message'));
        return;
    }
    
    // Get all class data
    const classForms = document.querySelectorAll('.class-form');
    const classes = [];
    
    // Validate classes
    for (const form of classForms) {
        const classId = form.querySelector('.class-id').value.trim();
        const instructor = form.querySelector('.class-instructor').value.trim();
        const schedule = form.querySelector('.class-schedule').value.trim();
        const capacity = parseInt(form.querySelector('.class-capacity').value);
        
        if (!classId || !instructor || !schedule || isNaN(capacity)) {
            showMessage('Please fill all fields for each class', 'error', document.getElementById('admin-message'));
            return;
        }
        
        // Check for duplicate class IDs
        if (classes.some(c => c.classId === classId)) {
            showMessage(`Class ID "${classId}" is duplicated. Each class must have a unique ID.`, 'error', document.getElementById('admin-message'));
            return;
        }
        
        classes.push({
            classId,
            instructor,
            schedule,
            capacity,
            registeredStudents: [],
            status: 'pending'
        });
    }
    
    // Check at least one class exists
    if (classes.length === 0) {
        showMessage('Each course must have at least one class', 'error', document.getElementById('admin-message'));
        return;
    }
    
    // Check if course code already exists
    if (allCourses.some(c => c.code === code)) {
        showMessage('A course with this code already exists', 'error', document.getElementById('admin-message'));
        return;
    }
    
    // Create new course
    const newCourse = {
        name,
        code,
        category,
        description,
        prerequisites: prerequisites ? prerequisites.split(',').map(p => p.trim()) : [],
        status,
        classes
    };
    
    // Add to courses
    allCourses.push(newCourse);
    
    // Save to localStorage
    localStorage.setItem('courseRegistrations', JSON.stringify(allCourses));
    
    // Show success
    showMessage(`Course "${name}" created with ${classes.length} classes`, 'success', document.getElementById('admin-message'));
    
    // Reset form
    document.getElementById('course-form').reset();
    
    // Reset classes (keep one form)
    const classesContainer = document.getElementById('classes-container');
    classesContainer.innerHTML = '';
    addClassForm();
    
    // Refresh admin view
    loadAdminCourses();
}

// Function to set up instructor view when logging in
function setupInstructorView() {
    const instructorSection = document.getElementById('instructor-section');
    const coursesSection = document.querySelector('.courses-section');
    
    if (!instructorSection) return;
    
    if (currentUser?.role === 'instructor') {
        instructorSection.style.display = 'block';
        coursesSection.style.display = 'none';
        
        // Hide other sections
        ['#admin-section', '#learning-path-section'].forEach(selector => {
            const el = document.querySelector(selector);
            if (el) el.style.display = 'none';
        });
        
        loadInstructorClasses();
    } else {
        instructorSection.style.display = 'none';
    }
}

// Function to load classes taught by the instructor
function loadInstructorClasses() {
    const instructorClassesList = document.getElementById('instructor-classes-list');
    if (!instructorClassesList) return;
    
    // Filter active classes that aren't fully graded
    const instructorCourses = allCourses.filter(course => 
        course.classes?.some(cls => 
            cls.instructor === currentUser.name &&
            cls.status !== 'cancelled' &&
            !cls.gradingComplete
        )
    );
    
    if (instructorCourses.length === 0) {
        instructorClassesList.innerHTML = `
            <div class="no-results">
                <p>You have no classes requiring grading.</p>
            </div>
        `;
        return;
    }
    
    instructorClassesList.innerHTML = '';
    
    instructorCourses.forEach(course => {
        // Only include active, non-graded classes
        const activeClasses = course.classes.filter(cls => 
            cls.instructor === currentUser.name &&
            cls.status !== 'cancelled' &&
            !cls.gradingComplete
        );
        
        activeClasses.forEach(cls => {
            const studentsToGrade = cls.registeredStudents?.filter(
                reg => !reg.grade
            ) || [];
            
            const classCard = document.createElement('div');
            classCard.className = 'instructor-class-card';
            
            classCard.innerHTML = `
                <div class="instructor-class-header">
                    <h4>${course.name} (${course.code})</h4>
                    <div class="class-meta">
                        <span class="class-id">Class: ${cls.classId}</span>
                        <span class="students-remaining">${studentsToGrade.length} students remaining</span>
                    </div>
                </div>
                <div class="instructor-class-body">
                    <p><strong>Schedule:</strong> ${cls.schedule}</p>
                    <p><strong>Students Enrolled:</strong> ${cls.registeredStudents?.length || 0}/${cls.capacity}</p>
                    
                    <div class="student-grading">
                        <h5>Student Grades</h5>
                        ${studentsToGrade.length === 0 ? 
                            '<p>All students graded</p>' : 
                            `<table class="grades-table">
                                <thead>
                                    <tr>
                                        <th>Student ID</th>
                                        <th>Grade</th>
                                        <th>Update</th>
                                    </tr>
                                </thead>
                                <tbody>
                                ${studentsToGrade.map(student => `
                                    <tr>
                                        <td>${student.studentId}</td>
                                        <td>${student.grade || 'Pending'}</td>
                                        <td>
                                            <div class="grade-input-group">
                                                <select class="grade-select" 
                                                    data-course="${course.code}"
                                                    data-class="${cls.classId}"
                                                    data-student="${student.studentId}">
                                                    <option value="">Select Grade</option>
                                                    <option>A</option>
                                                    <option>B</option>
                                                    <option>C</option>
                                                    <option>D</option>
                                                    <option>F</option>
                                                </select>
                                                <button class="save-grade-btn"
                                                    data-course="${course.code}"
                                                    data-class="${cls.classId}"
                                                    data-student="${student.studentId}">
                                                    Save
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                                </tbody>
                            </table>`
                        }
                    </div>
                </div>
            `;
            
            instructorClassesList.appendChild(classCard);
        });
    });
    
    // Add event listeners for grade saving
    document.querySelectorAll('.save-grade-btn').forEach(btn => {
        btn.addEventListener('click', submitGrade);
    });
}

// Function to submit a grade for a student
function submitGrade(e) {
    const courseCode = e.target.dataset.course;
    const classId = e.target.dataset.class;
    const studentId = e.target.dataset.student;
    
    // Get the grade from the dropdown
    const gradeSelect = document.querySelector(
        `select[data-course="${courseCode}"][data-class="${classId}"][data-student="${studentId}"]`
    );
    const grade = gradeSelect.value.toUpperCase();

    // Validate the grade selection
    if (!grade || !['A', 'B', 'C', 'D', 'F'].includes(grade)) {
        showMessage("Please select a valid grade from the dropdown", "error");
        return;
    }

    // Find the course, class, and student registration
    const course = allCourses.find(c => c.code === courseCode);
    if (!course) {
        showMessage("Course not found", "error");
        return;
    }

    const cls = course.classes.find(c => c.classId === classId);
    if (!cls) {
        showMessage("Class not found", "error");
        return;
    }

    // Verify instructor authorization
    if (cls.instructor !== currentUser.name) {
        showMessage("You are not authorized to submit grades for this class", "error");
        return;
    }

    const registration = cls.registeredStudents.find(r => r.studentId === studentId);
    if (!registration) {
        showMessage("Student not found in this class", "error");
        return;
    }

    // Update the grade
    registration.grade = grade;

    // Remove student from active registrations (for all grades)
    const studentIndex = cls.registeredStudents.findIndex(r => r.studentId === studentId);
    if (studentIndex > -1) {
        cls.registeredStudents.splice(studentIndex, 1);
    }

    // Update student's completed courses if passed (A-D)
    if (grade !== 'F') {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const student = users.find(u => u.id === studentId);
        
        if (student) {
            if (!student.completedCourses) student.completedCourses = [];
            
            const existingIndex = student.completedCourses.findIndex(c => c.code === course.code);
            
            if (existingIndex >= 0) {
                student.completedCourses[existingIndex].grade = grade;
            } else {
                student.completedCourses.push({
                    code: course.code,
                    name: course.name,
                    grade: grade,
                    description: course.description
                });
            }
            
            localStorage.setItem('users', JSON.stringify(users));
        }
    }

    // Mark class as completed if all students are graded
    if (cls.registeredStudents.length === 0) {
        cls.gradingComplete = true;
    }

    // Save updates
    localStorage.setItem('courseRegistrations', JSON.stringify(allCourses));
    
    // Refresh and notify
    showMessage(`Grade ${grade} saved for ${studentId}`, "success");
    
    // Refresh all relevant views
    loadInstructorClasses();
    if (currentUser?.role === 'student') {
        displayLearningPath();
        applyFilters();
    }
}