# OpsSight Backend - Claude Integration Guide

This guide explains how the OpsSight backend is integrated with your `~/.claude` documentation system for enhanced development workflow.

## Integration Structure

```
backend/
├── .claude/
│   └── config.yml          # Backend-specific Claude configuration
├── docs/
│   ├── claude-integration/ # Claude-specific documentation
│   │   ├── PROJECT_OVERVIEW.md
│   │   ├── API_PATTERNS.md
│   │   └── BACKEND_CLAUDE_GUIDE.md (this file)
│   └── ...                 # Existing documentation
└── ...
```

## How It Works

### 1. Configuration Inheritance

The backend's `.claude/config.yml` imports shared patterns from your global `~/.claude` directory:

```yaml
imports:
  - "~/.claude/shared/python-patterns.yml"
  - "~/.claude/shared/api-patterns.yml"
  - "~/.claude/shared/security-patterns.yml"
  - "~/.claude/shared/testing-patterns.yml"
```

This allows the backend to leverage your established patterns while maintaining project-specific configurations.

### 2. Command Integration

You can use Claude commands with backend context:

```bash
# Generate API documentation
/document --type api --format openapi

# Analyze code quality
/analyze --focus security,performance

# Improve existing code
/improve --target app/services/kubernetes_service.py

# Generate tests
/test --coverage app/api/v1/endpoints/
```

### 3. Pattern Templates

The `.claude/config.yml` defines backend-specific patterns:

- **Endpoint Structure**: FastAPI route patterns with caching and permissions
- **Service Structure**: Service layer with caching integration
- **Test Structure**: Async test patterns with proper fixtures

### 4. Development Workflow

#### Quick Commands (defined in config.yml)

```bash
# Run tests with coverage
make test-coverage

# Start development server
make dev

# Run database migrations
make migrate

# Generate OpenAPI documentation
make generate-openapi
```

#### Using Claude Commands

```bash
# Troubleshoot an issue
/troubleshoot "WebSocket connections dropping after 5 minutes"

# Estimate implementation effort
/estimate "Add GraphQL API alongside REST"

# Create migration script
/migrate --from postgresql --to mongodb --component user_service
```

### 5. Documentation Access

The integration provides quick access to both project and Claude documentation:

```yaml
documentation:
  overview: "docs/claude-integration/PROJECT_OVERVIEW.md"
  api_patterns: "docs/claude-integration/API_PATTERNS.md"
  architecture: "docs/api_documentation_complete.md"
  security: "docs/security_implementation_guide.md"
```

## Benefits of Integration

### 1. **Consistent Patterns**
- Leverage proven patterns from `~/.claude/shared/`
- Maintain consistency across projects
- Easy onboarding for new developers

### 2. **Enhanced Documentation**
- Auto-generated documentation with `/document`
- Integrated with existing docs structure
- Cross-references between Claude and project docs

### 3. **Improved Development Speed**
- Quick access to common patterns
- Automated code generation
- Integrated testing workflows

### 4. **Better Code Quality**
- Built-in security patterns
- Performance optimization templates
- Consistent error handling

## Usage Examples

### Generate New Endpoint

```python
# Using Claude pattern
/generate endpoint --resource notifications --operations crud --cached --auth required
```

This generates:
- Route definition in `app/api/v1/endpoints/notifications.py`
- Service class in `app/services/notification_service.py`
- Schema definitions in `app/schemas/notification.py`
- Tests in `tests/api/v1/test_notifications.py`

### Analyze Performance

```bash
# Analyze specific service
/analyze --target app/services/kubernetes_service.py --focus performance

# Get optimization suggestions
/improve --performance app/api/v1/endpoints/metrics.py
```

### Security Audit

```bash
# Run security analysis
/scan --security app/

# Get OWASP compliance report
/analyze --security --standard owasp-top-10
```

## Troubleshooting

### Common Issues

1. **Import Errors**
   ```bash
   # Check if ~/.claude paths are correct
   cat .claude/config.yml | grep imports
   ```

2. **Pattern Not Found**
   ```bash
   # Verify shared patterns exist
   ls ~/.claude/shared/
   ```

3. **Command Not Working**
   ```bash
   # Ensure you're in the backend directory
   pwd  # Should show .../backend
   ```

## Extending the Integration

### Add Custom Patterns

Edit `.claude/config.yml`:

```yaml
patterns:
  custom_middleware: |
    @app.middleware("http")
    async def {name}_middleware(request: Request, call_next):
        # Pre-processing
        start_time = time.time()
        
        # Process request
        response = await call_next(request)
        
        # Post-processing
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        
        return response
```

### Add New Commands

```yaml
aliases:
  # Custom command for load testing
  load-test: "locust -f tests/load/locustfile.py --users 100 --spawn-rate 10"
  
  # Generate migration
  new-migration: "alembic revision --autogenerate -m"
```

## Best Practices

1. **Keep Documentation Updated**
   - Update `.claude/config.yml` when adding new services
   - Document new patterns in `API_PATTERNS.md`
   - Keep `PROJECT_OVERVIEW.md` current

2. **Use Consistent Naming**
   - Follow patterns defined in shared configs
   - Use semantic naming for better Claude understanding

3. **Leverage Automation**
   - Use `/generate` for boilerplate code
   - Use `/test` for comprehensive test generation
   - Use `/document` for API documentation

4. **Regular Reviews**
   - Run `/analyze` before major releases
   - Use `/scan --security` for security audits
   - Check `/review` output in PRs

## Next Steps

1. **Explore Commands**: Try different Claude commands with the backend
2. **Customize Patterns**: Add project-specific patterns to `.claude/config.yml`
3. **Integrate CI/CD**: Add Claude analysis to your CI pipeline
4. **Share Knowledge**: Document new patterns for team use

---

For more information:
- Global Claude docs: `~/.claude/CLAUDE.md`
- Backend API docs: `docs/api_documentation_complete.md`
- Security guide: `docs/security_implementation_guide.md`