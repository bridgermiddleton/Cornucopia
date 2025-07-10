import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import OpenAI from 'openai';
import keys from '../../config/keys';

interface Recipe {
  id: string;
  name: string;
  cuisine: string;
  ingredients: {
    item: string;
    amount: string;
    unit: string;
    source: 'grocery' | 'fridge';
  }[];
  instructions: string;
}

interface GroceryItem {
  name: string;
  quantity: string;
  unit: string;
  category: string;
  estimatedPrice: string;
  note?: string;
}

interface GroceryListStepProps {
  generatedRecipes: Recipe[];
  groceryList: GroceryItem[];
  onUpdate: (list: GroceryItem[]) => void;
  onBack: () => void;
}

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
}

const openai = new OpenAI({
  apiKey: keys.OPENAI_API_KEY,
});

const STORE_CATEGORIES = [
  'Produce',
  'Dairy & Eggs',
  'Meat & Seafood',
  'Pantry',
  'Frozen',
  'Beverages',
  'Household',
  'Other'
];

export default function GroceryListStep({
  generatedRecipes,
  groceryList,
  onUpdate,
  onBack,
}: GroceryListStepProps) {
  const [loading, setLoading] = useState(false);
  const [budget, setBudget] = useState<string>('');
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [totalCost, setTotalCost] = useState<number>(0);

  useEffect(() => {
    loadUserPreferences();
  }, []);

  useEffect(() => {
    if (groceryList.length > 0) {
      const total = groceryList.reduce((sum, item) => {
        const price = parseFloat(item.estimatedPrice.replace('$', ''));
        return sum + (isNaN(price) ? 0 : price);
      }, 0);
      setTotalCost(total);
    }
  }, [groceryList]);

  const loadUserPreferences = async () => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return;

      const userDoc = await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .get();

      if (userDoc.exists) {
        const preferences = userDoc.data()?.preferences || {};
        setUserPreferences(preferences);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const generateGroceryList = async () => {
    if (!budget) {
      Alert.alert('Error', 'Please set your budget before generating the grocery list');
      return;
    }

    setLoading(true);
    try {
      const storeInfo = userPreferences?.preferredStore 
        ? `Store: ${userPreferences.preferredStore.name}, ${userPreferences.preferredStore.address}`
        : 'No specific store selected';

      const prompt = `Generate a grocery list based on these recipes, staying within a budget of $${budget}. 
      IMPORTANT: Return ONLY a valid JSON array of grocery items. Do not include any markdown formatting or backticks.
      
      Store Information:
      ${storeInfo}
      
      Recipes:
      ${generatedRecipes.map(recipe => `
        ${recipe.name}:
        ${recipe.ingredients
          .filter(ing => ing.source === 'grocery')
          .map(ing => `${ing.amount} ${ing.unit} ${ing.item}`)
          .join('\n')}
      `).join('\n\n')}
      
      Instructions:
      1. Convert ingredient amounts to standard store packaging sizes
      2. For example:
         - Salt should be a container (e.g., "1 container" or "1 box")
         - Hamburger buns should be a package (e.g., "1 package" or "8 count")
         - Spices should be in standard spice jar sizes
         - Fresh produce should be in standard store quantities (e.g., "1 bunch" for herbs)
      3. Consider the store's typical packaging sizes
      4. Round up quantities to the nearest standard package size
      5. Include notes for any special packaging considerations
      
      Required JSON structure:
      [
        {
          "name": "Item name",
          "quantity": "Standard store quantity (e.g., '1 package', '1 container')",
          "unit": "Standard unit (e.g., 'package', 'container', 'count')",
          "category": "Store category",
          "estimatedPrice": "$X.XX",
          "note": "Optional note about packaging or quantity"
        }
      ]`;

      console.log('Generated Recipes:', generatedRecipes);
      console.log('Prompt:', prompt);

      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are a grocery list generator that understands standard store packaging sizes. Convert recipe ingredient amounts to standard store packaging quantities. Return ONLY a valid JSON array of grocery items. Do not include any markdown formatting, backticks, or additional text."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      if (!completion.choices[0]?.message?.content) {
        throw new Error('No response from OpenAI');
      }

      console.log('Raw response:', completion.choices[0].message.content);

      // Clean the response to ensure it's valid JSON
      const cleanedResponse = completion.choices[0].message.content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      console.log('Cleaned response:', cleanedResponse);

      let items;
      try {
        items = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        throw new Error('Failed to parse the response as JSON');
      }

      if (!Array.isArray(items)) {
        throw new Error('Response is not an array');
      }

      console.log('Parsed items:', items);
      onUpdate(items);
    } catch (error) {
      console.error('Error generating grocery list:', error);
      Alert.alert('Error', 'Failed to generate grocery list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const groupItemsByCategory = () => {
    const grouped: { [key: string]: GroceryItem[] } = {};
    STORE_CATEGORIES.forEach(category => {
      grouped[category] = [];
    });

    groceryList.forEach(item => {
      const category = item.category || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });

    return grouped;
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>
        Set your budget and generate your grocery list
      </Text>

      {userPreferences?.preferredStore && (
        <View style={styles.storeInfo}>
          <Text style={styles.storeLabel}>Shopping at:</Text>
          <Text style={styles.storeName}>{userPreferences.preferredStore.name}</Text>
          <Text style={styles.storeAddress}>{userPreferences.preferredStore.address}</Text>
        </View>
      )}

      <View style={styles.budgetSection}>
        <Text style={styles.budgetLabel}>Set Your Budget</Text>
        <TextInput
          style={styles.budgetInput}
          placeholder="Enter your budget ($)"
          value={budget}
          onChangeText={setBudget}
          keyboardType="numeric"
        />
      </View>

      <TouchableOpacity
        style={[styles.generateButton, !budget && styles.generateButtonDisabled]}
        onPress={generateGroceryList}
        disabled={!budget || loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Text style={styles.generateButtonText}>Generate Grocery List</Text>
            <Ionicons name="cart-outline" size={24} color="#FFFFFF" />
          </>
        )}
      </TouchableOpacity>

      {groceryList.length > 0 && (
        <View style={styles.groceryListContainer}>
          <Text style={styles.totalCost}>
            Total Estimated Cost: ${totalCost.toFixed(2)}
          </Text>
          {Object.entries(groupItemsByCategory()).map(([category, items]) => (
            items.length > 0 && (
              <View key={category} style={styles.categorySection}>
                <Text style={styles.categoryTitle}>{category}</Text>
                {items.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemDetails}>
                        {item.quantity} {item.unit.split(' ')[0]}
                        {item.note && ` • ${item.note}`}
                      </Text>
                    </View>
                    <Text style={styles.itemPrice}>{item.estimatedPrice}</Text>
                  </View>
                ))}
              </View>
            )
          ))}
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.backButton]}
          onPress={onBack}
        >
          <Ionicons name="arrow-back" size={20} color="#4A90E2" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
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
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    margin: 16,
    paddingHorizontal: 16,
  },
  storeInfo: {
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
  storeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  storeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  storeAddress: {
    fontSize: 14,
    color: '#666',
  },
  budgetSection: {
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
  budgetLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  budgetInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  generateButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  groceryListContainer: {
    margin: 16,
  },
  totalCost: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  categorySection: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemInfo: {
    flex: 1,
    marginRight: 16,
  },
  itemName: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 14,
    color: '#666',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
  },
  buttonContainer: {
    padding: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 25,
    minWidth: 120,
  },
  backButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  backButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 