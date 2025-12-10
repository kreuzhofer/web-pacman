# Test Execution Guide

This project uses Jest as the test runner. Follow these guidelines when running tests.

## Test Analysis Policy

**CRITICAL: When analyzing test failures, follow this workflow to minimize test runs and context window usage:**

1. **Initial Full Test Run**: Run the complete test suite ONCE and save output to a file
   ```bash
   npm test -- --runInBand > test-output.log 2>&1
   ```

2. **Analyze from File**: Use the saved output file to identify all failures
   - Parse the file to extract failing test suites and specific test names
   - Build a comprehensive list of all issues before starting fixes
   - Do NOT re-run tests just to see what's failing

3. **Fix One at a Time**: Work through the list systematically
   - Fix one test file at a time
   - Run only that specific test file to verify the fix
   - Move to the next item on the list

4. **Benefits**:
   - Saves time by avoiding redundant full test runs
   - Keeps context window small by not repeatedly dumping full test output
   - Provides clear overview of all issues upfront
   - Enables systematic, organized approach to fixing

**Example Workflow**:
```bash
# Step 1: Run all tests once and save output
npm test -- --runInBand > test-output.log 2>&1

# Step 2: Analyze the file to identify failures
grep "FAIL" test-output.log
grep "●" test-output.log | head -20

# Step 3: Fix individual test files
npm test -- src/__tests__/specific/failing-test.ts --runInBand

# Step 4: After all fixes, run full suite again to confirm
npm test -- --runInBand
```

## Running Tests

### Backend Tests (Jest)

**Correct command:**
```bash
npm test -- <path-to-test-file>
```

**Example:**
```bash
npm test -- src/__tests__/services/roleValidation.property.test.ts
```

**Important Notes:**
- Jest does NOT support the `--run` flag (that's a Vitest flag)
- Do NOT use `npm test -- <path> --run` - this will fail with "Unrecognized option"
- Jest runs tests once by default (no watch mode in CI/non-interactive environments)
- **ALWAYS run tests with `--runInBand` flag to disable parallel execution**
- Parallel test execution causes database conflicts and test failures
- Use: `npm test -- --runInBand` for all test runs

### Frontend Tests (Vitest)

The frontend uses Vitest for testing, which has different flags than Jest:

**Correct command:**
```bash
npm test -- <path-to-test-file>
```

**Example:**
```bash
cd frontend
npm test -- src/components/CreateUrlForm.test.tsx
```

**Important Notes:**
- Vitest is configured with `--run` flag in package.json scripts by default
- The frontend uses **unit tests only** - no property-based testing
- Property-based testing with `fast-check` is only used in the backend
- Frontend tests focus on component behavior, user interactions, and UI validation

## Test Types

### Unit Tests
- **Backend**: Located in `src/__tests__/` directories, run with Jest
- **Frontend**: Located in `frontend/src/` alongside components (e.g., `*.test.tsx`), run with Vitest
- Test individual functions and components
- Frontend tests use `@testing-library/react` and `@testing-library/user-event`

### Property-Based Tests (Backend Only)
- Use `fast-check` library for property-based testing
- Located alongside unit tests (e.g., `*.property.test.ts`)
- Run with Jest
- Configured to run minimum 100 iterations per property
- **Not used in frontend** - frontend uses standard unit tests only

### Integration Tests
- Test multiple components working together
- Located in `src/__tests__/` directories
- Run with Jest

## Common Mistakes to Avoid

❌ **Wrong:** `npm test -- src/__tests__/services/file.test.ts --run`
- Jest doesn't recognize `--run` flag

✅ **Correct:** `npm test -- src/__tests__/services/file.test.ts`
- Jest runs tests once by default

## Running All Tests

```bash
# Backend tests (always use --runInBand to avoid parallel execution issues)
npm test -- --runInBand

# Frontend tests (--run is already configured in package.json)
cd frontend
npm test
```

## Test Database

Tests use a PostgreSQL database. Ensure Docker containers are running:

```bash
docker compose up -d
```

The test suite automatically handles database cleanup between tests.

### CRITICAL: Test Cleanup Rules

**NEVER use `deleteMany({})` without a `where` clause in test cleanup!**

This will delete ALL records from the database, including:
- The admin@example.com user
- Any pre-existing data
- Data from other tests running in parallel

**Correct cleanup patterns:**

```typescript
// ✅ CORRECT: Only delete entities created by this test
afterAll(async () => {
  await db.account.deleteMany({ where: { id: accountId } });
  // or
  await db.account.deleteMany({ where: { id: { in: testAccountIds } } });
});

// ❌ WRONG: Deletes ALL accounts including admin
afterAll(async () => {
  await db.account.deleteMany({});
});

// ✅ BEST: Use the provided cleanup helper
import { cleanupTestDb } from '../helpers/testDb';

afterEach(async () => {
  await cleanupTestDb(); // Automatically cleans only test-created data
});
```

The `cleanupTestDb()` helper function intelligently:
- Tracks entities created during tests
- Only deletes test-created data
- Preserves pre-existing data like admin accounts
- Respects foreign key constraints

## Docker Container Rebuild After Code Changes

**CRITICAL:** After making changes to frontend or backend code, you MUST rebuild the Docker containers to pick up the changes.

### Rebuild Commands

**After backend changes:**
```bash
docker compose up -d --build app
```

**After frontend changes:**
```bash
docker compose up -d --build frontend
```

**Rebuild all services:**
```bash
docker compose up -d --build
```

### Check for Errors

After rebuilding, always check the container logs for errors:

```bash
# Check backend logs
docker compose logs app

# Check frontend logs
docker compose logs frontend

# Follow logs in real-time
docker compose logs -f app
docker compose logs -f frontend
```

### Why This Is Required

- The application runs in Docker containers in production mode
- Containers use compiled/built versions of the code
- Simply restarting containers (`docker compose restart`) will NOT pick up code changes
- The container must be rebuilt to include new code changes

### Workflow After Code Changes

1. Make code changes to frontend or backend
2. Run tests locally to verify changes
3. Rebuild the appropriate Docker container(s)
4. Check container logs for build errors or runtime issues
5. Test the changes in the running containers

## Task Completion Verification

**CRITICAL: Always verify Docker build after completing tasks!**

When implementing tasks from the spec, follow this verification workflow:

### Complete Task Verification Checklist

1. **Write Code**: Implement the feature/component
2. **Run Tests**: Verify all tests pass locally
   ```bash
   npm test -- <path-to-tests>
   ```
3. **Verify Docker Build**: ALWAYS rebuild and verify the Docker container builds successfully
   ```bash
   docker compose up -d --build
   ```
4. **Check Build Output**: Look for TypeScript errors, build failures, or warnings
5. **Verify Container Status**: Ensure container is running
   ```bash
   docker compose ps
   ```
6. **Check Logs**: Verify no runtime errors
   ```bash
   docker compose logs frontend --tail 20
   ```

### Common Docker Build Issues

**TypeScript Errors:**
- Unused variables (prefix with `_` if intentionally unused)
- Type mismatches
- Missing imports
- Incorrect type annotations

**Build Failures:**
- Missing dependencies
- Import path errors
- Syntax errors that tests might not catch

**Why This Matters:**
- Tests run in development mode with different TypeScript settings
- Docker build uses production TypeScript config which is stricter
- Build failures in Docker mean deployment will fail
- Catching issues early saves time and prevents broken deployments

### Example: Fixing Unused Variable Error

```typescript
// ❌ WRONG: Causes Docker build to fail
fc.property(
  fc.integer(),
  (unusedValue) => {
    expect(something).toBe(true);
  }
)

// ✅ CORRECT: Prefix with underscore
fc.property(
  fc.integer(),
  (_unusedValue) => {
    expect(something).toBe(true);
  }
)
```

### Task Completion Template

After completing any task:

```bash
# 1. Run tests
npm test -- src/path/to/tests

# 2. Verify Docker build
docker compose up -d --build

# 3. Check status
docker compose ps

# 4. Check logs for errors
docker compose logs frontend --tail 20

# 5. If errors occur, fix and repeat
```

**Remember:** A task is NOT complete until the Docker build succeeds!
