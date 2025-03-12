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
  daysToMealPlan: number;
  allowMealRepetition: boolean;
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

interface MealIngredient {
  item: string;
  amount: string;
  fromFridge: boolean;
  note?: string;
}

interface Meal {
  type: string;
  recipe: string;
  ingredients: MealIngredient[];
}

interface MealPlan {
  day: string;
  date: string;
  meals: Meal[];
}

interface ShoppingItem {
  name: string;
  quantity: string;
  estimatedPrice: string;
  note?: string;
}

interface ShoppingCategory {
  category: string;
  items: ShoppingItem[];
}

interface Store {
  name: string;
  address: string;
}

interface GroceryList {
  store: Store;
  mealPlan: MealPlan[];
  shoppingList: ShoppingCategory[];
  estimatedCost: string;
  savings: string;
  remainingBudget: string;
  fridgeItemsUsed: {
    item: string;
    amountNeeded: string;
    recipes: string[];
  }[];
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
    daysToMealPlan: 7,
    allowMealRepetition: true,
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
      if (!currentUser) {
        console.log('No authenticated user found');
        return;
      }
      console.log('Current user ID:', currentUser.uid);

      const fridgeRef = firestore()
        .collection('users')
        .doc(currentUser.uid)
        .collection('fridgeItems');
      
      console.log('Attempting to fetch from path:', fridgeRef.path);
      
      const fridgeSnapshot = await fridgeRef.get();
      console.log('Snapshot exists:', !fridgeSnapshot.empty);
      console.log('Number of documents:', fridgeSnapshot.size);

      const items = fridgeSnapshot.docs.map(doc => {
        console.log('Document data:', doc.id, doc.data());
        return {
          id: doc.id,
          ...doc.data()
        };
      }) as FridgeItem[];

      console.log('Processed fridge items:', items);
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
      .map(r => r.name).join(", ") || "None";
    
    const selectedCuisines = preferences.cuisineTypes
      .filter(c => c.selected)
      .map(c => c.name).join(", ") || "Any";
  
    const selectedMeals = preferences.mealTypes
      .filter(m => m.selected)
      .map(m => m.name).join(", ") || "All Meals";
  
    const fridgeInventory = fridgeItems.map(item => 
      `${item.name} (${item.quantity} ${item.unit}, expires: ${item.expirationDate})`
    ).join("\n") || "Empty";

    console.log('Fridge inventory being sent to prompt:', fridgeInventory);
  
    const storeDetails = storePreference
      ? `${storePreference.name}, ${storePreference.address}${storePreference.location ? ` (Coordinates: ${storePreference.location.lat}, ${storePreference.location.lng})` : ""}`
      : "Local stores nearby";
  
    const budgetText = preferences.budget ? `$${preferences.budget}` : "Flexible budget";
  
    return `
  You are an advanced meal-planning AI. Create a comprehensive grocery list and meal plan that maximizes the given budget for high-quality ingredients and diverse meals.

  ### User Preferences:
  - **Dietary Restrictions**: ${selectedDietary}
  - **Preferred Cuisines**: ${selectedCuisines}
  - **Meal Types Requested**: ${selectedMeals}
  - **Meal Planning Duration**: ${preferences.daysToMealPlan} days
  - **Weekly Budget**: ${budgetText}
  - **Meal Repetition Allowed**: ${preferences.allowMealRepetition ? "Yes" : "No"}
  
  ### Fridge Inventory:
  ${fridgeInventory}
  
  ### Grocery Store for Shopping:
  ${storeDetails}
  
  ### Instructions:
  1. Generate a complete ${preferences.daysToMealPlan}-day meal plan with diverse, filling meals.
  2. IMPORTANT: Use as much of the ${budgetText} as possible. This is your target spending amount, not a maximum limit.
  3. Focus on:
     - High-quality ingredients
     - Proper portion sizes
     - Variety in meals
     - Premium items when budget allows
  4. Create a shopping list that:
     - Uses ACTUAL package sizes (e.g., eggs in dozen)
     - Shows REAL prices from ${storePreference?.name || "local stores"}
     - Includes premium or organic options when budget permits
     - Groups items by store department
  5. Aim to get within 90-100% of the budget for better meal quality and variety.
  
  ### Response Format (STRICT JSON ONLY):
  {
    "store": {
      "name": "Store Name",
      "address": "Store Address"
    },
    "mealPlan": [
      {
        "day": "Monday",
        "date": "YYYY-MM-DD",
        "meals": [
          {
            "type": "Breakfast/Lunch/Dinner",
            "recipe": "Recipe name"
          }
        ]
      }
    ],
    "shoppingList": [
      {
        "category": "Category name (e.g., Produce, Dairy)",
        "items": [
          {
            "name": "Item name with brand if relevant",
            "quantity": "Full package size (e.g., 1 dozen, 16 oz package)",
            "estimatedPrice": "$X.XX",
            "note": "Optional note about premium/organic options"
          }
        ]
      }
    ],
    "fridgeItemsUsed": [
      {
        "item": "Item name",
        "amountNeeded": "Amount needed for recipes",
        "recipes": ["Recipe 1", "Recipe 2"]
      }
    ],
    "estimatedCost": "$Total cost",
    "remainingBudget": "$Remaining from budget"
  }
  
  **Important**: 
  1. Return ONLY valid JSON
  2. Include ALL ${preferences.daysToMealPlan} days in the meal plan
  3. Use REALISTIC package sizes and prices
  4. Aim to use 90-100% of the ${budgetText}
  5. Include premium or organic options to reach the target budget
  `;
  };
  

  const generateGroceryList = async () => {
    setGenerating(true);
    try {
      const prompt = generatePrompt();
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo",
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
          <Text style={styles.resultsTitle}>Meal Plan & Grocery List</Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowResults(false)}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
  
        <ScrollView style={styles.resultsContent}>
          {/* Store & Budget Summary */}
          <View style={styles.summaryContainer}>
            <Text style={styles.storeTitle}>{generatedList.store.name}</Text>
            <Text style={styles.storeAddress}>{generatedList.store.address}</Text>
            <View style={styles.budgetInfo}>
              <Text style={styles.estimatedCost}>Total Cost: {generatedList.estimatedCost}</Text>
              <Text style={styles.remainingBudget}>
                Remaining Budget: {generatedList.remainingBudget}
              </Text>
            </View>
          </View>
  
          {/* Meal Plan */}
          <Text style={styles.sectionHeader}>📅 Weekly Meal Plan</Text>
          {generatedList.mealPlan.map((day, idx) => (
            <View key={idx} style={styles.daySection}>
              <Text style={styles.dayHeader}>{day.day}, {day.date}</Text>
              {day.meals.map((meal, midx) => (
                <View key={midx} style={styles.mealItem}>
                  <Text style={styles.mealType}>{meal.type}:</Text>
                  <Text style={styles.recipeName}>{meal.recipe}</Text>
                </View>
              ))}
            </View>
          ))}
  
          {/* Shopping List */}
          <Text style={styles.sectionHeader}>🛒 Shopping List</Text>
          {generatedList.shoppingList.map((cat, cidx) => (
            <View key={cidx} style={styles.categorySection}>
              <Text style={styles.categoryHeader}>{cat.category}</Text>
              {cat.items.map((item, itemIdx) => (
                <View key={itemIdx} style={styles.shoppingListItem}>
                  <View style={styles.itemDetails}>
                    <Text style={styles.shoppingItemText}>
                      • {item.quantity} {item.name}
                    </Text>
                    {item.note && (
                      <Text style={styles.itemNote}>{item.note}</Text>
                    )}
                  </View>
                  <Text style={styles.priceText}>{item.estimatedPrice}</Text>
                </View>
              ))}
            </View>
          ))}

          {/* Fridge Items Used */}
          <Text style={styles.sectionHeader}>🧊 Items Used from Your Fridge</Text>
          <View style={styles.fridgeItemsSection}>
            {generatedList.fridgeItemsUsed.map((item, idx) => (
              <View key={idx} style={styles.fridgeItemContainer}>
                <View style={styles.fridgeItemHeader}>
                  <Text style={styles.fridgeItemName}>{item.item}</Text>
                  <Text style={styles.fridgeItemAmount}>{item.amountNeeded}</Text>
                </View>
                <Text style={styles.fridgeItemRecipes}>
                  Used in: {item.recipes.join(', ')}
                </Text>
              </View>
            ))}
          </View>
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

        {/* Days to Plan Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Days to Plan</Text>
          <View style={styles.optionRow}>
            <Text style={styles.optionText}>Number of Days (1-7)</Text>
            <TextInput
              style={[styles.budgetInput, { width: 80 }]}
              placeholder="7"
              value={preferences.daysToMealPlan === 7 ? "" : preferences.daysToMealPlan.toString()}
              onChangeText={(text) => {
                if (text === "") {
                  setPreferences(prev => ({ ...prev, daysToMealPlan: 7 }));
                  return;
                }
                const days = parseInt(text);
                if (!isNaN(days)) {
                  const constrainedDays = Math.min(Math.max(days, 1), 7);
                  setPreferences(prev => ({ ...prev, daysToMealPlan: constrainedDays }));
                }
              }}
              keyboardType="numeric"
              maxLength={1}
            />
          </View>
          <View style={styles.optionRow}>
            <Text style={styles.optionText}>Allow Meal Repetition</Text>
            <Switch
              value={preferences.allowMealRepetition}
              onValueChange={(value) => 
                setPreferences(prev => ({ ...prev, allowMealRepetition: value }))
              }
              trackColor={{ false: '#767577', true: '#4A90E2' }}
            />
          </View>
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
  resultsCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    overflow: 'hidden',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#4A90E2',
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  resultsContent: {
    padding: 16,
    maxHeight: 500,
  },
  summaryContainer: {
    backgroundColor: '#F2F7FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  storeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  storeAddress: {
    fontSize: 14,
    color: '#555',
    marginVertical: 4,
  },
  estimatedCost: {
    fontSize: 18,
    fontWeight: '700',
    color: '#27AE60',
    marginTop: 8,
  },
  savings: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F2994A',
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 6,
    marginBottom: 12,
    marginTop: 20,
  },
  daySection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
  },
  dayHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 8,
  },
  mealItem: {
    marginBottom: 12,
    paddingLeft: 8,
  },
  mealType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
    marginBottom: 4,
  },
  recipeName: {
    fontSize: 14,
    color: '#444',
    marginLeft: 8,
  },
  categorySection: {
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderRadius: 10,
  },
  categoryHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  shoppingListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
    paddingLeft: 8,
  },
  shoppingItemText: {
    fontSize: 14,
    color: '#444',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#27AE60',
  },
  budgetInfo: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  remainingBudget: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginTop: 4,
  },
  itemDetails: {
    flex: 1,
    marginRight: 12,
  },
  itemNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginLeft: 16,
    marginTop: 2,
  },
  fridgeItemsSection: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  fridgeItemContainer: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4A90E2',
  },
  fridgeItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  fridgeItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  fridgeItemAmount: {
    fontSize: 14,
    color: '#666',
  },
  fridgeItemRecipes: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
}); 