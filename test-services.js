const puppeteer = require('puppeteer');

// Services to test
const services = [
  {
    name: 'PostgreSQL Database',
    url: 'http://localhost:5432',
    type: 'tcp',
    description: 'Database service'
  },
  {
    name: 'Redis Cache',
    url: 'http://localhost:6379', 
    type: 'tcp',
    description: 'Redis cache service'
  },
  {
    name: 'Grafana Dashboard',
    url: 'http://localhost:3001',
    type: 'http',
    description: 'Monitoring dashboard',
    expectedTitle: 'Grafana'
  },
  {
    name: 'Prometheus Metrics',
    url: 'http://localhost:9090',
    type: 'http', 
    description: 'Metrics collection',
    expectedTitle: 'Prometheus'
  }
];

async function testHttpService(service) {
  let browser;
  try {
    console.log(`🔍 Testing ${service.name}...`);
    
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set timeout
    page.setDefaultTimeout(10000);
    
    // Navigate to the service
    const response = await page.goto(service.url, { 
      waitUntil: 'networkidle0',
      timeout: 10000 
    });
    
    if (!response) {
      throw new Error('No response received');
    }
    
    const status = response.status();
    console.log(`   📡 HTTP Status: ${status}`);
    
    if (status >= 200 && status < 400) {
      // Get page title
      const title = await page.title();
      console.log(`   📄 Page Title: "${title}"`);
      
      // Check if expected title matches
      if (service.expectedTitle && title.includes(service.expectedTitle)) {
        console.log(`   ✅ ${service.name} is running correctly`);
        return { status: 'success', details: { httpStatus: status, title } };
      } else if (!service.expectedTitle) {
        console.log(`   ✅ ${service.name} is accessible`);
        return { status: 'success', details: { httpStatus: status, title } };
      } else {
        console.log(`   ⚠️  ${service.name} is accessible but title doesn't match expected`);
        return { status: 'warning', details: { httpStatus: status, title, expected: service.expectedTitle } };
      }
    } else {
      console.log(`   ❌ ${service.name} returned HTTP ${status}`);
      return { status: 'error', details: { httpStatus: status } };
    }
    
  } catch (error) {
    console.log(`   ❌ ${service.name} failed: ${error.message}`);
    return { status: 'error', details: { error: error.message } };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function testTcpService(service) {
  const net = require('net');
  
  return new Promise((resolve) => {
    console.log(`🔍 Testing ${service.name}...`);
    
    const url = new URL(service.url);
    const port = parseInt(url.port);
    const host = url.hostname || 'localhost';
    
    const socket = new net.Socket();
    const timeout = 5000;
    
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      console.log(`   ✅ ${service.name} is accessible on ${host}:${port}`);
      socket.destroy();
      resolve({ status: 'success', details: { host, port } });
    });
    
    socket.on('timeout', () => {
      console.log(`   ❌ ${service.name} connection timeout`);
      socket.destroy();
      resolve({ status: 'error', details: { error: 'Connection timeout' } });
    });
    
    socket.on('error', (error) => {
      console.log(`   ❌ ${service.name} connection failed: ${error.message}`);
      socket.destroy();
      resolve({ status: 'error', details: { error: error.message } });
    });
    
    socket.connect(port, host);
  });
}

async function runTests() {
  console.log('🚀 OpsSight Platform - Service Health Check\n');
  console.log('=' .repeat(50));
  
  const results = {};
  
  for (const service of services) {
    let result;
    
    if (service.type === 'http') {
      result = await testHttpService(service);
    } else if (service.type === 'tcp') {
      result = await testTcpService(service);
    }
    
    results[service.name] = result;
    console.log(); // Empty line between services
  }
  
  // Summary
  console.log('=' .repeat(50));
  console.log('📊 Test Summary:');
  console.log('=' .repeat(50));
  
  let successCount = 0;
  let warningCount = 0;
  let errorCount = 0;
  
  for (const [serviceName, result] of Object.entries(results)) {
    const statusIcon = result.status === 'success' ? '✅' : 
                      result.status === 'warning' ? '⚠️' : '❌';
    console.log(`${statusIcon} ${serviceName}: ${result.status.toUpperCase()}`);
    
    if (result.status === 'success') successCount++;
    else if (result.status === 'warning') warningCount++;
    else errorCount++;
  }
  
  console.log('\n📈 Statistics:');
  console.log(`   ✅ Success: ${successCount}/${services.length}`);
  console.log(`   ⚠️  Warning: ${warningCount}/${services.length}`);
  console.log(`   ❌ Error: ${errorCount}/${services.length}`);
  
  const healthPercentage = Math.round((successCount / services.length) * 100);
  console.log(`   🎯 Overall Health: ${healthPercentage}%`);
  
  if (healthPercentage >= 80) {
    console.log('\n🎉 Platform is mostly healthy!');
  } else if (healthPercentage >= 50) {
    console.log('\n⚠️  Platform has some issues but core services are running');
  } else {
    console.log('\n❌ Platform has significant issues');
  }
  
  console.log('\n💡 Next steps:');
  console.log('   • Check failed services logs: docker-compose -f docker-compose.local.yml logs [service]');
  console.log('   • Restart services: docker-compose -f docker-compose.local.yml restart [service]');
  console.log('   • View all services: docker-compose -f docker-compose.local.yml ps');
  
  return results;
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testHttpService, testTcpService };