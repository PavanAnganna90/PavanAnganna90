'use client';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

import { FaGithub } from 'react-icons/fa';

/**
 * Login page component with GitHub OAuth button
 */
export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to OpsSight
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Your DevOps Visibility Platform
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <button
            onClick={() => {
              // Redirect to GitHub OAuth
              window.location.href = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1'}/auth/github/login`;
            }}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800"
          >
            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
              <FaGithub className="h-5 w-5" />
            </span>
            Continue with GitHub
          </button>

          <div className="text-sm text-center text-gray-600">
            <p>By continuing, you agree to our</p>
            <a href="/terms" className="font-medium text-indigo-600 hover:text-indigo-500">
              Terms of Service
            </a>
            {' and '}
            <a href="/privacy" className="font-medium text-indigo-600 hover:text-indigo-500">
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 