/**
 * Manager stack — leaf screens opened from the field shell (More, Home).
 *
 * These routes are NOT a separate tab tree. Opening Approvals, team attendance,
 * or live tracking from More should slide in a stack screen (like Expenses),
 * not swap the bottom bar to Team / Attendance / Approvals.
 */
import { Stack } from 'expo-router';

export default function ManagerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
