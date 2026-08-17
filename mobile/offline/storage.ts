/**
 * Local-first storage for site data captured with no/poor connectivity.
 * Everything written here waits in a queue until sync.ts can reach the API.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'

const QUEUE_KEY = 'offline_queue_v1'

export type QueuedAction = {
  id: string
  endpoint: string
  method: 'POST' | 'PATCH'
  payload: unknown
  createdAt: string
}

export async function enqueue(action: Omit<QueuedAction, 'id' | 'createdAt'>) {
  const queue = await getQueue()
  const entry: QueuedAction = {
    ...action,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
  }
  queue.push(entry)
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  return entry
}

export async function getQueue(): Promise<QueuedAction[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY)
  return raw ? JSON.parse(raw) : []
}

export async function removeFromQueue(id: string) {
  const queue = await getQueue()
  const next = queue.filter((item) => item.id !== id)
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(next))
}
