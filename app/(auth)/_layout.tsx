import { Stack } from "expo-router";
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
    return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: '#8E8E93',
        }}
      >
        {/* Home Tab */}
        <Tabs.Screen
          name="home" // This should match the file name: home.tsx
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" color={color} size={size} />
            ),
          }}
        />
  
        {/* Fridge Tab */}
        <Tabs.Screen
          name="fridge" // Matches fridge.tsx
          options={{
            title: 'My Fridge',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="restaurant" color={color} size={size} />
            ),
          }}
        />

        {/* Grocery List Tab */}
        <Tabs.Screen
          name="grocery-list" // Matches recipes.tsx
          options={{
            title: 'Grocery List',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="list" color={color} size={size} />
            ),
          }}
        />
  
         {/* Profile Tab */}
        <Tabs.Screen
          name="profile" // Matches recipes.tsx
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" color={color} size={size} />
            ),
          }}
        />

        {/* Hide grocery-settings from navigation */}
        <Tabs.Screen
          name="grocery-settings"
          options={{
            href: null,
          }}
        />
      </Tabs>
      
    );
  }