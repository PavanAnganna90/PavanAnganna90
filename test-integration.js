#!/usr/bin/env node

/**
 * Integration Test Script
 * Tests frontend-backend connectivity and API endpoints
 */

const fetch = require('node-fetch');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

async function testBackendHealth() {
  console.log('🔍 Testing backend health...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Backend health check passed');
      console.log(`   Service: ${data.service}`);
      console.log(`   Version: ${data.version}`);
      console.log(`   Status: ${data.status}`);
      return true;
    } else {
      console.log('❌ Backend health check failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Backend connection failed:', error.message);
    return false;
  }
}

async function testBackendDetailedHealth() {
  console.log('🔍 Testing backend detailed health...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/health/detailed`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Backend detailed health check passed');
      console.log('   Dependencies:');
      Object.entries(data.dependencies || {}).forEach(([service, status]) => {
        console.log(`     ${service}: ${status ? '✅' : '❌'}`);
      });
      return true;
    } else {
      console.log('❌ Backend detailed health check failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Backend detailed health failed:', error.message);
    return false;
  }
}

async function testCacheMetrics() {
  console.log('🔍 Testing cache metrics endpoint...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/cache/metrics`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Cache metrics endpoint working');
      console.log(`   Hit Rate: ${Math.round(data.hit_rate * 100)}%`);
      console.log(`   Total Requests: ${data.total_requests}`);
      console.log(`   Cache Size: ${data.size}/${data.max_size}`);
      return true;
    } else {
      console.log('❌ Cache metrics endpoint failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Cache metrics test failed:', error.message);
    return false;
  }
}

async function testApiPerformance() {
  console.log('🔍 Testing API performance endpoint...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/performance`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ API performance endpoint working');
      console.log(`   Response Time: ${data.response_time_ms}ms`);
      console.log(`   Cache Enabled: ${data.cache_enabled ? 'Yes' : 'No'}`);
      console.log(`   Cache Level: ${data.cache_level}`);
      return true;
    } else {
      console.log('❌ API performance endpoint failed');
      return false;
    }
  } catch (error) {
    console.log('❌ API performance test failed:', error.message);
    return false;
  }
}

async function testOAuthProviders() {
  console.log('🔍 Testing OAuth providers endpoint...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/oauth/providers`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ OAuth providers endpoint working');
      console.log(`   Available providers: ${data.total_count}`);
      console.log(`   Enabled providers: ${data.enabled_count}`);
      return true;
    } else {
      console.log('❌ OAuth providers endpoint failed');
      return false;
    }
  } catch (error) {
    console.log('❌ OAuth providers test failed:', error.message);
    return false;
  }
}

async function testFrontendHealth() {
  console.log('🔍 Testing frontend health...');
  
  try {
    const response = await fetch(`${FRONTEND_URL}/api/health`);
    
    if (response.ok) {
      console.log('✅ Frontend health check passed');
      return true;
    } else {
      console.log('❌ Frontend health check failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Frontend connection failed:', error.message);
    return false;
  }
}

async function runIntegrationTests() {
  console.log('🚀 Starting Integration Tests\n');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Frontend URL: ${FRONTEND_URL}\n`);
  
  const tests = [
    testBackendHealth,
    testBackendDetailedHealth,
    testCacheMetrics,
    testApiPerformance,
    testOAuthProviders,
    testFrontendHealth
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ Test failed with error: ${error.message}`);
      failed++;
    }
    console.log(''); // Empty line for readability
  }
  
  console.log('📊 Test Results:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All integration tests passed! The system is ready for use.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please check the services and try again.');
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  runIntegrationTests().catch(error => {
    console.error('💥 Integration test suite failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runIntegrationTests,
  testBackendHealth,
  testFrontendHealth,
  testCacheMetrics,
  testApiPerformance,
  testOAuthProviders
};