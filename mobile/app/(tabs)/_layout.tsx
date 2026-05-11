import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, FontWeight } from '../../constants/Colors';

function TabIcon({ name, outlineName, color, focused, size }: { name: any; outlineName: any; color: string; focused: boolean; size: number }) {
  return (
    <View style={styles.iconWrap}>
      {focused && <View style={styles.activeDot} />}
      <Ionicons name={focused ? name : outlineName} size={size} color={color} />
    </View>
  );
}

function CheckInTabIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <View style={[styles.checkInWrap, focused && styles.checkInWrapActive]}>
      <Ionicons name={focused ? 'clipboard' : 'clipboard-outline'} size={22} color={focused ? '#FFF' : Colors.neutral.mediumGray} />
    </View>
  );
}

function MessageBadge() {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>2</Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary.teal,
        tabBarInactiveTintColor: Colors.neutral.mediumGray,
        tabBarStyle: {
          backgroundColor: Colors.neutral.white,
          borderTopWidth: 1,
          borderTopColor: Colors.border.light,
          paddingBottom: 10,
          paddingTop: 8,
          height: 72,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.07,
          shadowRadius: 12,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: FontSize.xs,
          fontWeight: FontWeight.semibold,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused, size }) => (
            <TabIcon name="home" outlineName="home-outline" color={color} focused={focused} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="checkin"
        options={{
          title: 'Check-In',
          tabBarIcon: ({ color, focused }) => <CheckInTabIcon color={color} focused={focused} />,
          tabBarItemStyle: { paddingBottom: 2 },
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused, size }) => (
            <View style={styles.iconWrap}>
              {focused && <View style={styles.activeDot} />}
              <View>
                <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={size} color={color} />
                <MessageBadge />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused, size }) => (
            <TabIcon name="person" outlineName="person-outline" color={color} focused={focused} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', gap: 2 },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary.teal,
    position: 'absolute',
    top: -6,
  },
  checkInWrap: {
    width: 48,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    marginBottom: 2,
  },
  checkInWrapActive: {
    backgroundColor: Colors.primary.teal,
  },
  badge: {
    position: 'absolute',
    right: -8,
    top: -4,
    backgroundColor: Colors.semantic.error,
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: Colors.neutral.white,
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
});
