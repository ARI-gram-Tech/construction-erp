/**
 * Call trySync() whenever connectivity is (re)detected — e.g. from a
 * NetInfo listener in app/_layout.tsx. Each queued action is retried in
 * order; a failure stops the run so ordering (e.g. checkin before checkout)
 * is preserved for the next attempt.
 */
import { api } from '../services/api'
import { getQueue, removeFromQueue } from './storage'

export async function trySync(): Promise<{ synced: number; remaining: number }> {
  const queue = await getQueue()
  let synced = 0

  for (const action of queue) {
    try {
      if (action.method === 'POST') {
        await api.post(action.endpoint, action.payload)
      } else {
        await api.patch(action.endpoint, action.payload)
      }
      await removeFromQueue(action.id)
      synced += 1
    } catch {
      // Stop on first failure — likely still offline. Remaining items stay queued.
      break
    }
  }

  const remaining = (await getQueue()).length
  return { synced, remaining }
}
