# Security Specification for Job Applications

## Data Invariants
- A job application entry must have a valid `userId` (matches the current user's UID), a valid `jobId` (exists in the jobs collection), a valid `status` ('Submitted', 'In Review', 'Interviewing'), and a valid `appliedAt` timestamp.
- Users can only read and write their own job applications.
- Job posters (if they can be identified, but let's stick to simple owner-based for now) should be able to read applications for their jobs.

## The "Dirty Dozen" Payloads (Examples of invalid writes)
1. Write with different `userId` (spoofing)
2. Write with non-existent `jobId`
3. Write with invalid `status` (e.g., "Accepted")
4. Write with `appliedAt` in the future
5. Write with invalid `userId` format
6. Write with invalid `jobId` format
7. Attempting to delete someone else's job application
8. Attempting to list someone else's job applications
9. Attempting to update a job application status (if not admin/authorized)
10. Attempting to insert a "Ghost Field" (e.g., `salaryOffered: 1000`)
11. Attempting to insert `userId` as a number
12. Attempting to insert `jobId` as a number

## Test Runner (firestore.rules.test.ts structure)
```typescript
// Test 1: Fail write with wrong userId
// Test 2: Fail write with non-existent jobId (need get() check)
// Test 3: Fail write with future appliedAt
// Test 4: Fail update to invalid status
```
