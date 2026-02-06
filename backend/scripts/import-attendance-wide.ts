import { PrismaClient, AttendanceStatus } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function importAttendanceWide(filePath: string) {
  console.log('📥 Starting attendance import from Excel (wide format)...');
  console.log(`File: ${filePath}\n`);

  try {
    // Read Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Found ${data.length} employees in Excel file\n`);

    let totalRecords = 0;
    let usersCreated = 0;
    let usersSkipped = 0;
    let attendanceCreated = 0;
    let attendanceUpdated = 0;
    let errors = 0;

    for (const row of data) {
      try {
        const employeeData: any = row;

        // Extract employee info
        const employeeId = employeeData['Employee IDs'] || employeeData['Employee ID'];
        const employeeNumber = parseInt(employeeData[' IDs'] || employeeData['IDs'] || employeeData['ID'] || '0');
        const name = employeeData['Names'] || employeeData['Name'];
        const designation = employeeData['Designation'] || 'Annotator';
        const doj = employeeData['DOJ'];

        if (!employeeId || !name) {
          console.warn(`⚠️  Skipping row - missing employee info`);
          errors++;
          continue;
        }

        // Parse DOJ (Excel serial date or date string)
        let dateOfJoining: Date;
        if (typeof doj === 'number') {
          // Excel serial date (days since 1900-01-01)
          dateOfJoining = new Date((doj - 25569) * 86400 * 1000);
        } else if (doj) {
          dateOfJoining = new Date(doj);
        } else {
          dateOfJoining = new Date('2024-01-01'); // Default
        }

        // Check if user exists, if not create
        let user = await prisma.user.findUnique({
          where: { employeeId },
        });

        if (!user) {
          // Create user
          const email = `${employeeId.toLowerCase()}@attendease.com`;
          const passwordHash = await bcrypt.hash('employee123', 10);

          user = await prisma.user.create({
            data: {
              employeeId,
              employeeNumber: employeeNumber || 0,
              name,
              email,
              passwordHash,
              designation,
              dateOfJoining,
              baseSalary: 22000,
              role: 'EMPLOYEE',
              status: 'ACTIVE',
            },
          });

          // Create leave balance
          await prisma.leaveBalance.create({
            data: {
              userId: user.id,
              year: 2025,
              casualLeaveTotal: 12,
              casualLeaveUsed: 0,
              casualLeavePending: 0,
              casualLeaveAvailable: 12,
            },
          });

          console.log(`✅ Created user: ${name} (${employeeId})`);
          usersCreated++;
        } else {
          usersSkipped++;
        }

        // Process each date column
        const dateColumns = Object.keys(employeeData).filter((key) =>
          key.match(/^\d{1,2}\/\d{1,2}\/\d{2}$/)
        );

        for (const dateCol of dateColumns) {
          try {
            const statusCode = employeeData[dateCol];
            if (!statusCode || statusCode.toString().trim() === '') {
              continue;
            }

            // Parse date from column name (MM/DD/YY format)
            const [month, day, year] = dateCol.split('/').map(Number);
            const fullYear = 2000 + year; // Convert 25 to 2025
            const date = new Date(fullYear, month - 1, day);

            // Map status code to enum
            let status: AttendanceStatus;
            const statusStr = statusCode.toString().toUpperCase().trim();

            switch (statusStr) {
              case 'P':
                status = AttendanceStatus.PRESENT;
                break;
              case 'A':
              case 'LOP':
                status = AttendanceStatus.ABSENT;
                break;
              case 'HD':
              case 'HALF':
                status = AttendanceStatus.HALF_DAY;
                break;
              case 'CL':
              case 'LEAVE':
                status = AttendanceStatus.CASUAL_LEAVE;
                break;
              case 'W':
              case 'WO':
              case 'WEEKEND':
                status = AttendanceStatus.WEEKEND;
                break;
              case 'H':
              case 'HOLIDAY':
                status = AttendanceStatus.HOLIDAY;
                break;
              default:
                console.warn(`⚠️  Unknown status code: ${statusStr} for ${name} on ${dateCol}`);
                continue;
            }

            // Create or update attendance record
            const existing = await prisma.attendance.findUnique({
              where: {
                userId_date: {
                  userId: user.id,
                  date,
                },
              },
            });

            if (existing) {
              await prisma.attendance.update({
                where: { id: existing.id },
                data: { status },
              });
              attendanceUpdated++;
            } else {
              await prisma.attendance.create({
                data: {
                  userId: user.id,
                  date,
                  status,
                  biometricSynced: false,
                },
              });
              attendanceCreated++;
            }

            totalRecords++;
          } catch (dateError) {
            // Skip individual date errors
          }
        }

        console.log(`   Processed ${dateColumns.length} days for ${name}`);
      } catch (error) {
        console.error(`❌ Error importing employee:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Import Summary:');
    console.log(`👥 Users:`);
    console.log(`   ✅ Created: ${usersCreated}`);
    console.log(`   ⏭️  Skipped (already exist): ${usersSkipped}`);
    console.log(`\n📅 Attendance Records:`);
    console.log(`   ✅ Created: ${attendanceCreated}`);
    console.log(`   🔄 Updated: ${attendanceUpdated}`);
    console.log(`   📊 Total: ${totalRecords}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`\n✨ Import completed successfully!`);
    console.log(`\n🔑 Default password for new users: employee123`);
  } catch (error) {
    console.error('❌ Fatal error during import:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npm run import:attendance-wide <path-to-excel-file>');
    console.error('Example: npm run import:attendance-wide "./data/DECEMBER ATTENDANCE 2025.xlsx"');
    process.exit(1);
  }

  importAttendanceWide(filePath)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { importAttendanceWide };
