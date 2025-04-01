// DOM Elements
const loginForm = document.getElementById('login-form');
const loginSection = document.getElementById('login-section');
const mainContent = document.getElementById('main-content');
const welcomeUser = document.getElementById('welcome-user');
const logoutBtn = document.getElementById('logout-btn');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const resetSearch = document.getElementById('reset-search');
const coursesContainer = document.getElementById('courses-container');
const loginMessage = document.getElementById('login-message');

// Data variables
let users = [];
let courses = [];
let currentUser = null;

// Fetch data from JSON files
async function fetchData() {
    try {
        const [usersResponse, coursesResponse] = await Promise.all([
            fetch('users.json'),
            fetch('courses.json')
        ]);
        
        if (!usersResponse.ok) throw new Error('Failed to load users data');
        if (!coursesResponse.ok) throw new Error('Failed to load courses data');
        
        const usersData = await usersResponse.json();
        const coursesData = await coursesResponse.json();
        
        users = usersData.users;
        courses = coursesData.courses;
        
        console.log('Data loaded successfully');
    } catch (error) {
        console.error('Error loading data:', error);
        showMessage('Error loading application data. Please try again later.', 'error');
    }
}

// Show message to user
function showMessage(message, type = 'info') {
    loginMessage.textContent = message;
    loginMessage.style.color = type === 'error' ? 'red' : 'green';
    loginMessage.classList.remove('hidden');
    
    // Clear message after 3 seconds
    setTimeout(() => {
        loginMessage.textContent = '';
        loginMessage.classList.add('hidden');
    }, 3000);
}

// Initialize the application
function init() {
    fetchData();
    setupEventListeners();
}

// Set up event listeners
function setupEventListeners() {
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    searchBtn.addEventListener('click', handleSearch);
    resetSearch.addEventListener('click', resetCourseDisplay);
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!username || !password) {
        showMessage('Please enter both username and password', 'error');
        return;
    }
    
    // Check if data is loaded
    if (users.length === 0) {
        await fetchData();
    }
    
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        currentUser = user;
        loginForm.reset();
        loginSection.classList.add('hidden');
        mainContent.classList.remove('hidden');
        welcomeUser.textContent = user.name;
        
        // Display courses based on user role
        if (user.role === 'student') {
            displayCourses(courses);
        } else if (user.role === 'instructor') {
            displayCourses(courses.filter(course => 
                course.classes.some(cls => cls.instructor === user.name)
            ));
        } else if (user.role === 'admin') {
            displayCourses(courses);
        }
    } else {
        showMessage('Invalid username or password', 'error');
    }
}

// Handle logout
function handleLogout() {
    currentUser = null;
    mainContent.classList.add('hidden');
    loginSection.classList.remove('hidden');
    coursesContainer.innerHTML = '';
    showMessage('You have been logged out', 'info');
}

// Display courses
function displayCourses(coursesToDisplay) {
    coursesContainer.innerHTML = '';
    
    if (coursesToDisplay.length === 0) {
        coursesContainer.innerHTML = '<p class="no-courses">No courses found.</p>';
        return;
    }
    
    coursesToDisplay.forEach(course => {
        const courseCard = document.createElement('div');
        courseCard.className = 'course-card';
        
        courseCard.innerHTML = `
            <h3>${course.name} (${course.code})</h3>
            <p><strong>Category:</strong> ${course.category}</p>
            <p>${course.description}</p>
            <p><strong>Prerequisites:</strong> ${course.prerequisites.join(', ')}</p>
            <p><strong>Status:</strong> ${course.status}</p>
            
            <div class="classes">
                <h4>Available Classes:</h4>
                ${course.classes.map(cls => `
                    <div class="class-info">
                        <p><strong>Class ID:</strong> ${cls.classId}</p>
                        <p><strong>Instructor:</strong> ${cls.instructor}</p>
                        <p><strong>Schedule:</strong> ${cls.schedule}</p>
                        <p><strong>Available spots:</strong> ${cls.capacity - cls.registeredStudents.length}</p>
                    </div>
                `).join('')}
            </div>
        `;
        
        coursesContainer.appendChild(courseCard);
    });
}

// Handle search
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (!searchTerm) {
        displayCourses(courses);
        return;
    }
    
    const filteredCourses = courses.filter(course => 
        course.name.toLowerCase().includes(searchTerm) || 
        course.category.toLowerCase().includes(searchTerm)
    );
    
    displayCourses(filteredCourses);
}

// Reset course display
function resetCourseDisplay() {
    searchInput.value = '';
    displayCourses(courses);
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);