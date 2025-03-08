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
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
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
  const [loading, setLoading] = useState(false);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [nearbyStores, setNearbyStores] = useState<GroceryStore[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [placePredictions, setPlacePredictions] = useState<PlacePrediction[]>([]);
  const [searching, setSearching] = useState(false);

  // Update the debounced search to be more responsive
  const debouncedSearch = useCallback(
    debounce(async (text: string) => {
      if (text.length >= 2) {
        const predictions = await searchPlaces(text);
        setPlacePredictions(predictions);
      } else {
        setPlacePredictions([]);
      }
      setSearching(false);
    }, 200),
    []
  );

  // Handle search input changes
  const handleSearchInputChange = (text: string) => {
    setSearchInput(text);
    setSearching(true);
    debouncedSearch(text);
  };

  useEffect(() => {
    loadUserPreferences();
  }, []);

  const loadUserPreferences = async () => {
    setLoading(true);
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        router.replace('/');
        return;
      }

      const userDoc = await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .get();

      if (userDoc.exists) {
        const preferences = userDoc.data()?.preferences || {};
        setUserPreferences(preferences);
        
        if (preferences.location?.city) {
          setSearchInput(preferences.location.city);
          // If they have a saved location, automatically fetch nearby stores
          if (preferences.location.coordinates) {
            const stores = await getNearbyGroceryStores(
              preferences.location.coordinates.latitude,
              preferences.location.coordinates.longitude
            );
            setNearbyStores(stores);
          }
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      Alert.alert('Error', 'Failed to load your preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceSelection = async (prediction: PlacePrediction) => {
    setLoading(true);
    setPlacePredictions([]);
    setSearchInput(prediction.description);
    Keyboard.dismiss();

    try {
      const location = await getPlaceDetails(prediction.place_id);
      if (location) {
        const stores = await getNearbyGroceryStores(location.lat, location.lng);
        setNearbyStores(stores);
        
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
    } finally {
      setLoading(false);
    }
  };

  const selectPreferredStore = async (store: GroceryStore) => {
    setLoading(true);
    const currentUser = auth().currentUser;
    if (!currentUser) {
      router.replace('/');
      return;
    }

    try {
      const updatedPreferences = {
        ...userPreferences,
        preferredStore: {
          id: store.id,
          name: store.name,
          address: store.address,
          location: store.location,
        },
      };

      await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .set({
          preferences: updatedPreferences,
        }, { merge: true });

      setUserPreferences(updatedPreferences);

      Alert.alert(
        'Store Selected',
        `${store.name} has been set as your preferred store.`,
        [
          {
            text: 'OK',
            onPress: () => router.back() // Return to home screen after selection
          }
        ]
      );
    } catch (error) {
      console.error('Error setting preferred store:', error);
      Alert.alert('Error', 'Failed to set preferred store. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Select Store',
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTintColor: '#333',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()}
              style={styles.headerButton}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          ),
        }} 
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      ) : (
        <>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
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
              <ActivityIndicator style={styles.searchingIndicator} size="small" color="#4A90E2" />
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
                    <Ionicons name="location" size={20} color="#666" style={styles.predictionIcon} />
                    <Text style={styles.predictionText}>{item.description}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {userPreferences?.preferredStore && (
            <View style={styles.preferredStoreContainer}>
              <Text style={styles.sectionTitle}>Current Preferred Store</Text>
              <View style={styles.preferredStoreCard}>
                <Ionicons name="star" size={24} color="#FFF" style={styles.preferredIcon} />
                <View>
                  <Text style={styles.preferredStoreName}>{userPreferences.preferredStore.name}</Text>
                  <Text style={styles.preferredStoreAddress}>{userPreferences.preferredStore.address}</Text>
                </View>
              </View>
            </View>
          )}

          {nearbyStores.length > 0 ? (
            <View style={styles.storesContainer}>
              <Text style={styles.sectionTitle}>Available Stores</Text>
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
            </View>
          ) : (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="search" size={48} color="#CCC" />
              <Text style={styles.noStoresText}>
                Search for a location to find stores near you
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  headerButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  searchingIndicator: {
    marginLeft: 8,
  },
  predictionsContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxHeight: 200,
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  predictionIcon: {
    marginRight: 12,
  },
  predictionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  preferredStoreContainer: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  preferredStoreCard: {
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  preferredIcon: {
    marginRight: 12,
  },
  preferredStoreName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  preferredStoreAddress: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  storesContainer: {
    flex: 1,
    margin: 16,
  },
  storeCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedStoreCard: {
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  storeInfo: {
    flex: 1,
    marginRight: 12,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  storeAddress: {
    fontSize: 14,
    color: '#666',
  },
  storeDistance: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noStoresText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
}); 