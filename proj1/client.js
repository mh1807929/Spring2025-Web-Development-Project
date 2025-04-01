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
            await displayUserCourses();
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

