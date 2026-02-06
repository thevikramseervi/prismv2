import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

async function importBiometric(filePath: string) {
  console.log('📥 Starting biometric data import from Excel...');
  console.log(`File: ${filePath}`);

  try {
    // Read Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Found ${data.length} rows in Excel file`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const row of data) {
      try {
        const biometricData: any = row;

        // Extract data
        const employeeId = biometricData['Employee ID'] || biometricData['employeeId'] || biometricData['Emp ID'];
        const dateStr = biometricData['Date'] || biometricData['date'];
        const inTime = biometricData['In Time'] || biometricData['inTime'] || biometricData['First In'];
        const outTime = biometricData['Out Time'] || biometricData['outTime'] || biometricData['Last Out'];
        const inDoor = biometricData['In Door'] || biometricData['inDoor'] || null;
        const outDoor = biometricData['Out Door'] || biometricData['outDoor'] || null;
        const durationHrs = parseFloat(biometricData['Duration'] || biometricData['duration'] || biometricData['Duration (hrs)'] || '0');

        // Validation
        if (!employeeId || !dateStr) {
          console.warn(`⚠️  Skipping row - missing required fields`);
          skipped++;
          continue;
        }

        // Find user
        const user = await prisma.user.findUnique({
          where: { employeeId },
        });

        if (!user) {
          console.warn(`⚠️  User not found: ${employeeId}`);
          skipped++;
          continue;
        }

        // Parse date
        let date: Date;
        try {
          date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            throw new Error('Invalid date');
          }
        } catch {
          console.warn(`⚠️  Invalid date format: ${dateStr}`);
          skipped++;
          continue;
        }

        // Parse times
        let inTimeDate: Date | null = null;
        let outTimeDate: Date | null = null;

        if (inTime) {
          try {
            // If time is already a Date object from Excel
            if (inTime instanceof Date) {
              inTimeDate = inTime;
            } else {
              // Parse time string (e.g., "09:30:00")
              const [hours, minutes, seconds = '0'] = inTime.split(':');
              inTimeDate = new Date(date);
              inTimeDate.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds));
            }
          } catch {
            console.warn(`⚠️  Invalid inTime format: ${inTime}`);
          }
        }

        if (outTime) {
          try {
            if (outTime instanceof Date) {
              outTimeDate = outTime;
            } else {
              const [hours, minutes, seconds = '0'] = outTime.split(':');
              outTimeDate = new Date(date);
              outTimeDate.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds));
            }
          } catch {
            console.warn(`⚠️  Invalid outTime format: ${outTime}`);
          }
        }

        // Calculate duration in minutes
        const durationMinutes = Math.round(durationHrs * 60);

        // Create biometric log
        await prisma.biometricLog.create({
          data: {
            userId: user.id,
            date,
            inTime: inTimeDate,
            outTime: outTimeDate,
            inDoor,
            outDoor,
            duration: durationMinutes,
            rawData: biometricData as any,
            processed: false, // Will be processed by biometric sync
          },
        });

        console.log(`✅ Imported: ${user.name} - ${date.toDateString()}`);
        imported++;
      } catch (error) {
        console.error(`❌ Error importing row:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Import Summary:');
    console.log(`✅ Imported: ${imported}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`\n✨ Biometric import completed!`);
    console.log(`\n💡 Tip: Run biometric sync from Admin Panel to process these logs into attendance records`);
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
    console.error('Usage: npm run import:biometric <path-to-excel-file>');
    console.error('Example: npm run import:biometric ./data/biometric.xlsx');
    process.exit(1);
  }

  importBiometric(filePath)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { importBiometric };
