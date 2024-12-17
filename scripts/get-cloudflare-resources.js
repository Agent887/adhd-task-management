const { execSync } = require('child_process');

async function getCloudflareResources() {
    const accountId = '4730244aa97f209b74f18f80ffea42bd';
    
    try {
        // Get D1 Databases
        console.log('\nFetching D1 Databases...');
        const d1Result = execSync(
            `curl -X GET "https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database" -H "Authorization: Bearer %CLOUDFLARE_API_TOKEN%"`,
            { encoding: 'utf8' }
        );
        console.log('D1 Databases:', JSON.stringify(JSON.parse(d1Result), null, 2));

        // Get KV Namespaces
        console.log('\nFetching KV Namespaces...');
        const kvResult = execSync(
            `curl -X GET "https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces" -H "Authorization: Bearer %CLOUDFLARE_API_TOKEN%"`,
            { encoding: 'utf8' }
        );
        console.log('KV Namespaces:', JSON.stringify(JSON.parse(kvResult), null, 2));

        // Get Workers
        console.log('\nFetching Workers...');
        const workersResult = execSync(
            `curl -X GET "https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts" -H "Authorization: Bearer %CLOUDFLARE_API_TOKEN%"`,
            { encoding: 'utf8' }
        );
        console.log('Workers:', JSON.stringify(JSON.parse(workersResult), null, 2));

    } catch (error) {
        console.error('Error fetching resources:', error.message);
        if (error.stdout) console.log('Response:', error.stdout.toString());
        if (error.stderr) console.log('Error output:', error.stderr.toString());
    }
}

getCloudflareResources();
