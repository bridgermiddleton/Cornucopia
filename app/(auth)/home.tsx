import { Stack } from "expo-router";
import auth from '@react-native-firebase/auth';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Button } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router'; // Notice the change: expo-router's hook

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
    <View style={styles.container}>
      <Text style={styles.title}>Cornucopia</Text>
      <Text style={styles.subtitle}>Shop smarter and stay within your budget!</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Current Location:</Text>
        <Text>{locationText}</Text>
      </View>

      <View>
        <Text>Welcome back {user?.email}</Text>
        <Button title="Sign out" onPress={() => auth().signOut()}></Button>
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#c9c0b7',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    width: '100%',
    marginBottom: 20,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  buttonsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#4287f5',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 8,
    marginBottom: 15,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  aiSection: {
    marginTop: 30,
    width: '100%',
    alignItems: 'center',
  },
});

export default HomeScreen;