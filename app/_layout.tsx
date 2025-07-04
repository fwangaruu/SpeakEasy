import { Ionicons } from '@expo/vector-icons';
import { Drawer } from 'expo-router/drawer';

export default function RootLayout() {
  return (
    <Drawer>
      <Drawer.Screen
        name="index"
        options={{
          title: 'Home',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="capture"
        options={{
          title: 'Capture Text',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="camera" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="practice"
        options={{
          title: 'Practice',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="mic" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="history"
        options={{
          title: 'History',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="time" size={size} color={color} />
          ),
        }}
      />
    </Drawer>
  );
}
