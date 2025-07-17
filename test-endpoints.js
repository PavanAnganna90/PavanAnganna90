const https = require('http');

async function testEndpoint(path, data = null) {
    return new Promise((resolve, reject) => {
        const postData = data ? JSON.stringify(data) : null;
        
        const options = {
            hostname: 'localhost',
            port: 8000,
            path: path,
            method: data ? 'POST' : 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': postData ? Buffer.byteLength(postData) : 0
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseData);
                    resolve({
                        status: res.statusCode,
                        data: parsed
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: responseData
                    });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (postData) {
            req.write(postData);
        }
        
        req.end();
    });
}

async function runTests() {
    console.log('🧪 Testing Backend API Endpoints\n');
    
    const tests = [
        {
            name: 'Health Check',
            path: '/health',
            method: 'GET'
        },
        {
            name: 'API Documentation',
            path: '/docs',
            method: 'GET'
        },
        {
            name: 'Error Reporting',
            path: '/api/v1/errors',
            method: 'POST',
            data: {
                error_message: "Test error from endpoint test",
                error_type: "javascript", 
                page_url: "http://localhost:3000/test",
                severity: "error"
            }
        },
        {
            name: 'Analytics Tracking',
            path: '/api/v1/analytics',
            method: 'POST',
            data: {
                event_name: "test_event",
                event_data: { test: true },
                page_url: "http://localhost:3000/test"
            }
        },
        {
            name: 'Available Endpoints',
            path: '/openapi.json',
            method: 'GET'
        }
    ];
    
    let successful = 0;
    let failed = 0;
    
    for (const test of tests) {
        try {
            console.log(`🔍 Testing: ${test.name}`);
            
            const result = await testEndpoint(test.path, test.data);
            
            if (result.status >= 200 && result.status < 300) {
                console.log(`   ✅ ${test.name}: ${result.status}`);
                if (test.name === 'Error Reporting' || test.name === 'Analytics Tracking') {
                    console.log(`   📄 Response: ${JSON.stringify(result.data, null, 2)}`);
                }
                successful++;
            } else if (result.status === 404) {
                console.log(`   ❌ ${test.name}: Endpoint not found (${result.status})`);
                failed++;
            } else {
                console.log(`   ⚠️  ${test.name}: ${result.status} - ${JSON.stringify(result.data)}`);
                failed++;
            }
            
        } catch (error) {
            console.log(`   ❌ ${test.name}: Connection failed - ${error.message}`);
            failed++;
        }
        
        console.log();
    }
    
    console.log('📊 Test Results:');
    console.log(`   ✅ Successful: ${successful}/${tests.length}`);
    console.log(`   ❌ Failed: ${failed}/${tests.length}`);
    console.log(`   🎯 Success Rate: ${Math.round((successful/tests.length)*100)}%`);
    
    if (successful === tests.length) {
        console.log('\n🎉 All endpoints are working correctly!');
    } else {
        console.log('\n⚠️  Some endpoints need attention. Check the backend logs.');
    }
}

runTests().catch(console.error);