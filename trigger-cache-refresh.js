// Simple script to trigger cache refresh by calling the function endpoint
const https = require('https');

// Get the project from firebase config
const project = 'vouched4vouchers';
const region = 'us-central1';
const functionName = 'refreshHomepageCache';

console.log(`🔄 Triggering ${functionName}...`);
console.log(`Note: This function is scheduled via Pub/Sub, so we'll deploy a quick trigger instead.\n`);

// Exit and tell user to use gcloud
console.log('To manually trigger the function, run:');
console.log(`  gcloud scheduler jobs run firebase-schedule-${functionName}-${region} --location=${region}`);
console.log('\nOr we can create a simple HTTP trigger script.');
process.exit(0);
