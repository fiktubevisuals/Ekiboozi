# Security Specification for Watch History

## Data Invariants
- A watch history entry must have a valid `userId` (matches the current user's UID), a valid `videoId` (exists in the videos collection), and a valid `watchedAt` timestamp.
- Users can only read and write their own watch history.

## The "Dirty Dozen" Payloads (Examples of invalid writes)
1. Write with different `userId` (spoofing)
2. Write with non-existent `videoId`
3. Write with `watchedAt` in the future
4. Write with invalid `userId` format
5. Write with invalid `videoId` format
6. Attempting to delete someone else's watch history
7. Attempting to list someone else's watch history
8. Attempting to update a watch history entry
9. Attempting to insert a "Ghost Field" (e.g., `isVerified: true`)
10. Attempting to insert `userId` as a number
11. Attempting to insert `videoId` as a number
12. Attempting to insert `watchedAt` as a number

## Test Runner (firestore.rules.test.ts structure)
```typescript
// Test 1: Fail write with wrong userId
// Test 2: Fail write with non-existent videoId (need get() check)
// Test 3: Fail write with future watchedAt
...
```
