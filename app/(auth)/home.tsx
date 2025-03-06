import { Stack } from "expo-router";
import auth from '@react-native-firebase/auth';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const HomeScreen = () => {
  const user = auth().currentUser;
  const router = useRouter();
  const [location, setLocation] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
    })();
  }, []);

  let locationText = 'Fetching your location...';
  if (errorMsg) {
    locationText = errorMsg;
  } else if (location) {
    const { latitude, longitude } = location.coords;
    locationText = `Latitude: ${latitude.toFixed(4)}, Longitude: ${longitude.toFixed(4)}`;
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.title}>Cornucopia</Text>
        <Text style={styles.subtitle}>Smart Grocery Planning</Text>
      </View>

      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Welcome back, {user?.email?.split('@')[0]}</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={() => auth().signOut()}>
          <Ionicons name="log-out-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Main Features Grid */}
      <View style={styles.featuresGrid}>
        {/* Fridge Inventory Card */}
        <TouchableOpacity style={styles.featureCard} onPress={() => router.push('/fridge')}>
          <View style={[styles.iconContainer, { backgroundColor: '#FFE5E5' }]}>
            <Ionicons name="ice-cream-outline" size={32} color="#FF6B6B" />
          </View>
          <Text style={styles.featureTitle}>My Fridge</Text>
          <Text style={styles.featureDescription}>Track your food inventory</Text>
        </TouchableOpacity>

        {/* Grocery Settings Card */}
        <TouchableOpacity style={styles.featureCard} onPress={() => router.push('/grocery-settings')}>
          <View style={[styles.iconContainer, { backgroundColor: '#E5F6FF' }]}>
            <Ionicons name="storefront-outline" size={32} color="#4A90E2" />
          </View>
          <Text style={styles.featureTitle}>Grocery Settings</Text>
          <Text style={styles.featureDescription}>Manage store preferences</Text>
        </TouchableOpacity>

        {/* Profile Card */}
        <TouchableOpacity style={styles.featureCard} onPress={() => router.push('/profile')}>
          <View style={[styles.iconContainer, { backgroundColor: '#E5FFE5' }]}>
            <Ionicons name="person-outline" size={32} color="#4CAF50" />
          </View>
          <Text style={styles.featureTitle}>Profile</Text>
          <Text style={styles.featureDescription}>Manage your account</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions Section */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/fridge')}>
            <Ionicons name="add-circle-outline" size={24} color="#666" />
            <Text style={styles.actionText}>Add Item</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/grocery-settings')}>
            <Ionicons name="settings-outline" size={24} color="#666" />
            <Text style={styles.actionText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  welcomeText: {
    fontSize: 18,
    color: '#333',
  },
  signOutButton: {
    padding: 8,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
  },
  quickActions: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    width: '45%',
  },
  actionText: {
    marginTop: 5,
    fontSize: 14,
    color: '#666',
  },
});

export default HomeScreen;