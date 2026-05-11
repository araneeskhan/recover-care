import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../hooks/useAuth';
import { Colors } from '../constants/Colors';
import { ThemeProvider } from '../constants/Colors';

export default function RootLayout() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background.primary },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="medications"
          options={{ headerShown: false, presentation: 'card' }}
        />
        <Stack.Screen name="chat"
          options={{ headerShown: false, presentation: 'card' }}
        />
        <Stack.Screen name="edit-profile"
          options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="history"
          options={{ headerShown: false, presentation: 'card' }}
        />
        <Stack.Screen name="appointments"
          options={{ headerShown: false, presentation: 'card' }}
        />
        <Stack.Screen name="resources"
          options={{ headerShown: false, presentation: 'card' }}
        />
        <Stack.Screen name="alerts"
          options={{ headerShown: false, presentation: 'card' }}
        />
        <Stack.Screen name="wound-journal"
          options={{ headerShown: false, presentation: 'card' }}
        />
        <Stack.Screen name="symptom-glossary"
          options={{ headerShown: false, presentation: 'card' }}
        />
        <Stack.Screen name="health-report"
          options={{ headerShown: false, presentation: 'card' }}
        />
      </Stack>
    </AuthProvider>
    </ThemeProvider>
  );
}
