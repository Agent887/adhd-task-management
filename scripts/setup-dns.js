import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_API_BASE = 'https://api.cloudflare.com/client/v4';
const DOMAIN = 'done365.com';

async function getZoneId(domain) {
    const response = await fetch(`${CF_API_BASE}/zones?name=${domain}`, {
        headers: {
            'Authorization': `Bearer ${CF_API_TOKEN}`,
            'Content-Type': 'application/json',
        },
    });
    
    const data = await response.json();
    if (!data.success || data.result.length === 0) {
        throw new Error(`Could not find zone ID for domain ${domain}`);
    }
    
    return data.result[0].id;
}

async function createDnsRecord(zoneId, record) {
    const response = await fetch(`${CF_API_BASE}/zones/${zoneId}/dns_records`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${CF_API_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(record),
    });
    
    const data = await response.json();
    if (!data.success) {
        console.error(`Failed to create DNS record:`, data.errors);
        return false;
    }
    
    return true;
}

async function main() {
    try {
        console.log(`Setting up DNS records for ${DOMAIN}...`);
        const zoneId = await getZoneId(DOMAIN);
        
        const records = [
            // Root domain CNAME record
            {
                type: 'CNAME',
                name: '@',
                content: 'done365.pages.dev',
                proxied: true
            },
            // WWW subdomain
            {
                type: 'CNAME',
                name: 'www',
                content: 'done365.com',
                proxied: true
            },
            // API subdomain
            {
                type: 'CNAME',
                name: 'api',
                content: 'done365.pages.dev',
                proxied: true
            },
            // App subdomain
            {
                type: 'CNAME',
                name: 'app',
                content: 'done365.pages.dev',
                proxied: true
            },
            // Dev subdomain
            {
                type: 'CNAME',
                name: 'dev',
                content: 'done365.pages.dev',
                proxied: true
            }
        ];
        
        for (const record of records) {
            console.log(`Creating ${record.type} record for ${record.name}.${DOMAIN}...`);
            const success = await createDnsRecord(zoneId, record);
            if (success) {
                console.log(`✓ Successfully created ${record.type} record for ${record.name}.${DOMAIN}`);
            }
        }
        
        console.log('\nDNS setup complete!');
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();
