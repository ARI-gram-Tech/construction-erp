import { View, Text, StyleSheet } from 'react-native'

// TODO(Phase 11): GPS check-in/out + photo, queued via ../offline/storage.ts
export default function AttendanceScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attendance</Text>
      <Text style={styles.body}>This screen is scaffolded for Phase 11.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60, backgroundColor: '#f4f5f6' },
  title: { fontSize: 20, fontWeight: '700', color: '#0b2545' },
  body: { fontSize: 14, color: '#64748b', marginTop: 8 },
})
