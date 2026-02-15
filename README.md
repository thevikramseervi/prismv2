# Attend Ease - Automated Attendance & Payroll System

A comprehensive full-stack web application for automating attendance tracking, leave management, and payroll processing.

## 🚀 Tech Stack

### Backend
- **Framework**: NestJS v11
- **Database**: PostgreSQL 16
- **ORM**: Prisma v5.22.0
- **Authentication**: JWT with Passport
- **API Documentation**: Swagger
- **PDF Generation**: PDFKit
- **Excel Generation**: ExcelJS
- **Scheduling**: @nestjs/schedule (for cron jobs)

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI) v7
- **Routing**: React Router v7
- **State Management**: TanStack Query (React Query) v5
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios
- **Date Handling**: Day.js
- **Data Grid**: MUI X Data Grid
- **Excel Export**: ExcelJS

## 📋 Features

### Employee Features
- ✅ **Dashboard** - Overview with attendance stats, leave balance, and announcements
- ✅ **Attendance Tracking** - View daily attendance records with status
- ✅ **Leave Management** - Apply for leave, view application history
- ✅ **Salary Slips** - View and download salary slips (PDF/Excel)
- ✅ **Announcements** - View company announcements

### Admin Features (Lab Admin & Super Admin)
- ✅ **User Management** - CRUD operations for employees
- ✅ **Leave Approval** - Approve/reject leave applications
- ✅ **Holiday Calendar** - Manage company holidays
- ✅ **Payroll Generation** - Generate salary slips (bulk/individual)
- ✅ **Biometric Sync** - Manually sync biometric data to attendance
- ✅ **Reports & Analytics** - Generate attendance, leave, and payroll reports with Excel export

### System Features
- ✅ **Role-Based Access Control** - Employee, Lab Admin, Super Admin
- ✅ **JWT Authentication** - Secure token-based authentication
- ✅ **Biometric Integration** - Process biometric logs into attendance
- ✅ **Automatic Calculations** - Working days, pay days, salary computation
- ✅ **Weekend & Holiday Detection** - Automatic marking
- ✅ **Leave Balance Tracking** - 12 casual leaves per year
- ✅ **Salary Slip Generation** - Professional PDF & Excel formats

## 🎯 Business Logic

### Attendance Rules
- **Full Day (Present)**: ≥8 hours worked
- **Half Day**: 4-8 hours worked
- **Absent (LOP)**: <4 hours worked
- **Weekends**: Saturday & Sunday (automatically marked)
- **Holidays**: Company holidays (configurable)
- **Casual Leave**: Approved leave applications

### Salary Calculation
```
Total Pay Days = Present Days + Casual Leave Days + (Half Days × 0.5)
Net Salary = (Total Pay Days / Working Days) × Base Salary
Working Days = Total Days - Weekends - Holidays
```

### Leave Management
- **Total Annual Leave**: 12 days per employee
- **Leave Types**: Casual Leave only (no half-day leaves)
- **Approval Required**: Lab Admin or Super Admin
- **Balance Tracking**: Available, Used, and Pending leaves
- **Overlapping Prevention**: System checks for conflicting dates

## 📁 Project Structure

```
attend-ease/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema
│   │   └── seed.ts                # Initial data seeding
│   ├── src/
│   │   ├── auth/                  # Authentication module
│   │   ├── users/                 # User management
│   │   ├── attendance/            # Attendance tracking
│   │   ├── leave/                 # Leave management
│   │   ├── payroll/               # Payroll & salary slips
│   │   ├── holidays/              # Holiday management
│   │   ├── announcements/         # Announcements system
│   │   ├── biometric/             # Biometric sync service
│   │   ├── prisma/                # Prisma service
│   │   └── main.ts               # Application entry point
│   ├── .env                       # Environment variables
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── api/                   # API client services
    │   ├── components/            # Reusable components
    │   ├── contexts/              # React contexts (Auth)
    │   ├── layouts/               # Layout components
    │   ├── pages/                 # Page components
    │   ├── types/                 # TypeScript types
    │   ├── App.tsx               # Main app component
    │   └── main.tsx              # Application entry point
    ├── vite.config.ts            # Vite configuration
    └── package.json
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js v18+ 
- PostgreSQL 16
- npm or yarn

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create `.env` file with:
   ```env
   DATABASE_URL="postgresql://seed:YOUR_PASSWORD@localhost:5432/attendease?schema=public"
   JWT_SECRET="your-super-secret-jwt-key"
   JWT_EXPIRATION="7d"
   PORT=3000
   NODE_ENV="development"
   ```

4. **Setup database**
   ```bash
   # Generate Prisma client
   npm run prisma:generate
   
   # Run migrations
   npm run prisma:migrate
   
   # Seed initial data
   npm run prisma:seed
   ```

5. **Start backend server**
   ```bash
   npm run start:dev
   ```
   Server runs at: http://localhost:3000
   API Docs: http://localhost:3000/api/docs

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start frontend dev server**
   ```bash
   npm run dev
   ```
   App runs at: http://localhost:5173

## 🔐 Default Credentials

After running the seed script:

```
Email: admin@cambridge.edu.in
Password: admin123
Role: Super Admin
```

## 📊 Database Schema

### Main Tables
- **users** - Employee information and credentials
- **attendance** - Daily attendance records
- **biometric_logs** - Raw biometric data
- **leave_applications** - Leave requests
- **leave_balance** - Annual leave balance per user
- **payroll** - Monthly salary records
- **holidays** - Company holidays
- **announcements** - System announcements
- **announcement_reads** - Announcement read tracking

### User Roles
- **EMPLOYEE** - Regular employee
- **LAB_ADMIN** - Can approve leaves, manage users
- **SUPER_ADMIN** - Full system access

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PATCH /api/auth/me/password` - Change password (authenticated)
- `POST /api/auth/logout` - User logout

### Attendance
- `GET /api/attendance/my-attendance` - Get my attendance
- `GET /api/attendance/monthly/:year/:month` - Monthly attendance
- `GET /api/attendance/dashboard` - Dashboard stats
- `POST /api/attendance/manual` - Manual attendance entry (Admin)

### Leave
- `POST /api/leave/apply` - Apply for leave
- `GET /api/leave/my-applications` - My leave applications
- `GET /api/leave/balance` - My leave balance
- `GET /api/leave/pending` - Pending applications (Admin)
- `PATCH /api/leave/:id/approve` - Approve leave (Admin)
- `PATCH /api/leave/:id/reject` - Reject leave (Admin)

### Payroll
- `POST /api/payroll/generate` - Generate payroll (Admin)
- `GET /api/payroll` - Get all payroll (Admin, optional year/month/userId)
- `GET /api/payroll/my-salary-slips` - My salary slips
- `GET /api/payroll/:id` - Get payroll by ID
- `PATCH /api/payroll/:id/mark-paid` - Mark as paid (Super Admin)
- `GET /api/payroll/:id/download/pdf` - Download PDF
- `GET /api/payroll/:id/download/xlsx` - Download Excel

### Users (Admin only)
- `GET /api/users` - Get all users (paginated)
- `POST /api/users` - Create user
- `PATCH /api/users/:id` - Update user
- `PATCH /api/users/:id/activate` - Activate user
- `PATCH /api/users/:id/deactivate` - Deactivate user

### Holidays (Admin only)
- `GET /api/holidays` - Get all holidays
- `POST /api/holidays` - Create holiday
- `PATCH /api/holidays/:id` - Update holiday
- `DELETE /api/holidays/:id` - Delete holiday

### Announcements
- `GET /api/announcements` - Get my announcements
- `POST /api/announcements` - Create announcement (Admin)
- `POST /api/announcements/:id/mark-read` - Mark as read
- `GET /api/announcements/unread-count` - Unread count

### Biometric (Admin only)
- `POST /api/biometric/sync?date=YYYY-MM-DD` - Manual sync
- `GET /api/biometric/unprocessed` - Unprocessed logs

## 📈 Reports Module

The Reports page provides comprehensive analytics with Excel export:

### Attendance Report
- Filter by date range and employee
- Summary: Present, Absent, Half-day, Leave counts
- Detailed table with status, in/out times, duration
- Export to Excel

### Leave Report  
- All leave applications with status
- Summary: Pending, Approved, Rejected, Cancelled
- Export to Excel

### Payroll Report
- Filter by month, year, and employee
- Summary: Total gross, net salary, payment status
- Detailed breakdown by employee
- Export to Excel

## 🔄 Biometric Integration

### How It Works
1. Biometric device captures employee in/out times
2. Data is stored in `biometric_logs` table
3. Admin triggers manual sync or scheduled job runs
4. System processes logs:
   - Calculates total duration per day
   - Determines attendance status based on hours
   - Creates/updates attendance records
   - Marks logs as processed

### Manual Sync
- Navigate to **Admin Panel**
- Select date to sync
- Click "Sync Biometric Data"
- System processes all unprocessed logs for that date

## 💼 Payroll Generation

### Steps
1. Navigate to **Admin Panel**
2. Select Month/Year
3. Choose employee (or select "All Employees")
4. Click "Generate Payroll"
5. System calculates:
   - Working days (excludes weekends & holidays)
   - Attendance days from records
   - Salary based on formula
6. Generates salary slips for download

### Salary Slip Features
- Professional PDF format
- Excel format with formulas
- Includes: Employee details, attendance summary, salary breakdown
- Downloadable from "Salary Slips" page

## 🎨 UI Features

- **Landing Page** - Public landing with sign-in; app when authenticated
- **Theme** - Light/dark mode toggle (persisted)
- **Responsive Design** - Works on desktop, tablet, mobile
- **Material Design** - Modern, consistent UI (MUI v7)
- **Role-Based Navigation** - Menu items based on user role
- **Loading States** - Smooth loading indicators
- **Error Handling** - User-friendly error messages
- **Success Notifications** - Snackbar alerts
- **Data Grid** - Sortable, paginated tables
- **Form Validation** - Real-time validation
- **Protected Routes** - Automatic redirection
- **Change Password** - In-app change password (user menu)

## 🔒 Security

- JWT token-based authentication
- Password hashing with bcrypt
- Role-based access control
- Protected API routes with guards
- SQL injection prevention (Prisma ORM)
- XSS protection
- CORS configuration

## 📥 Data Migration

The system includes scripts to import historical data from Excel files.

### Quick Start

1. **Create sample Excel templates:**
   ```bash
   cd backend
   npm run migrate:create-samples
   ```

2. **Prepare your data** using the sample templates in `backend/data/`

3. **Import data:**
   ```bash
   # Import all data at once
   npm run migrate:all
   
   # Or import individually
   npm run migrate:users data/employees.xlsx
   npm run migrate:attendance data/attendance.xlsx
   npm run migrate:biometric data/biometric.xlsx
   ```

### Migration Scripts

- `npm run migrate:create-samples` - Create sample Excel templates
- `npm run migrate:users <file>` - Import employees/users
- `npm run migrate:attendance <file>` - Import attendance records
- `npm run migrate:biometric <file>` - Import biometric logs
- `npm run migrate:all` - Import all data from data/ directory

See [DATA_MIGRATION_GUIDE.md](backend/DATA_MIGRATION_GUIDE.md) for detailed instructions.

---

## 🚧 Future Enhancements

- [ ] Automated biometric sync (scheduled jobs)
- [ ] Monthly payroll auto-generation
- [ ] Email notifications for leave approvals
- [ ] Attendance regularization requests
- [ ] Mobile app
- [ ] Advanced analytics & charts
- [ ] Performance reviews integration
- [ ] Shift management
- [ ] Overtime tracking

## 📝 Notes

- Base salary for all employees: ₹22,000
- Casual leave quota: 12 days per year
- No half-day casual leave
- Weekends: Saturday & Sunday
- Working hours: 8 hours = full day

## 🐛 Troubleshooting

### Backend won't start
- Check PostgreSQL is running
- Verify DATABASE_URL in .env
- Run `npm run prisma:generate`

### Frontend won't start
- Check backend is running on port 3000
- Verify all dependencies installed
- Clear node_modules and reinstall

### Can't login
- Use default credentials: admin@cambridge.edu.in / admin123
- Check backend console for errors
- Verify JWT_SECRET is set

## 📄 License

This project is private and proprietary.

## 👥 Support

For issues or questions, contact the development team.

---

**Built with ❤️ for automated attendance & payroll management**
