import * as XLSX from 'xlsx';

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: ts-node analyze-biometric.ts <path-to-excel>');
  process.exit(1);
}

console.log('📊 Analyzing Biometric Excel file...\n');
console.log(`File: ${filePath}\n`);

try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Get raw data without header processing
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log(`Total rows: ${data.length}\n`);
  
  // Show first 20 rows to understand structure
  console.log('First 20 rows:');
  console.log('='.repeat(100));
  data.slice(0, 20).forEach((row: any, idx) => {
    console.log(`Row ${idx}:`, JSON.stringify(row));
  });
  
  console.log('\n' + '='.repeat(100));
  
  // Try to find the header row
  console.log('\nLooking for header row with "Emp ID", "Name", "Date", etc...\n');
  
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row: any = data[i];
    const rowStr = JSON.stringify(row).toLowerCase();
    if (rowStr.includes('emp') || rowStr.includes('employee') || rowStr.includes('name')) {
      console.log(`Potential header at row ${i}:`, row);
      headerRowIndex = i;
    }
  }
  
  if (headerRowIndex >= 0) {
    console.log(`\nUsing row ${headerRowIndex} as header`);
    console.log('\nFirst 5 data rows after header:');
    const dataAfterHeader = data.slice(headerRowIndex + 1, headerRowIndex + 6);
    dataAfterHeader.forEach((row: any, idx) => {
      console.log(`Data ${idx + 1}:`, row);
    });
  }

  console.log('\n✅ Analysis complete!');
} catch (error) {
  console.error('❌ Error analyzing file:', error.message);
  process.exit(1);
}
