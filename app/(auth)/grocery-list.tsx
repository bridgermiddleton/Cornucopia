import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

interface DietaryRestriction {
  id: string;
  name: string;
  selected: boolean;
}

interface CuisineType {
  id: string;
  name: string;
  selected: boolean;
}

interface MealType {
  id: string;
  name: string;
  selected: boolean;
}

interface UserPreferences {
  dietaryRestrictions: DietaryRestriction[];
  cuisineTypes: CuisineType[];
  mealTypes: MealType[];
  budget: string;
}

export default function GroceryListScreen() {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>({
    dietaryRestrictions: [
      { id: '1', name: 'Vegetarian', selected: false },
      { id: '2', name: 'Vegan', selected: false },
      { id: '3', name: 'Gluten-Free', selected: false },
      { id: '4', name: 'Dairy-Free', selected: false },
      { id: '5', name: 'Nut-Free', selected: false },
    ],
    cuisineTypes: [
      { id: '1', name: 'Italian', selected: false },
      { id: '2', name: 'Mexican', selected: false },
      { id: '3', name: 'American', selected: false },
      { id: '4', name: 'Asian', selected: false },
      { id: '5', name: 'Mediterranean', selected: false },
    ],
    mealTypes: [
      { id: '1', name: 'Breakfast', selected: false },
      { id: '2', name: 'Lunch', selected: false },
      { id: '3', name: 'Dinner', selected: false },
      { id: '4', name: 'Snacks', selected: false },
    ],
    budget: '',
  });

  useEffect(() => {
    loadUserPreferences();
  }, []);

  const loadUserPreferences = async () => {
    setLoading(true);
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return;

      const userDoc = await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .get();

      if (userDoc.exists) {
        const data = userDoc.data();
        if (data?.groceryPreferences) {
          setPreferences(prevPreferences => ({
            ...prevPreferences,
            ...data.groceryPreferences,
          }));
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      Alert.alert('Error', 'Failed to load your preferences');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setLoading(true);
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return;

      await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .set({
          groceryPreferences: preferences,
        }, { merge: true });

      Alert.alert('Success', 'Your preferences have been saved');
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save your preferences');
    } finally {
      setLoading(false);
    }
  };

  const toggleDietaryRestriction = (id: string) => {
    setPreferences(prev => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.map(item =>
        item.id === id ? { ...item, selected: !item.selected } : item
      ),
    }));
  };

  const toggleCuisineType = (id: string) => {
    setPreferences(prev => ({
      ...prev,
      cuisineTypes: prev.cuisineTypes.map(item =>
        item.id === id ? { ...item, selected: !item.selected } : item
      ),
    }));
  };

  const toggleMealType = (id: string) => {
    setPreferences(prev => ({
      ...prev,
      mealTypes: prev.mealTypes.map(item =>
        item.id === id ? { ...item, selected: !item.selected } : item
      ),
    }));
  };

  const generateGroceryList = async () => {
    // We'll implement the AI integration here in the next step
    Alert.alert('Coming Soon', 'AI-powered grocery list generation will be implemented soon!');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Grocery List Generator',
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTintColor: '#333',
        }}
      />

      <ScrollView style={styles.scrollView}>
        {/* Budget Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Budget</Text>
          <TextInput
            style={styles.budgetInput}
            placeholder="Enter your budget"
            value={preferences.budget}
            onChangeText={(text) => setPreferences(prev => ({ ...prev, budget: text }))}
            keyboardType="numeric"
          />
        </View>

        {/* Meal Types Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meal Types</Text>
          {preferences.mealTypes.map((meal) => (
            <TouchableOpacity
              key={meal.id}
              style={styles.optionRow}
              onPress={() => toggleMealType(meal.id)}
            >
              <Text style={styles.optionText}>{meal.name}</Text>
              <Switch
                value={meal.selected}
                onValueChange={() => toggleMealType(meal.id)}
                trackColor={{ false: '#767577', true: '#4A90E2' }}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Dietary Restrictions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dietary Restrictions</Text>
          {preferences.dietaryRestrictions.map((restriction) => (
            <TouchableOpacity
              key={restriction.id}
              style={styles.optionRow}
              onPress={() => toggleDietaryRestriction(restriction.id)}
            >
              <Text style={styles.optionText}>{restriction.name}</Text>
              <Switch
                value={restriction.selected}
                onValueChange={() => toggleDietaryRestriction(restriction.id)}
                trackColor={{ false: '#767577', true: '#4A90E2' }}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Cuisine Types Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferred Cuisines</Text>
          {preferences.cuisineTypes.map((cuisine) => (
            <TouchableOpacity
              key={cuisine.id}
              style={styles.optionRow}
              onPress={() => toggleCuisineType(cuisine.id)}
            >
              <Text style={styles.optionText}>{cuisine.name}</Text>
              <Switch
                value={cuisine.selected}
                onValueChange={() => toggleCuisineType(cuisine.id)}
                trackColor={{ false: '#767577', true: '#4A90E2' }}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={savePreferences}
          >
            <Text style={styles.buttonText}>Save Preferences</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.generateButton]}
            onPress={generateGroceryList}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Generate Grocery List</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  budgetInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
  },
  buttonContainer: {
    padding: 16,
    gap: 12,
  },
  button: {
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButton: {
    backgroundColor: '#4A90E2',
  },
  generateButton: {
    backgroundColor: '#32CD32',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 