export const GOOGLE_CONFIG = {
    CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
    REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8787/api/calendar/auth/callback',
    SCOPES: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
    ]
};
