# Skincare Web Application - Complete Project Summary

## 1. PROJECT OVERVIEW

### Application Type
Modern, personalized skincare web application with AI-powered skin analysis, real-time weather integration, and comprehensive user/admin management.

### Core Purpose
- Provide personalized skin analysis through AI
- Offer treatment guidance based on skin conditions
- Integrate real-time weather data for environmental skincare recommendations
- Track user progress and assessment history
- Provide AI chat assistant for personalized advice
- Full admin panel for system management

---

## 2. USER ROLES & PERMISSIONS

### 2.1 User Role (Default)
- Access to assessment flow
- View personal profile and history
- Chat with AI assistant
- Contact support
- View weather-based recommendations

### 2.2 Admin Role
- All user permissions PLUS:
- Full user management (view, edit, ban, delete)
- System analytics and reports
- Dashboard oversight
- Export functionality

---

## 3. AUTHENTICATION SYSTEM

### 3.1 Authentication Features
- **User Registration**
  - Name, email, password
  - Email validation
  - Password strength requirements
  - Default role: 'user'
  - Account creation timestamp

- **User Login**
  - Email and password authentication
  - Session management
  - "Remember me" functionality
  - JWT token generation

- **Forgot Password**
  - Email-based password reset
  - Reset token generation
  - Token expiration (24 hours)
  - Email notification

- **Reset Password**
  - Token validation
  - New password setting
  - Password confirmation
  - Token invalidation after use

### 3.2 Session Management
- JWT token-based authentication
- Token storage (localStorage/cookies)
- Auto-logout on token expiration
- Persistent login state
- Protected route management

---

## 4. USER FEATURES & FLOWS

### 4.1 Home Page
**Purpose:** Landing page explaining the application

**Features:**
- Hero section with value proposition
- "How It Works" section (3 steps):
  1. Take Assessment
  2. Get AI Analysis
  3. Follow Treatment Plan
- Features showcase
- Call-to-action buttons
- Navigation to assessment

### 4.2 User Dashboard
**Purpose:** Central navigation hub after login

**Features:**
- Quick access to:
  - New Assessment
  - View History
  - Profile Settings
  - AI Chat Assistant
- Recent assessment summary
- Weather widget showing current conditions
- UV index alerts
- Quick stats display

### 4.3 Assessment Flow (Multi-Step Process)

#### Step 1: Questionnaire Screen
**Data Collected:**
- Skin type (Oily, Dry, Combination, Normal, Sensitive)
- Current skin concerns (multiple selection):
  - Acne
  - Dark spots
  - Wrinkles
  - Dryness
  - Redness
  - Large pores
  - Uneven texture
- Age range
- Current skincare routine
- Allergies/sensitivities
- Sun exposure frequency
- Climate/location

**Progress Indicator:** Step 1 of 3

#### Step 2: Photo Upload Screen
**Features:**
- Camera capture option
- File upload option (JPEG, PNG)
- Image preview
- Retake/re-upload functionality
- Image validation (size, format)
- Progress indicator: Step 2 of 3

**Technical Requirements:**
- Image compression
- Base64 encoding
- File size limit: 5MB
- Supported formats: JPEG, PNG, HEIC

#### Step 3: Analyzing Screen
**Features:**
- AI processing animation
- Progress updates:
  - "Analyzing skin tone..."
  - "Detecting concerns..."
  - "Generating recommendations..."
- Weather data integration
- Processing time: 5-10 seconds

**AI Analysis Process:**
- Image processing
- Skin condition detection
- Concern identification
- Severity assessment
- Weather impact analysis

#### Step 4: Results Screen
**Displayed Information:**
- Overall skin health score (0-100)
- Detected skin conditions with severity:
  - Acne (severity level)
  - Hyperpigmentation
  - Fine lines
  - Texture issues
  - Redness/inflammation
- Personalized treatment recommendations
- Product suggestions
- Weather-based advice:
  - UV protection recommendations
  - Humidity-based hydration advice
  - Temperature impact on skin
- Progress to chat assistant

**Data Storage:**
- Save assessment results
- Link to user profile
- Timestamp
- Store all answers and results

### 4.4 AI Chat Assistant
**Features:**
- Conversational AI interface
- Context-aware responses
- Personalized advice based on:
  - User's assessment results
  - Skin type and concerns
  - Current weather conditions
  - Previous chat history
- Question suggestions
- Chat history persistence
- Real-time responses

**Chat Capabilities:**
- Answer skincare questions
- Provide product recommendations
- Explain assessment results
- Offer routine guidance
- Weather-related skincare tips

### 4.5 Weather Integration
**Real-time Data:**
- Current temperature
- Humidity percentage
- UV index
- Weather condition (sunny, cloudy, rainy)
- Air quality index
- Location-based data

**Weather-Based Recommendations:**
- High UV → Sunscreen emphasis
- Low humidity → Extra moisturization
- High temperature → Lightweight products
- Cold weather → Barrier protection

### 4.6 User Profile Page
**User Information Display:**
- Name
- Email
- Member since date
- Profile photo (optional)
- Role badge

**Editable Fields:**
- Name
- Email
- Password (change password)
- Profile photo upload
- Notification preferences

**Statistics Display:**
- Total assessments completed
- Account age
- Last assessment date
- Progress tracking

### 4.7 History Page
**Features:**
- Timeline of all past assessments
- Each assessment card shows:
  - Date and time
  - Skin health score
  - Main concerns detected
  - Thumbnail of uploaded photo
  - View details button
- Filter options:
  - By date range
  - By skin score
  - By concerns
- Search functionality
- Progress comparison chart
- Export history as PDF

**Data Display:**
- Chronological order (newest first)
- Score trend visualization
- Improvement indicators
- Detailed view modal

### 4.8 Contact Page
**Contact Form Fields:**
- Name
- Email
- Subject
- Message
- Category (General, Technical, Billing)

**Additional Features:**
- FAQ section
- Support email display
- Response time estimate
- Form validation
- Success confirmation

---

## 5. ADMIN FEATURES & FLOWS

### 5.1 Admin Dashboard - Overview Tab

**Statistics Cards:**
- Total Users (with growth percentage)
- Active Sessions (real-time)
- Assessments Today (with trend)
- System Health (uptime percentage)

**Recent Users List:**
- User name and email
- Status badge (Active, Pending, Inactive)
- Join date
- Number of assessments
- Quick actions (Edit, Ban, View)

**Quick Actions Panel:**
- Manage Users button
- View Analytics button
- Export Reports button

**System Alerts:**
- Database backup schedule
- API rate limit status
- Server notifications
- Security alerts

**Performance Metrics:**
- Server uptime percentage
- Response time (ms)
- Visual progress bars

### 5.2 Admin Dashboard - Users Tab

**User Management Table:**
**Columns:**
- User ID
- Name
- Email
- Role (User, Admin)
- Status (Active, Inactive, Banned)
- Join Date
- Last Active
- Assessments Count
- Actions

**Filters:**
- Search by name/email
- Filter by role
- Filter by status
- Date range filter
- Sort options (name, date, assessments)

**User Actions:**
1. **Edit User:**
   - Modify name, email
   - Change role (User ↔ Admin)
   - Update status
   - Save changes
   
2. **Ban User:**
   - Confirmation dialog
   - Reason for ban (optional)
   - Ban duration (temporary/permanent)
   - Notification to user
   
3. **Delete User:**
   - Confirmation dialog (requires double-check)
   - Cascade delete all user data:
     - Assessments
     - Chat history
     - Profile data
   - Permanent action warning
   
4. **View Details:**
   - Full user profile
   - Complete assessment history
   - Activity log
   - Chat transcripts

**Bulk Actions:**
- Select multiple users
- Bulk status change
- Bulk export
- Bulk email

**User Statistics:**
- Total users count
- Active users today
- New registrations (today/week/month)
- Banned users count

### 5.3 Admin Dashboard - Analytics Tab

**User Growth Chart:**
- Line chart showing user registrations over time
- Time ranges: 7 days, 30 days, 3 months, 1 year
- Data points: daily/weekly/monthly new users

**Assessment Analytics:**
- Bar chart: Assessments per day/week/month
- Total assessments count
- Average assessments per user
- Peak usage times

**Skin Concerns Distribution:**
- Pie chart showing percentage of each concern:
  - Acne
  - Dark spots
  - Wrinkles
  - Dryness
  - Redness
  - Other
- Total concerns detected
- Trending concerns

**Engagement Metrics:**
- Average session duration
- Pages per session
- Bounce rate
- Return user rate
- Chat usage statistics

**Geographic Distribution:**
- Map view of user locations
- Top cities/regions
- Weather impact correlation

**System Performance:**
- API response times
- Error rates
- Server load
- Database query performance

### 5.4 Admin Dashboard - Reports Tab

**Report Types:**

1. **User Activity Report**
   - User engagement metrics
   - Login frequency
   - Feature usage
   - Session data
   - Records: 2,543

2. **Assessment Summary Report**
   - Total assessments
   - Skin conditions detected
   - Average health scores
   - Treatment recommendations given
   - Records: 1,892

3. **User Growth Report**
   - Registration trends
   - Growth rate analysis
   - User retention
   - Churn rate
   - Records: 2,543

4. **Skin Conditions Analysis**
   - Condition frequency
   - Severity distribution
   - Age group correlations
   - Seasonal trends
   - Records: 4,521

5. **User Demographics**
   - Age distribution
   - Geographic data
   - Skin type breakdown
   - Gender distribution (if collected)
   - Records: 2,543

6. **Engagement Metrics Report**
   - Session analytics
   - Feature adoption
   - Chat usage
   - Return rate
   - Records: 8,934

**Report Configuration:**
- Select report type
- Date range selection (from/to)
- Export format options:
  - PDF Document
  - Excel Spreadsheet
  - CSV File
  - JSON Data
- Generate button
- Export button

**Recent Exports List:**
- Report name
- Export date
- File format
- File size
- Download button
- Quick re-export

**Quick Stats:**
- Reports generated (total)
- Last export timestamp
- Total records available

---

## 6. DATABASE REQUIREMENTS

### 6.1 Users Table
**Fields:**
- `id` (UUID, Primary Key)
- `name` (String, Required)
- `email` (String, Required, Unique)
- `password` (String, Hashed, Required)
- `role` (Enum: 'user', 'admin', Default: 'user')
- `status` (Enum: 'active', 'inactive', 'banned', Default: 'active')
- `profile_photo` (String, URL, Optional)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)
- `last_login` (Timestamp)
- `email_verified` (Boolean, Default: false)

**Indexes:**
- email (unique)
- role
- status
- created_at

### 6.2 Assessments Table
**Fields:**
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → Users)
- `assessment_date` (Timestamp)
- `skin_health_score` (Integer, 0-100)
- `photo_url` (String, URL)
- `status` (Enum: 'pending', 'completed', 'failed')
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

**Relationships:**
- Many-to-One with Users
- One-to-One with QuestionnaireResponses
- One-to-Many with DetectedConditions
- One-to-Many with Recommendations

**Indexes:**
- user_id
- assessment_date
- skin_health_score

### 6.3 Questionnaire_Responses Table
**Fields:**
- `id` (UUID, Primary Key)
- `assessment_id` (UUID, Foreign Key → Assessments)
- `skin_type` (Enum: 'oily', 'dry', 'combination', 'normal', 'sensitive')
- `concerns` (JSON Array: ['acne', 'dark_spots', 'wrinkles', etc.])
- `age_range` (String: '18-25', '26-35', etc.)
- `current_routine` (Text)
- `allergies` (Text, Optional)
- `sun_exposure` (Enum: 'low', 'medium', 'high')
- `location` (String)
- `created_at` (Timestamp)

**Relationships:**
- One-to-One with Assessments

### 6.4 Detected_Conditions Table
**Fields:**
- `id` (UUID, Primary Key)
- `assessment_id` (UUID, Foreign Key → Assessments)
- `condition_type` (String: 'acne', 'hyperpigmentation', 'wrinkles', etc.)
- `severity` (Enum: 'mild', 'moderate', 'severe')
- `confidence_score` (Float, 0-1)
- `location_on_face` (String: 'forehead', 'cheeks', 'chin', etc.)
- `created_at` (Timestamp)

**Relationships:**
- Many-to-One with Assessments

**Indexes:**
- assessment_id
- condition_type
- severity

### 6.5 Recommendations Table
**Fields:**
- `id` (UUID, Primary Key)
- `assessment_id` (UUID, Foreign Key → Assessments)
- `recommendation_type` (Enum: 'product', 'routine', 'lifestyle')
- `title` (String)
- `description` (Text)
- `priority` (Enum: 'high', 'medium', 'low')
- `category` (String: 'moisturizer', 'cleanser', 'treatment', etc.)
- `created_at` (Timestamp)

**Relationships:**
- Many-to-One with Assessments

### 6.6 Chat_Sessions Table
**Fields:**
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → Users)
- `assessment_id` (UUID, Foreign Key → Assessments, Optional)
- `started_at` (Timestamp)
- `ended_at` (Timestamp, Optional)
- `total_messages` (Integer)
- `status` (Enum: 'active', 'closed')

**Relationships:**
- Many-to-One with Users
- One-to-Many with ChatMessages

**Indexes:**
- user_id
- assessment_id
- started_at

### 6.7 Chat_Messages Table
**Fields:**
- `id` (UUID, Primary Key)
- `session_id` (UUID, Foreign Key → Chat_Sessions)
- `sender` (Enum: 'user', 'ai')
- `message` (Text)
- `timestamp` (Timestamp)
- `context_data` (JSON, Optional - assessment results, weather data)

**Relationships:**
- Many-to-One with Chat_Sessions

**Indexes:**
- session_id
- timestamp

### 6.8 Weather_Data Table
**Fields:**
- `id` (UUID, Primary Key)
- `assessment_id` (UUID, Foreign Key → Assessments)
- `location` (String)
- `temperature` (Float)
- `humidity` (Float)
- `uv_index` (Integer)
- `condition` (String: 'sunny', 'cloudy', 'rainy', etc.)
- `air_quality_index` (Integer, Optional)
- `fetched_at` (Timestamp)

**Relationships:**
- One-to-One with Assessments

**Indexes:**
- assessment_id
- location
- fetched_at

### 6.9 Password_Reset_Tokens Table
**Fields:**
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → Users)
- `token` (String, Unique)
- `expires_at` (Timestamp)
- `used` (Boolean, Default: false)
- `created_at` (Timestamp)

**Relationships:**
- Many-to-One with Users

**Indexes:**
- token (unique)
- user_id
- expires_at

### 6.10 Contact_Submissions Table
**Fields:**
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → Users, Optional)
- `name` (String)
- `email` (String)
- `subject` (String)
- `category` (Enum: 'general', 'technical', 'billing')
- `message` (Text)
- `status` (Enum: 'new', 'in_progress', 'resolved')
- `admin_response` (Text, Optional)
- `created_at` (Timestamp)
- `resolved_at` (Timestamp, Optional)

**Indexes:**
- user_id
- status
- created_at

### 6.11 Admin_Activity_Logs Table
**Fields:**
- `id` (UUID, Primary Key)
- `admin_id` (UUID, Foreign Key → Users)
- `action_type` (Enum: 'user_edit', 'user_ban', 'user_delete', 'report_export', etc.)
- `target_user_id` (UUID, Foreign Key → Users, Optional)
- `description` (Text)
- `metadata` (JSON - additional context)
- `ip_address` (String)
- `timestamp` (Timestamp)

**Relationships:**
- Many-to-One with Users (admin)

**Indexes:**
- admin_id
- action_type
- timestamp

### 6.12 System_Settings Table
**Fields:**
- `id` (UUID, Primary Key)
- `key` (String, Unique)
- `value` (JSON)
- `description` (Text)
- `updated_by` (UUID, Foreign Key → Users)
- `updated_at` (Timestamp)

---

## 7. API ENDPOINTS REQUIRED

### 7.1 Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/verify-token` - Verify reset token validity
- `GET /api/auth/me` - Get current user info

### 7.2 User Endpoints
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/password` - Change password
- `POST /api/users/upload-photo` - Upload profile photo
- `GET /api/users/stats` - Get user statistics

### 7.3 Assessment Endpoints
- `POST /api/assessments/create` - Create new assessment
- `POST /api/assessments/:id/questionnaire` - Submit questionnaire
- `POST /api/assessments/:id/upload-photo` - Upload skin photo
- `POST /api/assessments/:id/analyze` - Trigger AI analysis
- `GET /api/assessments/:id/results` - Get assessment results
- `GET /api/assessments/history` - Get user's assessment history
- `GET /api/assessments/:id/details` - Get specific assessment details
- `DELETE /api/assessments/:id` - Delete assessment

### 7.4 Chat Endpoints
- `POST /api/chat/sessions` - Create new chat session
- `GET /api/chat/sessions/:id` - Get chat session
- `POST /api/chat/sessions/:id/messages` - Send message
- `GET /api/chat/sessions/:id/messages` - Get chat history
- `PUT /api/chat/sessions/:id/close` - Close chat session

### 7.5 Weather Endpoints
- `GET /api/weather/current` - Get current weather for location
- `GET /api/weather/recommendations` - Get weather-based skincare advice

### 7.6 Contact Endpoints
- `POST /api/contact/submit` - Submit contact form
- `GET /api/contact/submissions` - Get user's submissions (admin only)

### 7.7 Admin - User Management Endpoints
- `GET /api/admin/users` - Get all users (paginated, filterable)
- `GET /api/admin/users/:id` - Get specific user details
- `PUT /api/admin/users/:id` - Update user (edit)
- `PUT /api/admin/users/:id/ban` - Ban user
- `PUT /api/admin/users/:id/unban` - Unban user
- `DELETE /api/admin/users/:id` - Delete user
- `PUT /api/admin/users/:id/role` - Change user role
- `POST /api/admin/users/bulk-action` - Bulk user actions

### 7.8 Admin - Analytics Endpoints
- `GET /api/admin/analytics/overview` - Dashboard overview stats
- `GET /api/admin/analytics/user-growth` - User growth data
- `GET /api/admin/analytics/assessments` - Assessment analytics
- `GET /api/admin/analytics/skin-concerns` - Skin concern distribution
- `GET /api/admin/analytics/engagement` - Engagement metrics
- `GET /api/admin/analytics/geographic` - Geographic distribution
- `GET /api/admin/analytics/performance` - System performance

### 7.9 Admin - Reports Endpoints
- `POST /api/admin/reports/generate` - Generate report
- `POST /api/admin/reports/export` - Export report (PDF/Excel/CSV/JSON)
- `GET /api/admin/reports/list` - Get available report types
- `GET /api/admin/reports/history` - Get export history
- `GET /api/admin/reports/:id/download` - Download exported report

### 7.10 Admin - Activity Log Endpoints
- `GET /api/admin/activity-logs` - Get admin activity logs
- `POST /api/admin/activity-logs` - Create activity log entry

---

## 8. USER JOURNEY FLOWS

### 8.1 New User Registration Flow
1. User visits home page
2. Clicks "Sign Up" / "Register"
3. Fills registration form (name, email, password)
4. Submits form
5. System validates data
6. Creates user account (role: 'user', status: 'active')
7. Sends welcome email (optional)
8. Auto-login user
9. Redirects to dashboard

**Database Operations:**
- INSERT into Users table
- Generate JWT token
- Create session

### 8.2 User Login Flow
1. User visits login page
2. Enters email and password
3. Submits form
4. System validates credentials
5. Checks user status (not banned)
6. Generates JWT token
7. Updates last_login timestamp
8. Redirects based on role:
   - Admin → Admin Dashboard
   - User → User Dashboard

**Database Operations:**
- SELECT from Users (email match)
- Verify password hash
- UPDATE last_login
- Create session

### 8.3 Complete Assessment Flow
1. User clicks "Take Assessment" from dashboard
2. **Questionnaire Screen:**
   - Fills out skin type, concerns, age, routine, allergies, sun exposure
   - Clicks "Next"
   - System validates responses
   - Creates Assessment record (status: 'pending')
   - Saves questionnaire responses

3. **Upload Photo Screen:**
   - User uploads/captures photo
   - System validates image (format, size)
   - Uploads to storage (S3/Cloud Storage)
   - Saves photo_url to assessment
   - Clicks "Analyze"

4. **Analyzing Screen:**
   - System fetches weather data for user location
   - Calls AI API for image analysis
   - AI detects skin conditions
   - Calculates severity scores
   - Generates recommendations
   - Saves all data (conditions, recommendations, weather)
   - Updates assessment status to 'completed'

5. **Results Screen:**
   - Displays skin health score
   - Shows detected conditions with severity
   - Lists personalized recommendations
   - Shows weather-based advice
   - Option to start chat or return to dashboard

**Database Operations:**
- INSERT into Assessments
- INSERT into Questionnaire_Responses
- INSERT into Weather_Data
- INSERT multiple into Detected_Conditions
- INSERT multiple into Recommendations
- UPDATE Assessments (status, score)

### 8.4 AI Chat Flow
1. User clicks "Chat Assistant" from dashboard or results
2. System creates new Chat_Session
3. Loads context:
   - User's latest assessment results
   - Current weather data
   - User's skin type and concerns
4. User types message
5. System sends to AI with context
6. AI generates personalized response
7. Both messages saved to Chat_Messages
8. Conversation continues
9. User closes chat → session marked as closed

**Database Operations:**
- INSERT into Chat_Sessions
- INSERT into Chat_Messages (for each message)
- SELECT latest assessment data
- SELECT weather data
- UPDATE Chat_Sessions (ended_at, status)

### 8.5 View History Flow
1. User navigates to History page
2. System fetches all user's assessments
3. Joins with detected conditions and scores
4. Displays chronologically
5. User can:
   - Filter by date range
   - Search by concerns
   - Click to view details
6. Detail view shows:
   - Complete assessment data
   - Photo
   - All detected conditions
   - Recommendations given
   - Weather at time of assessment

**Database Operations:**
- SELECT from Assessments WHERE user_id
- JOIN with Detected_Conditions
- JOIN with Recommendations
- JOIN with Weather_Data
- ORDER BY assessment_date DESC

### 8.6 Password Reset Flow
1. User clicks "Forgot Password" on login page
2. Enters email address
3. System checks if email exists
4. Generates unique reset token
5. Sets expiration (24 hours)
6. Sends email with reset link
7. User clicks link in email
8. System validates token (not expired, not used)
9. User enters new password
10. System updates password
11. Marks token as used
12. Auto-login user

**Database Operations:**
- SELECT from Users (email match)
- INSERT into Password_Reset_Tokens
- UPDATE Users (password)
- UPDATE Password_Reset_Tokens (used = true)

### 8.7 Admin User Management Flow
1. Admin logs in → redirected to Admin Dashboard
2. Clicks "Users" tab
3. System fetches all users (paginated)
4. Admin can:
   
   **Edit User:**
   - Clicks edit icon
   - Modal opens with user data
   - Modifies fields (name, email, role)
   - Clicks save
   - System updates user record
   - Logs action in Admin_Activity_Logs
   
   **Ban User:**
   - Clicks ban icon
   - Confirmation dialog appears
   - Admin confirms
   - System updates user status to 'banned'
   - User cannot login
   - Logs action
   
   **Delete User:**
   - Clicks delete icon
   - Double confirmation required
   - System cascade deletes:
     - All assessments
     - All chat sessions and messages
     - All detected conditions
     - All recommendations
   - Deletes user record
   - Logs action

**Database Operations:**
- SELECT all from Users with pagination
- UPDATE Users (for edit/ban)
- DELETE from Users (cascade to related tables)
- INSERT into Admin_Activity_Logs

### 8.8 Admin Generate Report Flow
1. Admin clicks "Reports" tab
2. Selects report type from list
3. Configures parameters:
   - Date range (from/to)
   - Export format (PDF/Excel/CSV/JSON)
4. Clicks "Generate Report"
5. System queries relevant data:
   - User Activity → Users, Assessments, Chat_Sessions
   - Assessment Summary → Assessments, Detected_Conditions
   - Skin Conditions → Detected_Conditions aggregated
   - Demographics → Users, Questionnaire_Responses
6. Processes and aggregates data
7. Generates report file
8. Saves to Reports table
9. Provides download link
10. Shows in "Recent Exports"

**Database Operations:**
- Complex SELECT queries with aggregations
- JOIN multiple tables
- GROUP BY, COUNT, AVG operations
- INSERT into Reports table (metadata)
- File generation and storage

---

## 9. TECHNICAL STACK

### Frontend
- React 18+
- React Router (for navigation)
- Tailwind CSS v4 (styling)
- Motion (formerly Framer Motion) for animations
- Lucide React (icons)
- Recharts (charts/analytics)
- Sonner (toast notifications)
- Shadcn/ui components

### Backend Requirements
- RESTful API
- JWT authentication
- File upload handling
- Image processing
- AI/ML integration for skin analysis
- Email service (password reset, notifications)
- Weather API integration

### Database
- PostgreSQL or MySQL (relational)
- Support for JSON fields
- Full-text search capability
- Indexing for performance

### External Services
- Cloud storage (AWS S3, Cloudinary) for images
- AI/ML API for skin analysis
- Weather API (OpenWeatherMap, WeatherAPI)
- Email service (SendGrid, AWS SES)

### Security Requirements
- Password hashing (bcrypt)
- JWT token management
- HTTPS only
- CORS configuration
- Rate limiting
- Input validation and sanitization
- SQL injection prevention
- XSS protection

---

## 10. DATA RELATIONSHIPS SUMMARY

### User-Centric Relationships
```
User (1) ─── has many ───> (N) Assessments
User (1) ─── has many ───> (N) Chat_Sessions
User (1) ─── has many ───> (N) Password_Reset_Tokens
User (1) ─── has many ───> (N) Contact_Submissions
User (1) ─── has many ───> (N) Admin_Activity_Logs (as admin)
User (1) ─── has many ───> (N) Admin_Activity_Logs (as target)
```

### Assessment-Centric Relationships
```
Assessment (1) ─── has one ───> (1) Questionnaire_Response
Assessment (1) ─── has many ───> (N) Detected_Conditions
Assessment (1) ─── has many ───> (N) Recommendations
Assessment (1) ─── has one ───> (1) Weather_Data
Assessment (1) ─── referenced by ───> (N) Chat_Sessions
```

### Chat-Centric Relationships
```
Chat_Session (1) ─── has many ───> (N) Chat_Messages
Chat_Session (N) ─── belongs to ───> (1) User
Chat_Session (N) ─── references ───> (1) Assessment (optional)
```

---

## 11. KEY BUSINESS RULES

### User Management
- Default role is 'user' on registration
- Only admins can change roles
- Banned users cannot login
- Deleted users cascade delete all related data
- Email must be unique

### Assessment Rules
- User must be logged in to take assessment
- Photo is required for analysis
- Questionnaire must be completed before photo upload
- Assessment expires after 30 days (optional retention policy)
- Health score range: 0-100

### Chat Rules
- Chat requires active assessment context
- Session auto-closes after 30 minutes inactivity
- Messages are persistent
- AI responses use latest assessment data

### Admin Rules
- Only users with role 'admin' can access admin panel
- All admin actions are logged
- Admins cannot delete themselves
- Role changes require confirmation

### Weather Integration
- Weather data cached for 1 hour per location
- UV recommendations: >7 = high protection needed
- Humidity recommendations: <30% = extra hydration

### Report Rules
- Date range cannot exceed 1 year
- Export files expire after 7 days
- Maximum file size: 50MB
- Formats: PDF, Excel, CSV, JSON

---

## 12. PERFORMANCE REQUIREMENTS

- Page load time: < 2 seconds
- API response time: < 500ms
- Image upload: Support up to 5MB
- AI analysis: Complete within 10 seconds
- Concurrent users: Support 1000+ simultaneous
- Database queries: < 100ms for standard queries
- Real-time chat: < 1 second message delivery

---

## 13. SECURITY REQUIREMENTS

### Authentication
- Minimum password length: 8 characters
- Password must contain: uppercase, lowercase, number
- Account lockout after 5 failed attempts
- Session timeout: 24 hours
- JWT token expiration: 24 hours

### Data Protection
- All passwords hashed with bcrypt (10+ rounds)
- Sensitive data encrypted at rest
- HTTPS required for all communications
- API rate limiting: 100 requests/minute per user
- Admin actions require re-authentication

### Privacy
- User data not shared with third parties
- GDPR compliance (data export, deletion)
- Photo data stored securely
- Chat data encrypted

---

## 14. NOTIFICATION REQUIREMENTS

### Email Notifications
- Welcome email on registration
- Password reset link
- Assessment completion
- Weekly summary (optional)
- Account status changes (ban/unban)

### In-App Notifications
- New assessment results ready
- Chat message received
- Admin actions (for affected users)
- System maintenance alerts

---

## 15. EXPORT & BACKUP REQUIREMENTS

### User Data Export
- Users can export their data (GDPR)
- Includes: profile, assessments, chat history
- Format: JSON or PDF

### Admin Exports
- User list: CSV, Excel
- Reports: PDF, Excel, CSV, JSON
- Analytics: Excel with charts

### Backup Strategy
- Daily database backups
- User photos backed up to cloud storage
- Backup retention: 30 days
- Point-in-time recovery capability

---

## 16. SCALABILITY CONSIDERATIONS

- Horizontal scaling for API servers
- Database read replicas for analytics
- CDN for static assets and images
- Caching layer (Redis) for frequently accessed data
- Queue system for AI processing jobs
- Microservices architecture potential:
  - Auth service
  - Assessment service
  - Chat service
  - Weather service
  - Admin service

---

## END OF SUMMARY

This document provides complete requirements for:
1. **Database Schema Design** - All tables, fields, relationships, indexes
2. **Sequence Diagrams** - All user and admin flows with database operations
3. **ER Diagrams** - Entity relationships and cardinality
4. **API Design** - Complete endpoint list
5. **Business Logic** - Rules and validations

Use this document to generate comprehensive database and sequence diagrams for the skincare application.
