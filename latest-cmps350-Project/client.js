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
        console.log('User session found');
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
            setupUseCase7AdminView();
            loadDataCourses();
        }

        if (currentUser.role === 'instructor') {
            setupInstructorView();
        }
    }
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
            applyFilters();
            
            // Show or hide learning path based on role
            if (user.role === 'student') {
                displayLearningPath();
                setupLearningPathTabs();
                
                // Hide admin section if exists
                const adminSection = document.getElementById('admin-section');
                if (adminSection) adminSection.style.display = 'none';

                //Hide instructor section 
                const instructorSection = document.getElementById('instructor-section');
                if (instructorSection) instructorSection.style.display = 'none';
            } 
            
            if (user.role === 'admin') {
                // Hide learning path section if exists
                const learningPathSection = document.getElementById('learning-path-section');
                if (learningPathSection) learningPathSection.style.display = 'none';
                
                //Hide instructor section 
                const instructorSection = document.getElementById('instructor-section');
                if (instructorSection) instructorSection.style.display = 'none';

                // Setup admin panel
                setupAdminPanel();
            }

            if (user.role === 'instructor') {
                // Hide other sections
                const learningPathSection = document.getElementById('learning-path-section');
                if (learningPathSection) learningPathSection.style.display = 'none';
                
                const adminSection = document.getElementById('admin-section');
                if (adminSection) adminSection.style.display = 'none';
                
                // Setup instructor view
                setupInstructorView();
            }

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
            course.classes?.some(cls => cls.instructor === currentUser.name)
        );
    }
    
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
                
                ${(course.classes || []).map(cls => {
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
                        ${currentUser?.role === 'student' && course.status === 'open' ? `
                            <button class="register-btn" 
                                    data-course="${course.code}" 
                                    data-class="${cls.classId}"
                                    ${isPending || isApproved || isFull ? 'disabled' : ''}>
                                ${isApproved ? 'Registered' : 
                                 isPending ? 'Pending Approval' : 
                                 isFull ? 'Class Full' : 'Register'}
                            </button>
                        ` : ''}
                        
                        ${(currentUser?.role === 'admin' || currentUser?.role === 'instructor') ? 
                            (cls.registeredStudents || []).map(reg => {
                                if (reg.status === 'pending') {
                                    return `
                                    <div class="admin-actions">
                                        <span>Pending: ${reg.studentId}</span>
                                        <button class="approve-btn" 
                                                data-course="${course.code}" 
                                                data-class="${cls.classId}"
                                                data-student="${reg.studentId}">
                                            Approve
                                        </button>
                                    </div>
                                    `;
                                }
                                return '';
                            }).join('') : ''}
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

// STUDENT ADDITION: Display learning path
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
    
    // Get all registered courses
    const registeredCourses = allCourses.flatMap(course => 
        course.classes?.flatMap(cls => 
            cls.registeredStudents?.some(r => r.studentId === currentUser.id) 
                ? [{ ...course, classInfo: cls }] 
                : []
        ) || []
    );
    
    // Categorize
    const pendingCourses = registeredCourses.filter(c => 
        c.classInfo.registeredStudents.find(r => 
            r.studentId === currentUser.id && r.status === 'pending'
        )
    );
    
    const inProgressCourses = registeredCourses.filter(c => 
        c.classInfo.registeredStudents.find(r => 
            r.studentId === currentUser.id && r.status === 'approved'
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
    
    let filteredCourses = allCourses;
    
    // Apply status filter
    if (activeFilter !== 'all') {
        filteredCourses = allCourses.filter(course => course.status === activeFilter);
    }
    
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
                <span class="admin-course-status ${course.status}">${course.status.toUpperCase()}</span>
            </div>
            <div class="admin-course-body">
                <p><strong>Category:</strong> ${course.category}</p>
                <p>${course.description}</p>
                <p><strong>Prerequisites:</strong> ${course.prerequisites?.join(', ') || 'None'}</p>
                
                ${(course.classes || []).map(cls => {
                    const registeredCount = cls.registeredStudents?.length || 0;
                    const isSufficientRegistrations = registeredCount >= 5; // Minimum students required
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
                                    data-class="${cls.classId}"
                                    ${!isSufficientRegistrations ? 'disabled' : ''}>
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
    
    // Add event listeners for validate and cancel buttons
    document.querySelectorAll('.validate-btn').forEach(btn => {
        btn.addEventListener('click', validateClass);
    });
    
    document.querySelectorAll('.cancel-class-btn').forEach(btn => {
        btn.addEventListener('click', cancelClass);
    });
}

function validateClass(e) {
    const courseCode = e.target.dataset.course;
    const classId = e.target.dataset.class;
    
    const course = allCourses.find(c => c.code === courseCode);
    if (!course) return;
    
    const cls = course.classes.find(c => c.classId === classId);
    if (!cls) return;
    
    // Validate class
    cls.status = 'validated';
    
    // Approve all pending registrations
    if (cls.registeredStudents) {
        cls.registeredStudents.forEach(student => {
            if (student.status === 'pending') {
                student.status = 'approved';
            }
        });
    }
    
    // Save changes
    localStorage.setItem('courseRegistrations', JSON.stringify(allCourses));
    showMessage(`Class ${classId} for course ${course.name} has been validated`, 'success');
    loadAdminCourses();
}

function cancelClass(e) {
    const courseCode = e.target.dataset.course;
    const classId = e.target.dataset.class;
    
    const course = allCourses.find(c => c.code === courseCode);
    if (!course) return;
    
    const cls = course.classes.find(c => c.classId === classId);
    if (!cls) return;
    
    // Cancel class
    cls.status = 'cancelled';
    
    // Remove all students from class
    if (cls.registeredStudents) {
        cls.registeredStudents = [];
    }
    
    // Save changes
    localStorage.setItem('courseRegistrations', JSON.stringify(allCourses));
    showMessage(`Class ${classId} for course ${course.name} has been cancelled`, 'success');
    loadAdminCourses();
}

function setupCourseForm() {
    const courseForm = document.getElementById('course-form');
    if (!courseForm) return;
    
    courseForm.addEventListener('submit', function(e) {
        e.preventDefault();
        createNewCourse();
    });
}

function createNewCourse() {
    // Get form values
    const name = document.getElementById('course-name').value.trim();
    const code = document.getElementById('course-code').value.trim();
    const category = document.getElementById('course-category').value;
    const description = document.getElementById('course-description').value.trim();
    const prerequisites = document.getElementById('course-prerequisites').value.trim();
    const status = document.getElementById('course-status').value;
    
    // Get class values
    const classId = document.getElementById('class-id').value.trim();
    const instructor = document.getElementById('class-instructor').value.trim();
    const schedule = document.getElementById('class-schedule').value.trim();
    const capacity = parseInt(document.getElementById('class-capacity').value);
    
    // Validate required fields
    if (!name || !code || !description || !classId || !instructor || !schedule || !capacity) {
        showMessage('Please fill in all required fields', 'error');
        return;
    }
    
    // Check if course code already exists
    if (allCourses.some(c => c.code === code)) {
        showMessage('A course with this code already exists', 'error');
        return;
    }
    
    // Create new course object
    const newCourse = {
        name,
        code,
        category,
        description,
        prerequisites: prerequisites ? prerequisites.split(',').map(p => p.trim()) : [],
        status,
        classes: [
            {
                classId,
                instructor,
                schedule,
                capacity,
                registeredStudents: [],
                status: 'pending'
            }
        ]
    };
    
    // Add course to allCourses
    allCourses.push(newCourse);
    
    // Save to localStorage
    localStorage.setItem('courseRegistrations', JSON.stringify(allCourses));
    
    // Show success message
    showMessage(`Course ${name} with class ${classId} created successfully`, 'success');
    
    // Reset form
    document.getElementById('course-form').reset();
    
    // Refresh admin courses list
    loadAdminCourses();
}

// Function to set up instructor view when logging in
function setupInstructorView() {
    const instructorSection = document.getElementById('instructor-section');
    if (!instructorSection) return;
    
    if (currentUser?.role === 'instructor') {
        instructorSection.style.display = 'block';
        loadInstructorClasses();
        
        // Hide other role-specific sections
        const adminSection = document.getElementById('admin-section');
        if (adminSection) adminSection.style.display = 'none';
        
        const learningPathSection = document.getElementById('learning-path-section');
        if (learningPathSection) learningPathSection.style.display = 'none';
    } else {
        instructorSection.style.display = 'none';
    }
}

// Function to load classes taught by the instructor
function loadInstructorClasses() {
    const instructorClassesList = document.getElementById('instructor-classes-list');
    if (!instructorClassesList) return;
    
    // Filter courses to find classes taught by this instructor
    const instructorCourses = allCourses.filter(course => 
        course.classes?.some(cls => cls.instructor === currentUser.name)
    );
    
    if (instructorCourses.length === 0) {
        instructorClassesList.innerHTML = `
            <div class="no-results">
                <p>You are not currently teaching any classes.</p>
            </div>
        `;
        return;
    }
    
    instructorClassesList.innerHTML = '';
    
    // Display each course and its classes
    instructorCourses.forEach(course => {
        // Filter to only include classes taught by this instructor
        const instructorClasses = course.classes.filter(
            cls => cls.instructor === currentUser.name
        );
        
        instructorClasses.forEach(cls => {
            const classCard = document.createElement('div');
            classCard.className = 'instructor-class-card';
            
            // Get registered and approved students
            const approvedStudents = cls.registeredStudents?.filter(
                reg => reg.status === 'approved'
            ) || [];
            
            classCard.innerHTML = `
                <div class="instructor-class-header">
                    <h4>${course.name} (${course.code})</h4>
                    <span class="class-id">Class: ${cls.classId}</span>
                </div>
                <div class="instructor-class-body">
                    <p><strong>Schedule:</strong> ${cls.schedule}</p>
                    <p><strong>Students:</strong> ${approvedStudents.length}/${cls.capacity}</p>
                    
                    <div class="student-list">
                        <h5>Enrolled Students</h5>
                        ${approvedStudents.length === 0 ? 
                            '<p>No students enrolled yet.</p>' : 
                            '<table class="grades-table">'+
                            '<thead>'+
                            '<tr>'+
                                '<th>Student ID</th>'+
                                '<th>Current Grade</th>'+
                                '<th>Action</th>'+
                            '</tr>'+
                            '</thead>'+
                            '<tbody>'+
                            approvedStudents.map(student => {
                                return `
                                <tr>
                                    <td>${student.studentId}</td>
                                    <td>${student.grade || 'Not graded'}</td>
                                    <td>
                                        <div class="grade-input-group">
                                            <input type="text" class="grade-input" 
                                                   placeholder="A, B, C, D, F" 
                                                   value="${student.grade || ''}"
                                                   pattern="[A-F]"
                                                   maxlength="1">
                                            <button class="submit-grade-btn"
                                                    data-course="${course.code}"
                                                    data-class="${cls.classId}"
                                                    data-student="${student.studentId}">
                                                Submit
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                `;
                            }).join('')+
                            '</tbody>'+
                            '</table>'
                        }
                    </div>
                </div>
            `;
            
            instructorClassesList.appendChild(classCard);
        });
    });
    
    // Add event listeners for grade submission buttons
    document.querySelectorAll('.submit-grade-btn').forEach(btn => {
        btn.addEventListener('click', submitGrade);
    });
}

// Function to submit a grade for a student
function submitGrade(e) {
    const courseCode = e.target.dataset.course;
    const classId = e.target.dataset.class;
    const studentId = e.target.dataset.student;
    
    // Get the grade from the input field (previous sibling of the button)
    const gradeInput = e.target.previousElementSibling;
    const grade = gradeInput.value.trim().toUpperCase();
    
    // Validate the grade
    if (!grade.match(/^[A-F]$/)) {
        showMessage("Please enter a valid grade (A, B, C, D, or F)", "error");
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
    
    // Verify that the current instructor is teaching this class
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
    
    // Update the completed courses for the student if they passed (A, B, C, D)
    if (grade !== 'F') {
        // Find the student in the users array
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const student = users.find(u => u.id === studentId);
        
        if (student) {
            // Initialize completedCourses array if it doesn't exist
            if (!student.completedCourses) {
                student.completedCourses = [];
            }
            
            // Check if course already exists in completed courses
            const existingCompletion = student.completedCourses.findIndex(c => c.code === course.code);
            
            if (existingCompletion >= 0) {
                // Update the existing completion
                student.completedCourses[existingCompletion].grade = grade;
            } else {
                // Add the course to completed courses
                student.completedCourses.push({
                    code: course.code,
                    name: course.name,
                    grade: grade,
                    description: course.description
                });
            }
            
            // Save the updated users
            localStorage.setItem('users', JSON.stringify(users));
        }
    }
    
    // Save the updated course registrations
    localStorage.setItem('courseRegistrations', JSON.stringify(allCourses));
    
    // Show success message
    showMessage(`Grade submitted successfully for student ${studentId}`, "success");
    
    // Refresh the instructor view
    loadInstructorClasses();
}



// Use case 7:

document.addEventListener('DOMContentLoaded', () => {
    setupUseCase7AdminView();
  });


  function setupUseCase7AdminView() {
    // Get the admin section element
    const adminSection = document.getElementById('admin-usecase7-section');

    if (!adminSection) {
        console.error('Element with ID "admin-usecase7-section" not found.');
        return;
      }

      // Hide the section by default
      adminSection.style.display = 'none';

      // Check if the current user exists and is an admin
      if (!currentUser || currentUser.role != 'admin') {
        console.log('User is not an admin. Section hidden.');
        return; 
      }

      // Show the section only for admins
      console.log('User is an admin. Section shown.');
      adminSection.style.display = 'block';

    // Load course data and set up functionality for admins
    loadCoursesData().then(() => {
        renderCoursesForPublishing();
        const publishBtn = document.getElementById('publish-courses-btn');
        if (publishBtn) {
            publishBtn.addEventListener('click', publishSelectedCourses);
        }
    });
}
 
let all_Courses = []; 

// Fetch course data from JSON
async function loadCoursesData() {
  const response = await fetch('./data/courses.json');
  const data = await response.json();
  all_Courses = data.courses;
  renderCoursesForPublishing();
}

function renderCoursesForPublishing() {
    const courseList = document.getElementById('course-list');
    courseList.innerHTML = ''; 
  
    // Show only draft courses
    const draftCourses = allCourses.filter(course => course.status === 'draft');
  
    if (draftCourses.length === 0) {
      courseList.innerHTML = '<li>No draft courses to publish.</li>';
      return;
    }
  
    draftCourses.forEach(course => {
      const li = document.createElement('li');
  
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = course.id;
  
      const label = document.createElement('label');
      label.htmlFor = course.id;
      label.textContent = `${course.name} (${course.status})`;
  
      li.appendChild(checkbox);
      li.appendChild(label);
      courseList.appendChild(li);
    });
  }
  

// Handle publish button click
function publishSelectedCourses() {
  const checkboxes = document.querySelectorAll('#course-list input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    const course = all_Courses.find(c => c.id === checkbox.id);
    if (checkbox.checked) {
      course.status = 'open';
    } else {
      course.status = 'draft';
    }
  });

  renderCoursesForPublishing(); // Update status display
  alert('Selected courses have been published!');
}


// Setup on page load
document.addEventListener('DOMContentLoaded', async () => {
  await loadCoursesData();
  document.getElementById('publish-courses-btn').addEventListener('click', publishSelectedCourses);
});




// Use case 8: 


const displayScheduleBtn = document.getElementById('display-schedule-btn');
const scheduleGrid = document.getElementById('schedule-grid');


function displayWeeklySchedule(Data) {
    if (!currentUser || currentUser.role !== 'admin') {
        alert('Only administrators can view the schedule.');
        return;
    }

    const schedule = {};

     // Extract the courses which are in progess this week:

    Data.courses
    .filter(course => course.status === "open")
    .forEach(course => {
        course.classes.forEach(cls => {
            if (cls.schedule) {
                const [days, timeRange] = cls.schedule.split(" ");
                const daysArray = days.split("/");

                daysArray.forEach(day => {
                    if (!schedule[day]) {
                        schedule[day] = [];
                    }

                    schedule[day].push({
                        time: timeRange,
                        courseName: course.name,
                        instructor: cls.instructor
                    });
                });
            }
        });
    });

// Display the schedule in the grid:

scheduleGrid.innerHTML = '';
if (Object.keys(schedule).length === 0) {
    scheduleGrid.innerHTML = '<p>No courses in progress this week.</p>';
    return;
}

Object.keys(schedule).forEach(day => {
    const dayHeader = document.createElement('h3');
    dayHeader.textContent = day;
    scheduleGrid.appendChild(dayHeader);

    const daySchedule = document.createElement('ul');
    schedule[day].forEach(entry => {
        const listItem = document.createElement('li');
        listItem.textContent = `${entry.time} - ${entry.courseName} (Instructor: ${entry.instructor})`;
        daySchedule.appendChild(listItem);
    });

    scheduleGrid.appendChild(daySchedule);
});
}

// Loading data: 

async function loadDataCourses() {
try {
    console.log('Loading data...');
    const response = await fetch('./data/courses.json');
    const coursesData = await response.json();
    return coursesData;
} catch (error) {
    console.error('Failed to load courses:', error);
}
}

// Setup event listener:

document.addEventListener('DOMContentLoaded', async () => {
const data = await loadDataCourses();

if (data) {
    displayScheduleBtn.addEventListener('click', () => displayWeeklySchedule(data));
} else {
    scheduleGrid.innerHTML = '<p>Failed to load course data.</p>';
}
});