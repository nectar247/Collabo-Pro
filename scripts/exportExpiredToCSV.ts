#!/usr/bin/env tsx
/**
 * Convert expired deals JSON to CSV for easier inspection
 */

import * as fs from 'fs';
import * as path from 'path';

const jsonPath = path.join(process.cwd(), 'scripts/expired-active-deals.json');
const csvPath = path.join(process.cwd(), 'scripts/expired-active-deals.csv');

try {
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  // CSV header
  const headers = [
    'ID',
    'Brand',
    'Title',
    'Category',
    'Expired Date',
    'Days Expired',
    'Created Date',
    'Code',
    'Link',
    'Description'
  ];

  // Convert to CSV rows
  const rows = jsonData.map((deal: any) => [
    deal.id,
    `"${(deal.brand || '').replace(/"/g, '""')}"`,
    `"${(deal.title || '').replace(/"/g, '""')}"`,
    deal.category || '',
    deal.expiresAtReadable || '',
    deal.daysExpired || 0,
    deal.createdAtReadable || '',
    `"${(deal.code || '').replace(/"/g, '""')}"`,
    `"${(deal.link || '').replace(/"/g, '""')}"`,
    `"${(deal.description || '').replace(/"/g, '""').substring(0, 200)}"`,
  ].join(','));

  // Write CSV
  const csvContent = [headers.join(','), ...rows].join('\n');
  fs.writeFileSync(csvPath, csvContent);

  console.log(`✅ CSV exported successfully!`);
  console.log(`📄 File: ${csvPath}`);
  console.log(`📊 Records: ${jsonData.length}`);
  console.log(`💾 Size: ${(fs.statSync(csvPath).size / 1024).toFixed(2)} KB`);
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}
