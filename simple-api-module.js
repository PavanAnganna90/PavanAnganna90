const http = require('http');
const url = require('url');

const PORT = 3001;

// Demo data
const demoUsers = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin', active: true },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'user', active: true },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'user', active: false }
];

const demoPosts = [
  { id: 1, title: 'Getting Started with OpsSight', content: 'Welcome to the platform...', author: 'John Doe', published: true },
  { id: 2, title: 'Infrastructure Best Practices', content: 'Key practices for DevOps...', author: 'Jane Smith', published: true },
  { id: 3, title: 'Monitoring Guidelines', content: 'How to set up monitoring...', author: 'Bob Johnson', published: false }
];

function sendJSON(res, data, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data, null, 2));
}

function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  // Routes
  if (path === '/' && method === 'GET') {
    sendJSON(res, {
      message: 'OpsSight API Module - Development Server',
      version: '1.0.0-dev',
      status: 'running',
      auth_bypass: true,
      timestamp: new Date().toISOString()
    });
  }
  else if (path === '/health' && method === 'GET') {
    sendJSON(res, {
      status: 'healthy',
      service: 'api-module',
      version: '1.0.0-dev',
      timestamp: new Date().toISOString(),
      auth_bypass: true,
      features: ['users', 'posts', 'auth']
    });
  }
  else if (path === '/auth/login' && method === 'POST') {
    sendJSON(res, {
      token: 'demo-api-token-development',
      user: demoUsers[0],
      message: 'Authentication bypassed for development'
    });
  }
  else if (path === '/auth/me' && method === 'GET') {
    sendJSON(res, {
      user: demoUsers[0],
      auth_bypass: true
    });
  }
  else if (path === '/users' && method === 'GET') {
    sendJSON(res, {
      data: demoUsers,
      total: demoUsers.length,
      auth_bypass: true
    });
  }
  else if (path.startsWith('/users/') && method === 'GET') {
    const id = parseInt(path.split('/')[2]);
    const user = demoUsers.find(u => u.id === id);
    if (!user) {
      sendJSON(res, { error: 'User not found' }, 404);
    } else {
      sendJSON(res, { data: user });
    }
  }
  else if (path === '/posts' && method === 'GET') {
    sendJSON(res, {
      data: demoPosts,
      total: demoPosts.length,
      auth_bypass: true
    });
  }
  else if (path.startsWith('/posts/') && method === 'GET') {
    const id = parseInt(path.split('/')[2]);
    const post = demoPosts.find(p => p.id === id);
    if (!post) {
      sendJSON(res, { error: 'Post not found' }, 404);
    } else {
      sendJSON(res, { data: post });
    }
  }
  else if (path === '/dashboard/stats' && method === 'GET') {
    sendJSON(res, {
      users: {
        total: demoUsers.length,
        active: demoUsers.filter(u => u.active).length,
        admins: demoUsers.filter(u => u.role === 'admin').length
      },
      posts: {
        total: demoPosts.length,
        published: demoPosts.filter(p => p.published).length,
        drafts: demoPosts.filter(p => !p.published).length
      },
      system: {
        uptime: Math.floor(process.uptime()),
        memory: process.memoryUsage(),
        version: '1.0.0-dev'
      }
    });
  }
  else if (path === '/github/repos' && method === 'GET') {
    sendJSON(res, {
      data: [
        { id: 1, name: 'opssight-platform', full_name: 'company/opssight-platform', private: false, stars: 42 },
        { id: 2, name: 'devops-tools', full_name: 'company/devops-tools', private: true, stars: 8 }
      ],
      total: 2
    });
  }
  else if (path === '/github/webhooks' && method === 'GET') {
    sendJSON(res, {
      data: [
        { id: 1, name: 'deployment', active: true, events: ['push', 'pull_request'] },
        { id: 2, name: 'monitoring', active: true, events: ['issues', 'issue_comment'] }
      ],
      total: 2
    });
  }
  else {
    sendJSON(res, {
      error: 'Endpoint not found',
      path: path,
      method: method,
      suggestion: 'Check /health for available endpoints'
    }, 404);
  }
}

// Create server
const server = http.createServer(handleRequest);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 OpsSight API Module running on http://0.0.0.0:${PORT}`);
  console.log(`🔓 Authentication bypass enabled for development`);
  console.log(`📍 Available endpoints:`);
  console.log(`   • Health: http://localhost:${PORT}/health`);
  console.log(`   • Users: http://localhost:${PORT}/users`);
  console.log(`   • Posts: http://localhost:${PORT}/posts`);
  console.log(`   • Dashboard: http://localhost:${PORT}/dashboard/stats`);
  console.log(`   • GitHub: http://localhost:${PORT}/github/repos`);
});

module.exports = server;