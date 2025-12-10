---
inclusion: always
---

# Task Completion Workflow

This guide defines the complete workflow for implementing and verifying tasks from the spec.

## Task Completion Checklist

Every task MUST follow this complete verification workflow:

### 1. Implementation Phase
- [ ] Read and understand the task requirements
- [ ] Review related design documentation
- [ ] Implement the feature/component
- [ ] Write required tests (unit and/or property-based)

### 2. Local Testing Phase
- [ ] Run the specific tests for your implementation
  ```bash
  npm test -- src/path/to/your/tests
  ```
- [ ] Verify all tests pass
- [ ] Fix any test failures

### 3. Docker Build Verification Phase ⚠️ CRITICAL
- [ ] Rebuild the Docker container
  ```bash
  docker compose up -d --build
  ```
- [ ] Verify build completes without errors
- [ ] Check for TypeScript compilation errors
- [ ] Check for build warnings

### 4. Container Verification Phase
- [ ] Verify container is running
  ```bash
  docker compose ps
  ```
- [ ] Check container logs for errors
  ```bash
  docker compose logs frontend --tail 20
  ```
- [ ] Verify no runtime errors

### 5. Task Status Update Phase
- [ ] Mark task as completed in tasks.md
- [ ] Update PBT status if applicable
- [ ] Document any issues encountered

## Why Docker Build Verification is Critical

**Tests passing ≠ Task complete**

The Docker build uses production TypeScript configuration which is stricter than development:

| Check | Development | Production Build |
|-------|-------------|------------------|
| Unused variables | Warning | Error |
| Type strictness | Moderate | Strict |
| Dead code | Allowed | Error |
| Import validation | Loose | Strict |

### Common Issues Caught by Docker Build

1. **Unused Variables**
   ```typescript
   // ❌ Fails production build
   fc.property(fc.integer(), (value) => {
     expect(true).toBe(true); // value is unused
   })
   
   // ✅ Passes production build
   fc.property(fc.integer(), (_value) => {
     expect(true).toBe(true); // prefixed with _
   })
   ```

2. **Type Errors**
   ```typescript
   // ❌ May pass tests but fail build
   const value: string = someFunction(); // returns number
   
   // ✅ Correct typing
   const value: number = someFunction();
   ```

3. **Missing Imports**
   ```typescript
   // ❌ May work in dev but fail in build
   // Missing import for type
   
   // ✅ All imports present
   import type { MyType } from './types';
   ```

## Complete Example Workflow

```bash
# Step 1: Implement feature
# (write code in src/components/MyComponent.tsx)

# Step 2: Write tests
# (write tests in src/components/MyComponent.test.tsx)

# Step 3: Run tests locally
npm test -- src/components/MyComponent.test.tsx

# Step 4: Verify Docker build (CRITICAL!)
docker compose up -d --build

# Step 5: Check build output for errors
# Look for "error TS" messages

# Step 6: If build fails, fix errors and repeat
# Common fix: prefix unused variables with _

# Step 7: Verify container status
docker compose ps

# Step 8: Check logs
docker compose logs frontend --tail 20

# Step 9: Mark task complete
# Only after ALL steps succeed
```

## Red Flags - Task is NOT Complete If:

- ❌ Tests pass but Docker build fails
- ❌ Docker build succeeds but container doesn't start
- ❌ Container starts but logs show errors
- ❌ TypeScript warnings in build output
- ❌ Build output shows "error TS" messages

## Green Flags - Task is Complete When:

- ✅ All tests pass locally
- ✅ Docker build completes without errors
- ✅ Container starts and runs successfully
- ✅ No errors in container logs
- ✅ Task marked as completed in tasks.md
- ✅ PBT status updated (if applicable)

## Time-Saving Tips

1. **Run Docker build early**: Don't wait until the end to verify
2. **Watch for TypeScript errors**: Fix them as you code
3. **Use TypeScript in your editor**: Catch errors before building
4. **Prefix unused params immediately**: Use `_` prefix for intentionally unused parameters
5. **Check logs proactively**: Don't assume success without verification

## Remember

> "A task is complete when it works in production, not just in tests."

The Docker build simulates production deployment. If it fails, your code won't deploy successfully. Always verify the Docker build as the final step of task completion.
