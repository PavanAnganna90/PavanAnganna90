import { Router } from 'express';
import { getDevAuthToken } from '@/middleware/authBypass';
import { authLimiter } from '@/middleware/rateLimiter';
import { 
  initiateSSOLogin, 
  handleSSOCallback, 
  handleSSOLogout, 
  getSSOConfig,
  requireSSOEnabled 
} from '@/controllers/sso.controller';
import config from '@/config/environment';

const router = Router();

// SSO Authentication endpoints
router.get('/sso/config', getSSOConfig);
router.get('/sso/login', authLimiter, requireSSOEnabled, initiateSSOLogin);
router.get('/sso/callback', authLimiter, requireSSOEnabled, handleSSOCallback);
router.post('/sso/logout', authLimiter, requireSSOEnabled, handleSSOLogout);

// Alternative SSO routes (for compatibility)
router.get('/sso', authLimiter, requireSSOEnabled, initiateSSOLogin);

// Development authentication bypass endpoint
if (config.NODE_ENV === 'development' && config.SSO_BYPASS_DEV) {
  router.get('/dev-token', authLimiter, getDevAuthToken);
}

// SSO status endpoint
router.get('/sso-status', (req, res) => {
  res.json({
    success: true,
    data: {
      ssoEnabled: config.ENABLE_SSO,
      ssoBypassDev: config.SSO_BYPASS_DEV,
      environment: config.NODE_ENV,
      authType: config.SSO_BYPASS_DEV && config.NODE_ENV === 'development' ? 'bypass' : 'sso',
    },
  });
});

export default router;