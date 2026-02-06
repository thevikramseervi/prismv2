import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

function createSampleExcelFiles() {
  console.log('📝 Creating sample Excel templates...\n');

  const dataDir = path.join(__dirname, '../data');

  // Create data directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // 1. Sample Users/Employees Excel
  const employeesData = [
    {
      'Employee ID': 'CITANN001',
      'Employee Number': 101,
      'Name': 'John Doe',
      'Email': 'john.doe@company.com',
      'Designation': 'Annotator',
      'Date of Joining': '2024-01-15',
      'Base Salary': 22000,
      'Role': 'EMPLOYEE',
    },
    {
      'Employee ID': 'CITANN002',
      'Employee Number': 102,
      'Name': 'Jane Smith',
      'Email': 'jane.smith@company.com',
      'Designation': 'Senior Annotator',
      'Date of Joining': '2024-02-01',
      'Base Salary': 25000,
      'Role': 'EMPLOYEE',
    },
    {
      'Employee ID': 'CITADM001',
      'Employee Number': 103,
      'Name': 'Mike Johnson',
      'Email': 'mike.johnson@company.com',
      'Designation': 'Lab Manager',
      'Date of Joining': '2023-12-01',
      'Base Salary': 35000,
      'Role': 'LAB_ADMIN',
    },
  ];

  const employeesWS = XLSX.utils.json_to_sheet(employeesData);
  const employeesWB = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(employeesWB, employeesWS, 'Employees');
  XLSX.writeFile(employeesWB, path.join(dataDir, 'sample_employees.xlsx'));
  console.log('✅ Created: data/sample_employees.xlsx');

  // 2. Sample Attendance Excel
  const attendanceData = [
    {
      'Employee ID': 'CITANN001',
      'Date': '2024-12-01',
      'Status': 'PRESENT',
      'First In': '09:00:00',
      'Last Out': '18:00:00',
      'Duration (hrs)': 9,
    },
    {
      'Employee ID': 'CITANN001',
      'Date': '2024-12-02',
      'Status': 'PRESENT',
      'First In': '09:15:00',
      'Last Out': '18:30:00',
      'Duration (hrs)': 9.25,
    },
    {
      'Employee ID': 'CITANN001',
      'Date': '2024-12-03',
      'Status': 'HALF_DAY',
      'First In': '09:00:00',
      'Last Out': '14:00:00',
      'Duration (hrs)': 5,
    },
    {
      'Employee ID': 'CITANN002',
      'Date': '2024-12-01',
      'Status': 'PRESENT',
      'First In': '08:45:00',
      'Last Out': '17:45:00',
      'Duration (hrs)': 9,
    },
    {
      'Employee ID': 'CITANN002',
      'Date': '2024-12-02',
      'Status': 'CASUAL_LEAVE',
      'First In': null,
      'Last Out': null,
      'Duration (hrs)': 0,
    },
  ];

  const attendanceWS = XLSX.utils.json_to_sheet(attendanceData);
  const attendanceWB = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(attendanceWB, attendanceWS, 'Attendance');
  XLSX.writeFile(attendanceWB, path.join(dataDir, 'sample_attendance.xlsx'));
  console.log('✅ Created: data/sample_attendance.xlsx');

  // 3. Sample Biometric Excel
  const biometricData = [
    {
      'Employee ID': 'CITANN001',
      'Date': '2024-12-01',
      'In Time': '09:00:15',
      'Out Time': '18:02:30',
      'In Door': 'Main Entrance',
      'Out Door': 'Main Entrance',
      'Duration (hrs)': 9.03,
    },
    {
      'Employee ID': 'CITANN001',
      'Date': '2024-12-02',
      'In Time': '09:15:00',
      'Out Time': '18:30:45',
      'In Door': 'Main Entrance',
      'Out Door': 'Main Entrance',
      'Duration (hrs)': 9.26,
    },
    {
      'Employee ID': 'CITANN002',
      'Date': '2024-12-01',
      'In Time': '08:45:30',
      'Out Time': '17:47:15',
      'In Door': 'Main Entrance',
      'Out Door': 'Side Exit',
      'Duration (hrs)': 9.03,
    },
  ];

  const biometricWS = XLSX.utils.json_to_sheet(biometricData);
  const biometricWB = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(biometricWB, biometricWS, 'Biometric');
  XLSX.writeFile(biometricWB, path.join(dataDir, 'sample_biometric.xlsx'));
  console.log('✅ Created: data/sample_biometric.xlsx');

  console.log('\n✨ Sample Excel files created successfully!');
  console.log('\n📁 Files location: backend/data/');
  console.log('   - sample_employees.xlsx');
  console.log('   - sample_attendance.xlsx');
  console.log('   - sample_biometric.xlsx');
  console.log('\n💡 Use these as templates for your own data');
  console.log('   Rename them to employees.xlsx, attendance.xlsx, biometric.xlsx');
  console.log('   or provide the file path when running import scripts\n');
}

// Run if called directly
if (require.main === module) {
  try {
    createSampleExcelFiles();
  } catch (error) {
    console.error('❌ Error creating sample files:', error);
    process.exit(1);
  }
}

export { createSampleExcelFiles };
