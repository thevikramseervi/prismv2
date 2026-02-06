import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

function parseTime(timeStr: string): Date | null {
  if (!timeStr || timeStr === '00:00') return null;
  
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function parseDuration(durationStr: string): number {
  if (!durationStr || durationStr === '00:00') return 0;
  
  const parts = durationStr.split(':');
  if (parts.length === 2) {
    const [hours, minutes] = parts.map(Number);
    return hours * 60 + minutes; // Return total minutes
  }
  return 0;
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  try {
    // Format: DD-MMM-YYYY (e.g., "03-Dec-2025")
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}

async function importBiometricGrouped(filePath: string) {
  console.log('📥 Starting biometric data import from Excel...');
  console.log(`File: ${filePath}\n`);

  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get raw data
    const data: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

    console.log(`Found ${data.length} total rows\n`);

    let totalLogs = 0;
    let logsCreated = 0;
    let logsSkipped = 0;
    let errors = 0;
    let usersNotFound = 0;
    let currentUser: any = null;
    let currentEmployeeId: string | null = null;

    // Process rows
    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i];
        if (!row || row.length === 0) continue;

        // Check if this is an employee header row
        const cellValue = row[1];
        if (cellValue && typeof cellValue === 'string' && cellValue.includes('Employee :')) {
          // Extract employee ID or name from row
          // Could be in row[1] like "Employee : 1" or row[4] like "1-Name" or "CITSEED001"
          let empIdValue = row[4] || row[3] || row[2];
          
          if (empIdValue && empIdValue !== '-') {
            const rawValue = empIdValue.toString().trim();
            
            // Extract employee number if format is "123-Name" or just "123"
            let employeeNumberMatch = rawValue.match(/^(\d+)/);
            
            if (employeeNumberMatch) {
              // Extract just the number part
              const employeeNumber = parseInt(employeeNumberMatch[1]);
              currentEmployeeId = employeeNumber.toString();
              
              currentUser = await prisma.user.findFirst({
                where: { employeeNumber },
              });
            } else if (rawValue.startsWith('CITSEED')) {
              // It's an ID like CITSEED001
              currentEmployeeId = rawValue;
              currentUser = await prisma.user.findUnique({
                where: { employeeId: rawValue },
              });
            } else {
              currentEmployeeId = rawValue;
              currentUser = null;
            }

            if (currentUser) {
              console.log(`📋 Processing employee: ${currentUser.name} (${currentUser.employeeId})`);
            } else {
              console.warn(`⚠️  Employee not found: ${rawValue}`);
              usersNotFound++;
              currentEmployeeId = null;
            }
          }
          continue;
        }

        // Skip if no current user
        if (!currentUser) continue;

        // Check if this is a data row (has date in column 1)
        const dateStr = row[1];
        if (!dateStr || typeof dateStr !== 'string') continue;
        
        const date = parseDate(dateStr);
        if (!date) continue;

        // Parse punch data
        // Columns: [empty, Date, empty, empty, In Door, In Time, Out Door, empty, Out Time, empty, empty, Duration]
        const inTimeStr = row[5] ? row[5].toString() : null;
        const outTimeStr = row[8] ? row[8].toString() : null;
        const inDoor = row[4] ? row[4].toString() : null;
        const outDoor = row[6] ? row[6].toString() : null;
        const durationStr = row[11] ? row[11].toString() : '00:00';
        const duration = parseDuration(durationStr);

        // Parse full datetime for in/out times
        let inTime: Date | undefined = undefined;
        let outTime: Date | undefined = undefined;
        
        if (inTimeStr) {
          const [hours, minutes] = inTimeStr.split(':').map(Number);
          inTime = new Date(date);
          inTime.setHours(hours, minutes, 0, 0);
        }
        
        if (outTimeStr) {
          const [hours, minutes] = outTimeStr.split(':').map(Number);
          outTime = new Date(date);
          outTime.setHours(hours, minutes, 0, 0);
        }

        // Create biometric log entry
        try {
          await prisma.biometricLog.create({
            data: {
              userId: currentUser.id,
              date,
              inTime,
              outTime,
              inDoor,
              outDoor,
              duration,
              rawData: {
                inDoor: row[4],
                outDoor: row[6],
                inTime: inTimeStr,
                outTime: outTimeStr,
                duration: durationStr,
              },
              processed: false,
            },
          });

          logsCreated++;
          totalLogs++;
        } catch (createError: any) {
          if (createError.code === 'P2002') {
            // Duplicate - skip
            logsSkipped++;
          } else {
            errors++;
            console.error(`❌ Error creating log for ${currentUser.name} on ${dateStr}:`, createError.message);
          }
        }

      } catch (rowError: any) {
        errors++;
        console.error(`❌ Error processing row ${i}:`, rowError.message);
      }
    }

    console.log('\n📊 Import Summary:');
    console.log(`📝 Biometric Logs:`);
    console.log(`   ✅ Created: ${logsCreated}`);
    console.log(`   ⏭️  Skipped (duplicates): ${logsSkipped}`);
    console.log(`   📊 Total processed: ${totalLogs}`);
    console.log(`   ⚠️  Employees not found: ${usersNotFound}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`\n✨ Biometric import completed!`);
    
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
    console.error('Usage: npm run migrate:biometric-grouped <path-to-excel-file>');
    console.error('Example: npm run migrate:biometric-grouped "./data/DECEMBER BIOMETRIC 2025.xls"');
    process.exit(1);
  }

  importBiometricGrouped(filePath)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { importBiometricGrouped };
