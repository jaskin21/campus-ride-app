// ─── DynamoDB Single Table Key Patterns ───────────────
//
// STOP QUEUE ENTRY
// PK: STOP#{stopId}        SK: QUEUE#{timestamp}#{userId}
// Used to list all students queued at a stop (sorted by join time)
//
// USER QUEUE STATE
// PK: USER#{userId}        SK: QUEUE#ACTIVE
// Used to check if a student is already in a queue
//
// STOP METADATA
// PK: STOP#{stopId}        SK: METADATA
// Used to get stop info, queue count, active status

export const Keys = {
  stopQueue: (stopId: string, timestamp: string, userId: string) => ({
    PK: `STOP#${stopId}`,
    SK: `QUEUE#${timestamp}#${userId}`,
  }),

  userQueueState: (userId: string) => ({
    PK: `USER#${userId}`,
    SK: 'QUEUE#ACTIVE',
  }),

  stopMeta: (stopId: string) => ({
    PK: `STOP#${stopId}`,
    SK: 'METADATA',
  }),
}

export const TABLE_NAME = process.env.TABLE_NAME ?? ''