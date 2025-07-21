# Claude Integration for OpsSight Backend

This directory contains Claude-specific configuration for the OpsSight DevOps Platform backend.

## Quick Start

1. **Using Claude Commands**:
   ```bash
   # From backend directory
   /analyze --focus security,performance
   /document --type api --format openapi
   /improve --target app/services/
   ```

2. **Access Documentation**:
   - Project Overview: `docs/claude-integration/PROJECT_OVERVIEW.md`
   - API Patterns: `docs/claude-integration/API_PATTERNS.md`
   - Integration Guide: `docs/claude-integration/BACKEND_CLAUDE_GUIDE.md`

3. **Configuration**:
   - Backend config: `.claude/config.yml`
   - Global config: `~/.claude/CLAUDE.md`

## Key Features

- ✅ Integrated with global `~/.claude` patterns
- ✅ Backend-specific command aliases
- ✅ FastAPI code generation patterns
- ✅ Automated documentation generation
- ✅ Security and performance analysis
- ✅ Test generation templates

## Common Operations

```bash
# Generate new API endpoint
/generate endpoint --resource <name> --operations crud

# Analyze code quality
/analyze --target app/

# Generate tests
/test --coverage app/api/v1/

# Create documentation
/document --type api --style detailed
```

See `docs/claude-integration/BACKEND_CLAUDE_GUIDE.md` for detailed usage.