# Docker Container Rebuild Requirement

When making code changes to this project, the Docker container must be rebuilt to pick up the changes.

## Commands

After modifying source code files, run:

```bash
docker compose up -d --build app
```

Or to rebuild all services:

```bash
docker compose up -d --build
```

## Why This Is Needed

The application runs inside a Docker container in production mode. The container uses a compiled version of the code from the build step. Simply restarting the container with `docker compose restart app` will not pick up new code changes - the container must be rebuilt.

## Workflow

1. Make code changes
2. Run tests locally: `npm test -- <path-to-tests>`
3. Run `docker compose up -d --build`
4. Wait for the build to complete
5. Check for build errors in the output
6. Verify container is running: `docker compose ps`
7. Check logs: `docker compose logs frontend --tail 20`
8. Test the changes

## CRITICAL: Task Completion Verification

**A task is NOT complete until the Docker build succeeds!**

After implementing any feature or fixing any issue:

1. ✅ Tests pass locally
2. ✅ Docker build completes without errors
3. ✅ Container starts successfully
4. ✅ No runtime errors in logs

### Common Build Failures

**TypeScript Errors:**
- Unused variables (prefix with `_` if intentional)
- Type errors
- Missing imports

**Example Fix:**
```typescript
// ❌ Fails Docker build
(unusedParam) => { ... }

// ✅ Passes Docker build
(_unusedParam) => { ... }
```

**Why Docker Build Matters:**
- Production TypeScript config is stricter than development
- Tests may pass but build may fail
- Deployment requires successful build
- Catching errors early prevents production issues

## Alternative for Development

For faster iteration during development, consider:
- Running the app locally with `npm run dev` (if available)
- Using Docker volumes to mount source code (requires Dockerfile changes)
- Setting up hot-reload in the container

**Note:** Even when developing locally, always verify Docker build before considering a task complete.
