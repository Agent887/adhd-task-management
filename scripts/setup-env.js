const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Generate a random NEXTAUTH_SECRET
const generateSecret = () => {
    return crypto.randomBytes(32).toString('hex');
};

const envContent = `NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=${generateSecret()}
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=`;

// Create scripts directory if it doesn't exist
const scriptsDir = path.join(__dirname);
if (!fs.existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir, { recursive: true });
}

// Write .env.local if it doesn't exist
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, envContent);
    console.log('\x1b[32m%s\x1b[0m', '✓ Created .env.local file');
    console.log('\x1b[33m%s\x1b[0m', '\nNext steps:');
    console.log('1. Go to https://console.cloud.google.com/');
    console.log('2. Create a new project or select existing one');
    console.log('3. Enable the Google+ API');
    console.log('4. Go to Credentials → Create OAuth 2.0 Client ID');
    console.log('5. Add authorized redirect URI: http://localhost:3000/api/auth/callback/google');
    console.log('6. Copy the Client ID and Client Secret');
    console.log('7. Add them to your .env.local file');
} else {
    console.log('\x1b[33m%s\x1b[0m', '! .env.local already exists. Skipping creation.');
}
