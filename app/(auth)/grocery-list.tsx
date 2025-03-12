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
  Modal,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '../config/keys';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Required for React Native
});

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

interface FridgeItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expirationDate: string;
}

interface StorePreference {
  id: string;
  name: string;
  address: string;
  location?: {
    lat: number;
    lng: number;
  };
}

interface MealPlan {
  day: string;
  meals: {
    type: string;
    recipe: string;
    ingredients: string[];
  }[];
}

interface GroceryList {
  mealPlan: MealPlan[];
  shoppingList: {
    category: string;
    items: string[];
  }[];
  estimatedCost: string;
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
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
  const [generatedList, setGeneratedList] = useState<GroceryList | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [storePreference, setStorePreference] = useState<StorePreference | null>(null);

  useEffect(() => {
    loadUserPreferences();
    loadFridgeItems();
    loadStorePreference();
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

  const loadFridgeItems = async () => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return;

      const fridgeSnapshot = await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .collection('fridge')
        .get();

      const items = fridgeSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FridgeItem[];

      setFridgeItems(items);
    } catch (error) {
      console.error('Error loading fridge items:', error);
    }
  };

  const loadStorePreference = async () => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return;

      const userDoc = await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .get();

      if (userDoc.exists) {
        const data = userDoc.data();
        if (data?.preferences?.preferredStore) {
          setStorePreference(data.preferences.preferredStore);
        }
      }
    } catch (error) {
      console.error('Error loading store preference:', error);
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

  const generatePrompt = () => {
    const selectedDietary = preferences.dietaryRestrictions
      .filter(r => r.selected)
      .map(r => r.name);
    
    const selectedCuisines = preferences.cuisineTypes
      .filter(c => c.selected)
      .map(c => c.name);
    
    const selectedMeals = preferences.mealTypes
      .filter(m => m.selected)
      .map(m => m.name);

    const fridgeInventory = fridgeItems.map(item => 
      `${item.name} (${item.quantity} ${item.unit}, expires: ${item.expirationDate})`
    );

    const storeInfo = storePreference 
      ? `\nPreferred Store: ${storePreference.name}
Location: ${storePreference.address}
${storePreference.location ? `Coordinates: ${storePreference.location.lat}, ${storePreference.location.lng}` : ''}`
      : '\nNo preferred store selected';

    return `You are a meal planning assistant that ONLY responds with valid JSON. Your response must be parseable JSON that matches the structure provided below. Do not include any explanatory text outside the JSON.

Required JSON Structure:
{
  "mealPlan": [
    {
      "day": "Monday",
      "meals": [
        {
          "type": "Breakfast",
          "recipe": "Recipe name",
          "ingredients": ["ingredient 1", "ingredient 2"]
        }
      ]
    }
  ],
  "shoppingList": [
    {
      "category": "Produce",
      "items": ["item 1", "item 2"]
    }
  ],
  "estimatedCost": "100.00"
}

User Preferences:
Budget: $${preferences.budget || 'flexible'} per week${storeInfo}

Dietary Restrictions: ${selectedDietary.length ? selectedDietary.join(', ') : 'None'}

Preferred Cuisines: ${selectedCuisines.length ? selectedCuisines.join(', ') : 'Any'}

Meals to Plan: ${selectedMeals.length ? selectedMeals.join(', ') : 'All meals'}

Current Fridge Inventory:
${fridgeInventory.length ? fridgeInventory.join('\n') : 'Empty'}

Requirements:
1. Generate a weekly meal plan with recipes for each selected meal type
2. Create a categorized grocery list that:
   - Excludes items already in the fridge
   - Includes all ingredients needed for the recipes
   - Is organized by store sections (produce, meat, dairy, etc.)
   - Uses pricing based on the specified store location
3. Include an estimated total cost based on typical prices at ${storePreference?.name || 'local grocery stores'}
4. Prioritize using items that will expire soon

Remember: Your entire response must be valid, parseable JSON matching the structure above.`;
  };

  const generateGroceryList = async () => {
    setGenerating(true);
    try {
      const prompt = generatePrompt();
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{
          role: "system",
          content: "You are a meal planning assistant that ONLY responds with valid JSON. Your entire response must be a valid JSON object with no additional text, markdown, or explanations. If you include any text outside the JSON structure, it will cause errors."
        }, {
          role: "user",
          content: prompt
        }],
        temperature: 0.7,
        max_tokens: 2000
      });

      if (!completion.choices[0]?.message?.content) {
        throw new Error('No response from OpenAI');
      }

      try {
        // Attempt to extract JSON if there's any extra text
        const content = completion.choices[0].message.content;
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}') + 1;
        const jsonStr = content.slice(jsonStart, jsonEnd);
        
        const result = JSON.parse(jsonStr);
        setGeneratedList(result);
        setShowResults(true);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        Alert.alert('Error', 'Failed to parse the generated list. Please try again.');
      }
    } catch (error) {
      console.error('Error generating list:', error);
      Alert.alert('Error', 'Failed to generate grocery list. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const ResultsCard = () => {
    if (!showResults || !generatedList) return null;

    return (
      <View style={styles.resultsCard}>
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>Your Meal Plan & Grocery List</Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowResults(false)}
          >
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.resultsContent}>
          <Text style={styles.estimatedCost}>
            Estimated Cost: ${generatedList.estimatedCost}
          </Text>

          {/* Meal Plan Section */}
          <Text style={styles.sectionTitle}>Weekly Meal Plan</Text>
          {generatedList.mealPlan.map((day, index) => (
            <View key={index} style={styles.dayContainer}>
              <Text style={styles.dayTitle}>{day.day}</Text>
              {day.meals.map((meal, mealIndex) => (
                <View key={mealIndex} style={styles.mealContainer}>
                  <Text style={styles.mealType}>{meal.type}</Text>
                  <Text style={styles.recipeName}>{meal.recipe}</Text>
                </View>
              ))}
            </View>
          ))}

          {/* Shopping List Section */}
          <Text style={styles.sectionTitle}>Shopping List</Text>
          {generatedList.shoppingList.map((category, index) => (
            <View key={index} style={styles.categoryContainer}>
              <Text style={styles.categoryTitle}>{category.category}</Text>
              {category.items.map((item, i) => (
                <Text key={i} style={styles.shoppingItem}>• {item}</Text>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    );
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
          title: 'Grocery List',
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

        {/* Results Card */}
        <ResultsCard />
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
  },
  dayContainer: {
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
  dayTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  mealContainer: {
    marginBottom: 16,
  },
  mealType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 8,
  },
  recipeName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  ingredientsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  ingredient: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  shoppingListContainer: {
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
  shoppingListTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 8,
  },
  shoppingItem: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  resultsCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  resultsContent: {
    padding: 16,
    maxHeight: 500, // Limit the height so it doesn't take up too much space
  },
  estimatedCost: {
    fontSize: 18,
    fontWeight: '600',
    color: '#32CD32',
    marginBottom: 16,
  },
}); 