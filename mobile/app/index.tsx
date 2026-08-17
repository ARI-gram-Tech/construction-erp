/**
 * app/index.tsx — Site home screen.
 * Mirrors the blueprint's mobile design rules: large (48px+) touch targets,
 * few steps, offline indicator visible at all times, camera-first daily report.
 * Uses expo-router file-based routing — each action navigates to its own
 * screen under features/.
 */
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { getQueue } from '../offline/storage'

const ACTIONS = [
  { label: 'Start Attendance', route: '/attendance' },
  { label: 'Daily Report', route: '/daily-report' },
  { label: 'Request Material', route: '/materials' },
  { label: 'Request Equipment', route: '/equipment' },
  { label: 'Safety Report', route: '/safety' },
] as const

export default function HomeScreen() {
  const router = useRouter()
  const [pendingSync, setPendingSync] = useState(0)

  useEffect(() => {
    getQueue().then((q) => setPendingSync(q.length))
  }, [])

  // TODO(Phase 3): replace with the authenticated user's real name/project
  const userName = 'John'
  const projectName = 'Nairobi Mall'

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Good Morning, {userName}</Text>
      <Text style={styles.project}>Project: {projectName}</Text>

      {pendingSync > 0 && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            Offline Mode — {pendingSync} report{pendingSync === 1 ? '' : 's'} waiting to sync
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        {ACTIONS.map((a) => (
          <Pressable
            key={a.route}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={() => router.push(a.route as never)}
          >
            <Text style={styles.buttonText}>{a.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f5f6', // steel-50
    padding: 20,
    paddingTop: 60,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0b2545', // primary-900
  },
  project: {
    fontSize: 14,
    color: '#64748b', // steel-500
    marginTop: 4,
    marginBottom: 20,
  },
  offlineBanner: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  offlineText: {
    color: '#92400e',
    fontSize: 13,
    fontWeight: '500',
  },
  actions: {
    gap: 12,
  },
  button: {
    backgroundColor: '#163a5f', // primary-700
    minHeight: 56, // well above the 48px minimum touch target
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonPressed: {
    backgroundColor: '#0b2545',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
})
