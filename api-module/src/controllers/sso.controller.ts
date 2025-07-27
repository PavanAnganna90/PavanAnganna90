import { Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import config from '@/config/environment';
import logger from '@/utils/logger';
import { UserService } from '@/services/user.service';
import { GitHubClient } from '@/lib/api-client';

const userService = new UserService();
const githubClient = new GitHubClient();

// GitHub OAuth initiation endpoint
export const initiateSSOLogin = async (req: Request, res: Response) => {
  try {
    const redirectUrl = req.query.redirect_url as string || '/dashboard';
    const state = generateStateParam();
    
    // Store state in session/cache for validation (in production use Redis)
    // For now, we'll pass it through the flow
    
    try {
      // Generate GitHub OAuth URL
      const githubAuthUrl = await githubClient.getOAuthUrl(
        config.GITHUB_CALLBACK_URL || `${req.protocol}://${req.get('host')}/api/auth/sso/callback`,
        'user:email,read:org,repo'
      );
      
      logger.info('GitHub OAuth initiated', { redirectUrl, state });
      
      res.json({
        success: true,
        data: {
          ssoUrl: githubAuthUrl,
          state,
          redirectUrl,
          provider: 'github'
        },
        message: 'GitHub OAuth initiated'
      });
    } catch (error) {
      logger.error('GitHub OAuth URL generation failed:', error);
      res.status(500).json({
        success: false,
        error: 'GitHub OAuth not configured properly'
      });
    }
  } catch (error) {
    logger.error('SSO initiation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate SSO login'
    });
  }
};

// GitHub OAuth callback endpoint
export const handleSSOCallback = async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;
    
    if (error) {
      logger.error('GitHub OAuth callback error:', error);
      return res.status(400).json({
        success: false,
        error: `GitHub OAuth failed: ${error}`
      });
    }
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Missing authorization code'
      });
    }
    
    // TODO: In production, validate state parameter against stored value
    
    try {
      // Step 1: Exchange code for access token
      logger.info('Exchanging GitHub code for token', { code: (code as string).substring(0, 10) + '...' });
      const tokenResponse = await githubClient.exchangeCodeForToken(code as string);
      
      // Step 2: Set token and get user info
      githubClient.setAccessToken(tokenResponse.access_token);
      const githubUser = await githubClient.getCurrentUser();
      
      logger.info('GitHub user data retrieved', { 
        login: githubUser.login, 
        email: githubUser.email,
        id: githubUser.id 
      });
      
      // Step 3: Find or create user in our database
      let user = await userService.findByEmail(githubUser.email || `${githubUser.login}@github.local`);
      
      if (!user) {
        // Create new user with GitHub data
        user = await userService.create({
          email: githubUser.email || `${githubUser.login}@github.local`,
          name: githubUser.name || githubUser.login,
          role: 'USER',
          // Store GitHub-specific data
          githubId: githubUser.id.toString(),
          githubLogin: githubUser.login,
          githubAccessToken: tokenResponse.access_token // In production, encrypt this
        });
        
        logger.info('New user created from GitHub OAuth', { userId: user.id, githubLogin: githubUser.login });
      } else {
        // Update existing user with latest GitHub data
        user = await userService.update(user.id, {
          name: githubUser.name || user.name,
          githubId: githubUser.id.toString(),
          githubLogin: githubUser.login,
          githubAccessToken: tokenResponse.access_token // In production, encrypt this
        });
        
        logger.info('Existing user updated with GitHub data', { userId: user.id, githubLogin: githubUser.login });
      }
      
      // Step 4: Generate JWT token for our application
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role,
          githubLogin: githubUser.login,
          githubId: githubUser.id
        },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN }
      );
      
      logger.info('GitHub OAuth authentication successful', { 
        userId: user.id, 
        email: user.email,
        githubLogin: githubUser.login 
      });
      
      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            githubLogin: githubUser.login,
            githubId: githubUser.id,
            avatar: githubUser.avatar_url,
            company: githubUser.company,
            location: githubUser.location,
            publicRepos: githubUser.public_repos,
            followers: githubUser.followers,
            following: githubUser.following
          },
          token,
          tokenType: 'Bearer',
          provider: 'github'
        },
        message: 'GitHub OAuth authentication successful'
      });
      
    } catch (apiError) {
      logger.error('GitHub API error during OAuth:', apiError);
      res.status(500).json({
        success: false,
        error: 'Failed to authenticate with GitHub API'
      });
    }
    
  } catch (error) {
    logger.error('GitHub OAuth callback failed:', error);
    res.status(500).json({
      success: false,
      error: 'GitHub OAuth authentication failed'
    });
  }
};

// SSO logout endpoint
export const handleSSOLogout = async (req: Request, res: Response) => {
  try {
    // In a real implementation, you would:
    // 1. Invalidate the user's session
    // 2. Redirect to SSO provider logout URL
    // 3. Handle logout callback
    
    logger.info('SSO logout initiated');
    
    res.json({
      success: true,
      data: {
        logoutUrl: `${req.protocol}://${req.get('host')}/auth/sso/logout/callback`,
        message: 'Logout successful'
      }
    });
  } catch (error) {
    logger.error('SSO logout failed:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
};

// SSO configuration endpoint
export const getSSOConfig = async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        ssoEnabled: config.ENABLE_SSO,
        ssoProvider: 'SAML', // or 'OIDC', 'OAuth2', etc.
        loginUrl: '/api/auth/sso/login',
        logoutUrl: '/api/auth/sso/logout',
        bypassAvailable: config.SSO_BYPASS_DEV && config.NODE_ENV === 'development'
      }
    });
  } catch (error) {
    logger.error('Failed to get SSO config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get SSO configuration'
    });
  }
};

// Helper functions
function generateStateParam(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

async function simulateSSOUserData(code: string): Promise<{
  email: string;
  name: string;
  role?: string;
}> {
  // This simulates what you'd get from a real SSO provider
  // In production, you'd exchange the code for user data from your SSO provider
  
  return {
    email: 'sso.user@company.com',
    name: 'SSO User',
    role: 'USER'
  };
}

// Middleware to check if SSO is enabled
export const requireSSOEnabled = (req: Request, res: Response, next: any) => {
  if (!config.ENABLE_SSO) {
    return res.status(403).json({
      success: false,
      error: 'SSO is not enabled'
    });
  }
  next();
};