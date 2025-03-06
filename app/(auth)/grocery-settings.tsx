import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  Platform,
  TextInput,
  Keyboard,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {
  checkLocationPermission,
  requestLocationPermission,
  getCurrentLocation,
  LocationPermissionStatus,
  Location,
} from '../utils/locationUtils';
import {
  searchPlaces,
  getNearbyGroceryStores,
  getPlaceDetails,
  PlacePrediction,
  GroceryStore,
} from '../utils/placesUtils';
import debounce from 'lodash/debounce';

interface UserPreferences {
  preferredStore?: {
    id: string;
    name: string;
    address: string;
    location?: {
      lat: number;
      lng: number;
    };
  };
  location?: {
    city: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
}

export default function GrocerySettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState<LocationPermissionStatus>('unavailable');
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [nearbyStores, setNearbyStores] = useState<GroceryStore[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [placePredictions, setPlacePredictions] = useState<PlacePrediction[]>([]);
  const [searching, setSearching] = useState(false);

  // Update the debounced search to be more responsive
  const debouncedSearch = useCallback(
    debounce(async (text: string) => {
      if (text.length >= 2) { // Reduced to 2 characters for better responsiveness
        const predictions = await searchPlaces(text);
        setPlacePredictions(predictions);
      } else {
        setPlacePredictions([]);
      }
      setSearching(false);
    }, 200), // Reduced debounce time for better responsiveness
    []
  );

  // Handle search input changes
  const handleSearchInputChange = (text: string) => {
    setSearchInput(text);
    setSearching(true);
    debouncedSearch(text);
  };

  useEffect(() => {
    checkInitialPermission();
    loadUserPreferences();
  }, []);

  const checkInitialPermission = async () => {
    const status = await checkLocationPermission();
    setLocationPermission(status);

    if (status === 'granted') {
      getCurrentLocationAndUpdate();
    }
    
    setLoading(false);
  };

  const handleRequestPermission = async () => {
    const status = await requestLocationPermission();
    setLocationPermission(status);

    if (status === 'granted') {
      getCurrentLocationAndUpdate();
    } else {
      Alert.alert(
        'Location Permission Required',
        'Please enable location permissions in your device settings to use this feature.',
        [{ text: 'OK' }]
      );
    }
  };

  const getCurrentLocationAndUpdate = async () => {
    try {
      const location = await getCurrentLocation();
      await updateUserLocation(location.latitude, location.longitude);
      fetchNearbyStores(location.latitude, location.longitude);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please search for your location manually.',
        [{ text: 'OK' }]
      );
    }
  };

  const loadUserPreferences = async () => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    const userDoc = await firestore()
      .collection('users')
      .doc(currentUser.uid)
      .get();

    if (userDoc.exists) {
      const preferences = userDoc.data()?.preferences || {};
      setUserPreferences(preferences);
      
      if (preferences.location?.city) {
        setSearchInput(preferences.location.city);
      }
    }
  };

  const updateUserLocation = async (latitude: number, longitude: number) => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    await firestore()
      .collection('users')
      .doc(currentUser.uid)
      .set({
        preferences: {
          ...userPreferences,
          location: {
            ...userPreferences?.location,
            coordinates: { latitude, longitude },
          },
        },
      }, { merge: true });
  };

  const handlePlaceSelection = async (prediction: PlacePrediction) => {
    setLoading(true);
    setPlacePredictions([]);
    setSearchInput(prediction.description);
    Keyboard.dismiss();

    try {
      const location = await getPlaceDetails(prediction.place_id);
      if (location) {
        await updateUserLocation(location.lat, location.lng);
        await fetchNearbyStores(location.lat, location.lng);
        
        // Update user preferences with selected city
        const currentUser = auth().currentUser;
        if (currentUser) {
          await firestore()
            .collection('users')
            .doc(currentUser.uid)
            .set({
              preferences: {
                ...userPreferences,
                location: {
                  city: prediction.description,
                  coordinates: { latitude: location.lat, longitude: location.lng },
                },
              },
            }, { merge: true });
        }
      }
    } catch (error) {
      console.error('Error handling place selection:', error);
      Alert.alert('Error', 'Failed to get location details. Please try again.');
    }
    
    setLoading(false);
  };

  const fetchNearbyStores = async (latitude: number, longitude: number) => {
    try {
      const stores = await getNearbyGroceryStores(latitude, longitude);
      setNearbyStores(stores);
    } catch (error) {
      console.error('Error fetching nearby stores:', error);
      Alert.alert('Error', 'Failed to fetch nearby stores. Please try again.');
    }
  };

  const selectPreferredStore = async (store: GroceryStore) => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    try {
      await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .set({
          preferences: {
            ...userPreferences,
            preferredStore: {
              id: store.id,
              name: store.name,
              address: store.address,
              location: store.location,
            },
          },
        }, { merge: true });

      setUserPreferences(prev => ({
        ...prev,
        preferredStore: {
          id: store.id,
          name: store.name,
          address: store.address,
          location: store.location,
        },
      }));

      Alert.alert('Success', `${store.name} set as your preferred store`);
    } catch (error) {
      console.error('Error setting preferred store:', error);
      Alert.alert('Error', 'Failed to set preferred store. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Grocery Store Settings</Text>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by city, state, or zip code"
          value={searchInput}
          onChangeText={handleSearchInputChange}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
        {searching && (
          <ActivityIndicator style={styles.searchingIndicator} size="small" color="#3498db" />
        )}
      </View>

      {placePredictions.length > 0 && (
        <View style={styles.predictionsContainer}>
          <FlatList
            data={placePredictions}
            keyExtractor={(item) => item.place_id}
            keyboardShouldPersistTaps="always"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.predictionItem}
                onPress={() => handlePlaceSelection(item)}
              >
                <Text style={styles.predictionText}>{item.description}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {!locationPermission && (
        <TouchableOpacity
          style={styles.locationButton}
          onPress={handleRequestPermission}
        >
          <Text style={styles.locationButtonText}>Use Current Location</Text>
        </TouchableOpacity>
      )}

      {userPreferences?.preferredStore && (
        <View style={styles.preferredStoreContainer}>
          <Text style={styles.sectionTitle}>Your Preferred Store</Text>
          <View style={styles.preferredStoreCard}>
            <Text style={[styles.storeName, { color: '#fff' }]}>{userPreferences.preferredStore.name}</Text>
            <Text style={[styles.storeAddress, { color: '#fff' }]}>{userPreferences.preferredStore.address}</Text>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>Nearby Stores</Text>
      {nearbyStores.length > 0 ? (
        <FlatList
          data={nearbyStores}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.storeCard,
                userPreferences?.preferredStore?.id === item.id && styles.selectedStoreCard,
              ]}
              onPress={() => selectPreferredStore(item)}
            >
              <View style={styles.storeInfo}>
                <Text style={styles.storeName}>{item.name}</Text>
                <Text style={styles.storeAddress}>{item.address}</Text>
              </View>
              {item.distance && (
                <Text style={styles.storeDistance}>{item.distance}</Text>
              )}
            </TouchableOpacity>
          )}
        />
      ) : (
        <Text style={styles.noStoresText}>No stores found nearby. Try searching for a different location.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f6fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  searchingIndicator: {
    position: 'absolute',
    right: 12,
  },
  predictionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    maxHeight: 200,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  predictionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  predictionText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  locationButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
  },
  preferredStoreContainer: {
    marginBottom: 20,
  },
  preferredStoreCard: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  storeCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  selectedStoreCard: {
    borderColor: '#3498db',
    borderWidth: 2,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  storeAddress: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  storeDistance: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '600',
  },
  storeInfo: {
    flex: 1,
    marginRight: 10,
  },
  noStoresText: {
    textAlign: 'center',
    color: '#7f8c8d',
    marginTop: 20,
    fontSize: 16,
  },
}); 