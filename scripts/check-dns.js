import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

async function getZones() {
    const response = await fetch(`${CF_API_BASE}/zones`, {
        headers: {
            'Authorization': `Bearer ${CF_API_TOKEN}`,
            'Content-Type': 'application/json',
        },
    });
    
    return await response.json();
}

async function getDnsRecords(zoneId) {
    const response = await fetch(`${CF_API_BASE}/zones/${zoneId}/dns_records`, {
        headers: {
            'Authorization': `Bearer ${CF_API_TOKEN}`,
            'Content-Type': 'application/json',
        },
    });
    
    return await response.json();
}

async function main() {
    try {
        console.log('Fetching Cloudflare zones...');
        const zonesData = await getZones();
        
        if (!zonesData.success) {
            console.error('Failed to fetch zones:', zonesData.errors);
            return;
        }

        console.log('\nZones found:', zonesData.result.length);
        
        for (const zone of zonesData.result) {
            console.log(`\nDomain: ${zone.name}`);
            console.log(`Status: ${zone.status}`);
            console.log(`Plan: ${zone.plan.name}`);
            
            console.log('\nFetching DNS records...');
            const dnsData = await getDnsRecords(zone.id);
            
            if (!dnsData.success) {
                console.error('Failed to fetch DNS records:', dnsData.errors);
                continue;
            }
            
            console.log('\nDNS Records:');
            dnsData.result.forEach(record => {
                console.log(`- Type: ${record.type}, Name: ${record.name}, Content: ${record.content}`);
            });
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
