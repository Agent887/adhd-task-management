const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Update .env.local file
const updateEnvFile = () => {
  const envPath = path.join(__dirname, '..', '.env.local');
  let envContent = fs.readFileSync(envPath, 'utf8');

  // Add Gemini API configuration
  const updates = {
    GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY || '',
    GEMINI_MODEL: 'gemini-pro',
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
  console.log('\x1b[32m%s\x1b[0m', '✓ Updated .env.local with Gemini configuration');
};

// Open browser to enable Gemini API
const openGeminiConsole = () => {
  const url = 'https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com';
  
  console.log('\x1b[33m%s\x1b[0m', '\nOpening Google Cloud Console to enable Gemini API...');
  
  const command = process.platform === 'win32' ? 'start' : 'open';
  exec(`${command} ${url}`);
};

// Main execution
try {
  updateEnvFile();
  openGeminiConsole();
  
  console.log('\x1b[33m%s\x1b[0m', '\nNext steps:');
  console.log('1. Enable the Gemini API in the browser tab');
  console.log('2. Create an API key in the Credentials section');
  console.log('3. Add the API key to your .env.local file as GOOGLE_AI_API_KEY');
  console.log('4. Restart your development server');
  
} catch (error) {
  console.error('\x1b[31m%s\x1b[0m', 'Error:', error.message);
  process.exit(1);
}
