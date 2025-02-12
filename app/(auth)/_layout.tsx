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
          name="myfridge" // Matches fridge.tsx
          options={{
            title: 'My Fridge',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="restaurant" color={color} size={size} />
            ),
          }}
        />
  
        {/* Budget Tab */}
        <Tabs.Screen
          name="budget" // Matches budget.tsx
          options={{
            title: 'Budget',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="wallet" color={color} size={size} />
            ),
          }}
        />
  
        {/* Grocery Stores Tab */}
        <Tabs.Screen
          name="grocerystores" // Matches grocerystores.tsx
          options={{
            title: 'Stores',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="storefront" color={color} size={size} />
            ),
          }}
        />
  
        {/* Recipes Tab */}
        <Tabs.Screen
          name="recipes" // Matches recipes.tsx
          options={{
            title: 'Recipes',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="book" color={color} size={size} />
            ),
          }}
        />
      </Tabs>
    );
  }