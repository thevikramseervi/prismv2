const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const files = [
  'excel/Activity_Report_2026-01-21 (December 2025).xlsx',
  'excel/DECEMBER ATTENDANCE 2025.xlsx',
  'excel/DECEMBER BIOMETRIC 2025.xls',
  'excel/Pay Slip - Likhithashree.xls'
];

files.forEach(filePath => {
  console.log('\n' + '='.repeat(80));
  console.log(`FILE: ${filePath}`);
  console.log('='.repeat(80));
  
  try {
    const workbook = XLSX.readFile(filePath);
    
    workbook.SheetNames.forEach((sheetName, index) => {
      console.log(`\n--- Sheet ${index + 1}: ${sheetName} ---\n`);
      
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      
      // Print first 50 rows
      const rowsToPrint = Math.min(data.length, 50);
      for (let i = 0; i < rowsToPrint; i++) {
        console.log(JSON.stringify(data[i]));
      }
      
      if (data.length > 50) {
        console.log(`\n... (showing first 50 of ${data.length} rows)`);
      }
    });
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
  }
});
