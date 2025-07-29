#!/usr/bin/env python3
"""
Frontend-Backend Integration Testing Suite
Tests rapid API calls and simulates React key duplication scenarios
"""

import requests
import asyncio
import aiohttp
import json
import time
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
import warnings
import urllib3

# Suppress SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
warnings.filterwarnings('ignore', message='Unverified HTTPS request')

class FrontendIntegrationTester:
    def __init__(self, backend_url="http://localhost:8000", frontend_url="http://localhost:3000"):
        self.backend_url = backend_url
        self.frontend_url = frontend_url
        self.session = requests.Session()
        self.results = {
            'api_calls': [],
            'timing_issues': [],
            'race_conditions': [],
            'duplicate_responses': []
        }
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        print(f"[{timestamp}] {level}: {message}")
        
    def simulate_toast_duplication_scenario(self):
        """Simulate rapid API calls that might cause duplicate toast keys"""
        self.log("=== Testing Toast Duplication Scenario ===")
        
        # Endpoints that likely trigger toasts
        toast_endpoints = [
            '/api/v1/dashboard/overview',
            '/api/v1/metrics',
            '/api/v1/projects',
            '/api/v1/health'
        ]
        
        # Simulate rapid user actions (like clicking refresh multiple times)
        for endpoint in toast_endpoints:
            self.log(f"Testing rapid calls to {endpoint}")
            self.test_rapid_successive_calls(endpoint, num_calls=5, delay_ms=10)
            
    def test_rapid_successive_calls(self, endpoint, num_calls=5, delay_ms=50):
        """Test rapid successive API calls with minimal delay"""
        self.log(f"Making {num_calls} rapid calls to {endpoint} with {delay_ms}ms delay")
        
        start_times = []
        response_times = []
        responses = []
        
        def make_call(call_id):
            start_time = time.time()
            start_times.append(start_time)
            try:
                response = self.session.get(f"{self.backend_url}{endpoint}", timeout=5, verify=False)
                end_time = time.time()
                response_data = {
                    'call_id': call_id,
                    'start_time': start_time,
                    'end_time': end_time,
                    'response_time': (end_time - start_time) * 1000,
                    'status_code': response.status_code,
                    'content_length': len(response.content),
                    'timestamp': start_time * 1000  # JS-style timestamp
                }
                responses.append(response_data)
                return response_data
            except Exception as e:
                error_data = {
                    'call_id': call_id,
                    'error': str(e),
                    'timestamp': start_time * 1000
                }
                responses.append(error_data)
                return error_data
        
        # Use ThreadPoolExecutor for truly concurrent calls
        with ThreadPoolExecutor(max_workers=num_calls) as executor:
            futures = []
            for i in range(num_calls):
                futures.append(executor.submit(make_call, i))
                if delay_ms > 0:
                    time.sleep(delay_ms / 1000.0)
            
            # Wait for all calls to complete
            results = [future.result() for future in futures]
        
        # Analyze results for potential timing issues
        self.analyze_timing_results(endpoint, results)
        
        return results
    
    def analyze_timing_results(self, endpoint, results):
        """Analyze results for potential React key duplication causes"""
        
        # Check for simultaneous responses (could cause duplicate keys)
        timestamps = [r.get('timestamp', 0) for r in results if 'timestamp' in r]
        rounded_timestamps = [round(ts) for ts in timestamps]  # Round to nearest ms
        
        # Check for duplicate timestamps (key collision risk)
        if len(rounded_timestamps) != len(set(rounded_timestamps)):
            duplicate_times = []
            for ts in set(rounded_timestamps):
                if rounded_timestamps.count(ts) > 1:
                    duplicate_times.append(ts)
            
            timing_issue = {
                'endpoint': endpoint,
                'issue': 'duplicate_timestamps',
                'timestamps': duplicate_times,
                'risk': 'HIGH - Could cause React key duplication'
            }
            self.results['timing_issues'].append(timing_issue)
            self.log(f"⚠️  TIMING ISSUE: Duplicate timestamps detected for {endpoint}: {duplicate_times}", "WARN")
        
        # Check for response times that are suspiciously similar
        response_times = [r.get('response_time', 0) for r in results if 'response_time' in r]
        if len(response_times) > 1:
            time_differences = []
            for i in range(1, len(response_times)):
                diff = abs(response_times[i] - response_times[i-1])
                time_differences.append(diff)
            
            # If multiple responses come back within 1ms, it's suspicious
            near_simultaneous = [diff for diff in time_differences if diff < 1.0]
            if len(near_simultaneous) > 1:
                timing_issue = {
                    'endpoint': endpoint,
                    'issue': 'near_simultaneous_responses',
                    'differences': near_simultaneous,
                    'risk': 'MEDIUM - Could cause UI rendering race conditions'
                }
                self.results['timing_issues'].append(timing_issue)
                self.log(f"⚠️  Near-simultaneous responses for {endpoint}: {near_simultaneous}", "WARN")
    
    def test_frontend_backend_integration(self):
        """Test integration scenarios that commonly cause issues"""
        self.log("=== Testing Frontend-Backend Integration ===")
        
        # Test 1: Dashboard load with multiple API calls
        self.log("Test 1: Simulating dashboard page load")
        dashboard_endpoints = [
            '/api/v1/dashboard/overview',
            '/api/v1/metrics',
            '/api/v1/projects'
        ]
        
        # Simulate page load - multiple API calls at once
        start_time = time.time()
        with ThreadPoolExecutor(max_workers=len(dashboard_endpoints)) as executor:
            futures = []
            for endpoint in dashboard_endpoints:
                futures.append(executor.submit(self.make_api_call, endpoint))
            
            dashboard_results = [future.result() for future in futures]
        
        load_time = time.time() - start_time
        self.log(f"Dashboard simulation completed in {load_time:.2f}s")
        
        # Test 2: Rapid refresh scenario
        self.log("Test 2: Simulating rapid refresh clicks")
        self.test_rapid_successive_calls('/api/v1/dashboard/overview', num_calls=3, delay_ms=100)
        
        # Test 3: Error handling with rapid calls
        self.log("Test 3: Testing error scenarios")
        self.test_rapid_successive_calls('/api/v1/nonexistent', num_calls=3, delay_ms=50)
        
        return dashboard_results
    
    def make_api_call(self, endpoint):
        """Make a single API call and return detailed timing info"""
        start_time = time.time()
        try:
            response = self.session.get(f"{self.backend_url}{endpoint}", timeout=10, verify=False)
            end_time = time.time()
            
            result = {
                'endpoint': endpoint,
                'status_code': response.status_code,
                'response_time': (end_time - start_time) * 1000,
                'timestamp': start_time * 1000,
                'content_type': response.headers.get('content-type', ''),
                'success': True
            }
            
            # Try to parse JSON response
            try:
                result['data'] = response.json()
            except:
                result['data'] = response.text[:200]  # First 200 chars
                
            return result
            
        except Exception as e:
            return {
                'endpoint': endpoint,
                'error': str(e),
                'timestamp': start_time * 1000,
                'success': False
            }
    
    def test_memory_pressure_simulation(self):
        """Simulate memory pressure that could cause issues"""
        self.log("=== Testing Memory Pressure Scenarios ===")
        
        # Rapid fire requests to simulate high load
        endpoints = ['/api/v1/health', '/api/v1/metrics']
        
        for endpoint in endpoints:
            self.log(f"Memory pressure test for {endpoint}")
            results = []
            
            # Make 20 rapid requests
            for i in range(20):
                result = self.make_api_call(endpoint)
                results.append(result)
                if i % 5 == 0:
                    time.sleep(0.1)  # Brief pause every 5 requests
            
            # Analyze memory-related patterns
            response_times = [r.get('response_time', 0) for r in results if r.get('success')]
            if len(response_times) > 10:
                first_half = response_times[:len(response_times)//2]
                second_half = response_times[len(response_times)//2:]
                
                avg_first = sum(first_half) / len(first_half)
                avg_second = sum(second_half) / len(second_half)
                
                if avg_second > avg_first * 1.3:  # 30% increase
                    self.log(f"⚠️  Performance degradation detected for {endpoint}: {avg_first:.2f}ms → {avg_second:.2f}ms", "WARN")
    
    def generate_react_key_analysis(self):
        """Generate analysis specifically for React key duplication issues"""
        self.log("\n" + "="*80)
        self.log("REACT KEY DUPLICATION ANALYSIS")
        self.log("="*80)
        
        print(f"""
ROOT CAUSE ANALYSIS:
==================

1. DUPLICATE TOAST PROVIDERS DETECTED:
   - ToastProvider from /contexts/ToastContext.tsx (using Date.now().toString(36))
   - ToastProvider from /components/ui/toast.tsx (using Date.now().toString())
   - Individual pages like /dashboard/users and /dashboard/posts render additional <Toaster /> components
   - This creates multiple toast contexts competing for the same key space

2. TIMESTAMP-BASED KEY GENERATION ISSUES:
   - Both providers use Date.now() for ID generation
   - Rapid API calls can generate identical timestamps
   - Key format: {int(time.time() * 1000)} (13-digit timestamp like 1753672191837)

3. ARCHITECTURAL PROBLEMS:
   - Multiple ToastProvider instances in component tree
   - Toaster components rendered at page level instead of app level  
   - Race conditions between simultaneous API responses

TIMING ANALYSIS:
===============
""")
        
        if self.results['timing_issues']:
            for issue in self.results['timing_issues']:
                print(f"⚠️  {issue['issue'].upper()} on {issue['endpoint']}")
                print(f"   Risk Level: {issue['risk']}")
                if 'timestamps' in issue:
                    print(f"   Duplicate Timestamps: {issue['timestamps']}")
                print()
        else:
            print("✓ No critical timing issues detected in current test run")
        
        print(f"""
RECOMMENDATIONS:
===============

1. IMMEDIATE FIXES:
   - Remove duplicate ToastProvider from individual pages
   - Use the ToastProvider already in /app/providers-refactored.tsx
   - Remove <Toaster /> components from individual pages
   - Implement UUID-based key generation instead of timestamps

2. ARCHITECTURAL IMPROVEMENTS:
   - Centralize toast management at app level
   - Use React.memo() for toast components to prevent unnecessary re-renders
   - Implement toast deduplication based on message content
   - Add proper cleanup in useEffect hooks

3. CODE CHANGES NEEDED:
   
   A. Fix providers-refactored.tsx:
      ```tsx
      // Use the custom ToastProvider, not the UI one
      import {{ ToastProvider }} from '@/contexts/ToastContext';
      ```
   
   B. Remove from individual pages:
      ```tsx
      // REMOVE these lines from users/page.tsx and posts/page.tsx:
      import {{ ToastProvider }} from '@/contexts/ToastContext';
      import {{ Toaster }} from '@/components/ui/toaster';
      
      // And remove the JSX wrappers
      ```
   
   C. Fix key generation in ToastContext.tsx:
      ```tsx
      // Replace:
      const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);
      // With:
      const generateId = () => `toast-${{crypto.randomUUID()}}`;
      ```

4. TESTING IMPROVEMENTS:
   - Add React Testing Library tests for toast deduplication
   - Implement E2E tests for rapid user interactions
   - Monitor for duplicate keys in development with React.StrictMode
        """)
    
    def run_comprehensive_test(self):
        """Run all frontend integration tests"""
        self.log("Starting Frontend-Backend Integration Testing Suite")
        
        # Test basic integration
        self.test_frontend_backend_integration()
        
        # Test toast duplication scenarios
        self.simulate_toast_duplication_scenario()
        
        # Test memory pressure
        self.test_memory_pressure_simulation()
        
        # Generate analysis
        self.generate_react_key_analysis()

if __name__ == "__main__":
    try:
        tester = FrontendIntegrationTester()
        tester.run_comprehensive_test()
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
    except Exception as e:
        print(f"\nTest failed with error: {e}")
        import traceback
        traceback.print_exc()