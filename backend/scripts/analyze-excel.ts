import * as XLSX from 'xlsx';

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: ts-node analyze-excel.ts <path-to-excel>');
  process.exit(1);
}

console.log('📊 Analyzing Excel file structure...\n');
console.log(`File: ${filePath}\n`);

try {
  const workbook = XLSX.readFile(filePath);
  
  console.log(`📄 Sheet Names: ${workbook.SheetNames.join(', ')}\n`);

  workbook.SheetNames.forEach((sheetName, index) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Sheet ${index + 1}: "${sheetName}"`);
    console.log('='.repeat(60));
    
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`Total rows: ${data.length}\n`);
    
    if (data.length > 0) {
      console.log('Column Names:');
      const firstRow: any = data[0];
      Object.keys(firstRow).forEach((key, idx) => {
        console.log(`  ${idx + 1}. "${key}"`);
      });
      
      console.log(`\nFirst 3 rows of data:`);
      console.log(JSON.stringify(data.slice(0, 3), null, 2));
    }
  });

  console.log('\n✅ Analysis complete!');
} catch (error) {
  console.error('❌ Error analyzing file:', error.message);
  process.exit(1);
}
