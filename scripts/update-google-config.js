const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const readline = require('readline');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Additional scopes for Calendar and Cloud Speech-to-Text APIs
const ADDITIONAL_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/cloud-platform',
];

// Update .env.local file
const updateEnvFile = () => {
  const envPath = path.join(__dirname, '..', '.env.local');
  let envContent = fs.readFileSync(envPath, 'utf8');

  // Update or add Google credentials
  const updates = {
    GOOGLE_OAUTH_SCOPES: ADDITIONAL_SCOPES.join(' ')
  };

  Object.entries(updates).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (envContent.match(regex)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  });

  fs.writeFileSync(envPath, envContent);
  console.log('\x1b[32m%s\x1b[0m', '✓ Updated .env.local with Google scopes');
};

// Open browser to enable APIs
const openApiConsole = () => {
  const urls = [
    'https://console.cloud.google.com/apis/library/calendar-json.googleapis.com',
    'https://console.cloud.google.com/apis/library/speech.googleapis.com'
  ];

  console.log('\x1b[33m%s\x1b[0m', '\nOpening Google Cloud Console to enable APIs...');
  
  urls.forEach(url => {
    const command = process.platform === 'win32' ? 'start' : 'open';
    exec(`${command} ${url}`);
  });
};

// Update NextAuth configuration
const updateNextAuthConfig = () => {
  const configPath = path.join(__dirname, '..', 'src', 'app', 'api', 'auth', '[...nextauth]', 'route.ts');
  let configContent = fs.readFileSync(configPath, 'utf8');

  // Add new scopes to Google provider
  const scopeUpdate = `
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/cloud-platform'
        }
      }`;

  configContent = configContent.replace(
    /clientId:.*\n.*clientSecret:.*!/s,
    scopeUpdate
  );

  fs.writeFileSync(configPath, configContent);
  console.log('\x1b[32m%s\x1b[0m', '✓ Updated NextAuth configuration with new scopes');
};

// Main execution
try {
  updateEnvFile();
  updateNextAuthConfig();
  openApiConsole();
  
  console.log('\x1b[33m%s\x1b[0m', '\nNext steps:');
  console.log('1. Enable the Calendar API in the first browser tab');
  console.log('2. Enable the Cloud Speech-to-Text API in the second browser tab');
  console.log('3. Wait a few minutes for the APIs to be fully enabled');
  console.log('4. Restart your development server with: npm run dev');
  
} catch (error) {
  console.error('\x1b[31m%s\x1b[0m', 'Error:', error.message);
  process.exit(1);
}
