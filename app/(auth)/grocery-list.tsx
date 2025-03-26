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
  selectedRecipes: string[];
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

interface Recipe {
  name: string;
  cuisine: string;
  ingredients: {
    item: string;
    amount: string;
    unit: string;
    source: "grocery" | "fridge";
  }[];
  instructions: string;
}

interface ShoppingItem {
  name: string;
  quantity: string;
  price: string;
  totalPrice: string;
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

interface FridgeItemUsed {
  item: string;
  amountUsed: string;
}

interface GroceryList {
  finalList: ShoppingCategory[];
  recipes: Recipe[];
  totalCost: string;
  remainingBudget: string;
  optimizationNotes?: string;
}

interface UserRecipe {
  id: string;
  name: string;
  cuisine: string;
  prepTime: string;
  cookTime: string;
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  ingredients: {
    item: string;
    amount: string;
    unit: string;
  }[];
  instructions: string[];
  notes?: string;
  isFavorite: boolean;
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
    selectedRecipes: [],
  });
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
  const [generatedList, setGeneratedList] = useState<GroceryList | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [storePreference, setStorePreference] = useState<StorePreference | null>(null);
  const [userRecipes, setUserRecipes] = useState<UserRecipe[]>([]);
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);

  useEffect(() => {
    loadUserPreferences();
    loadFridgeItems();
    loadStorePreference();
    loadUserRecipes();
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

  const loadUserRecipes = async () => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return;

      const recipesRef = firestore()
        .collection('users')
        .doc(currentUser.uid)
        .collection('recipes');

      const snapshot = await recipesRef.get();
      const loadedRecipes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserRecipe[];

      setUserRecipes(loadedRecipes);
    } catch (error) {
      console.error('Error loading recipes:', error);
      Alert.alert('Error', 'Failed to load your recipes');
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

  const toggleRecipeSelection = (recipeId: string) => {
    setPreferences(prev => ({
      ...prev,
      selectedRecipes: prev.selectedRecipes.includes(recipeId)
        ? prev.selectedRecipes.filter(id => id !== recipeId)
        : [...prev.selectedRecipes, recipeId]
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
  
    const selectedRecipes = userRecipes
      .filter(recipe => preferences.selectedRecipes.includes(recipe.id));
  
    const selectedRecipesText = selectedRecipes.length > 0
      ? `\nSelected User Recipes:\n${selectedRecipes.map(recipe => 
          `- ${recipe.name} (${recipe.cuisine})\n` +
          `  Ingredients: ${recipe.ingredients.map(ing => 
            `${ing.amount} ${ing.unit} ${ing.item}`
          ).join(', ')}`
        ).join('\n')}`
      : '';
  
    const fridgeInventory = fridgeItems.map(item => 
      `${item.name} (${item.quantity} ${item.unit}, expires: ${item.expirationDate})`
    ).join("\n") || "Empty";

    const storeDetails = storePreference
      ? `${storePreference.name}, ${storePreference.address}${storePreference.location ? ` (Coordinates: ${storePreference.location.lat}, ${storePreference.location.lng})` : ""}`
      : "Local stores nearby";
  
    const budgetText = preferences.budget ? `$${preferences.budget}` : "Flexible budget";
  
    return `
You are an advanced meal-planning AI specialized in creating detailed, accurate, and budget-friendly meal plans and grocery lists based strictly on user preferences, existing fridge inventory, and grocery store prices.

User Preferences:
Dietary Restrictions: ${selectedDietary}
Preferred Cuisines: ${selectedCuisines}
Meal Types Requested: ${selectedMeals}
Meal Planning Duration: ${preferences.daysToMealPlan} days
Weekly Budget: ${budgetText}
Meal Repetition Allowed: ${preferences.allowMealRepetition ? "Yes" : "No"}
${selectedRecipesText}

Fridge Inventory (MUST ONLY use these items if not purchased new): ${fridgeInventory}

Shopping Store: ${storeDetails}

Instructions:

1. Meal Plan Requirements:
   - Generate a ${preferences.daysToMealPlan}-day meal plan
   - PRIORITIZE using the selected user recipes where possible
   - Fill remaining meals with new recipes that match preferences
   - ONLY use ingredients from the fridge inventory or items explicitly listed in the generated shopping list
   - Meals must strictly comply with dietary restrictions and preferred cuisines
   - Include diverse, filling, and nutritious meals
   - Meal repetition allowed: ${preferences.allowMealRepetition ? "Yes" : "No"}

2. Grocery List Requirements:
   - Calculate quantities EXACTLY (no partial packages; use full packages only, e.g., "2 dozen eggs")
   - Use REAL and ACCURATE current prices from ${storePreference?.name || "local stores"}
   - Multiply unit price by quantity explicitly (e.g., "3 packages × $4.00 per package = $12.00")
   - Clearly state unit prices in "note" for each item (e.g., "$4.00 per package")
   - Group items neatly by store department (Produce, Dairy, Meat, etc.)

3. Price Accuracy & Calculations:
   - Ensure total grocery price (estimatedCost) is exactly the mathematical sum of each item price
   - Remaining budget (remainingBudget) = original budget minus estimatedCost
   - ALL prices MUST:
     - Start with a dollar sign ($)
     - Show cents explicitly (e.g., "$5.00" rather than "$5")
     - Reflect TOTAL price clearly

4. Fridge Inventory Usage:
   - Clearly document fridge items used, the exact amounts, and specify which meals use them

STRICT RULES:
- DO NOT include ingredients in any recipe that are NOT explicitly purchased OR listed in the fridge inventory
- Double-check ALL mathematical calculations for accuracy
- Aim to utilize at least 90% and up to 100% of the given budget
- PRIORITIZE including selected user recipes in the meal plan

Return ONLY a strictly valid JSON response formatted exactly like this:

{
  "store": {
    "name": "Store Name",
    "address": "Store Address"
  },
  "mealPlan": [
    {
      "day": "Day of week",
      "date": "YYYY-MM-DD",
      "meals": [
        {
          "type": "Breakfast/Lunch/Dinner",
          "recipe": "Recipe Name",
          "ingredientsUsed": ["ingredient1", "ingredient2"]
        }
      ]
    }
  ],
  "shoppingList": [
    {
      "category": "Store Category",
      "items": [
        {
          "name": "Exact item name with brand if relevant",
          "quantity": "Full packages (e.g., 2 packages, 3 dozen)",
          "estimatedPrice": "$X.XX (calculated explicitly)",
          "note": "Unit price clearly indicated (e.g., $4.00 per package)"
        }
      ]
    }
  ],
  "fridgeItemsUsed": [
    {
      "item": "Fridge item name",
      "amountNeeded": "Exact amount needed",
      "recipes": ["Recipe 1", "Recipe 2"]
    }
  ],
  "estimatedCost": "$X.XX (Sum of all shoppingList item prices)",
  "remainingBudget": "$X.XX (Budget minus estimatedCost)"
}
`;
  };
  

  const generateGroceryList = async () => {
    setGenerating(true);
    try {
      // Stage 1: Initial Grocery List
      const stage1Prompt = `Create a grocery list for ${preferences.daysToMealPlan} days with a budget of $${preferences.budget}.
      Dietary restrictions: ${preferences.dietaryRestrictions.filter(r => r.selected).map(r => r.name).join(", ") || "None"}
      Cuisines: ${preferences.cuisineTypes.filter(c => c.selected).map(c => c.name).join(", ") || "Any"}
      
      Return a JSON object with this exact structure:
      {
        "initialList": [
          {
            "category": "Category name",
            "items": [
              {
                "name": "Item name",
                "quantity": "Quantity needed",
                "estimatedPrice": "$X.XX"
              }
            ]
          }
        ],
        "totalEstimatedCost": "$X.XX"
      }`;

      console.log('Stage 1 Prompt:', stage1Prompt);

      const stage1Completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [{
          role: "system",
          content: "You are a grocery list generator. Return ONLY a valid JSON object with no additional text."
        }, {
          role: "user",
          content: stage1Prompt
        }],
        temperature: 0.7,
        max_tokens: 1000
      });

      if (!stage1Completion.choices[0]?.message?.content) {
        throw new Error('No response from OpenAI Stage 1');
      }

      console.log('Stage 1 Response:', stage1Completion.choices[0].message.content);

      let stage1Result;
      try {
        const content = stage1Completion.choices[0].message.content.trim();
        // Remove any markdown code block markers if present
        const cleanContent = content.replace(/```json\n?|\n?```/g, '');
        stage1Result = JSON.parse(cleanContent);
        
        // Validate the response structure
        if (!stage1Result.initialList || !Array.isArray(stage1Result.initialList) || !stage1Result.totalEstimatedCost) {
          throw new Error('Invalid response structure');
        }
      } catch (parseError) {
        console.error('Stage 1 JSON Parse Error:', parseError);
        console.error('Raw response:', stage1Completion.choices[0].message.content);
        throw new Error('Invalid JSON response from Stage 1');
      }

      // Stage 2: Refine with Fridge Items
      const stage2Prompt = `Refine this grocery list based on fridge contents:
      Initial List: ${JSON.stringify(stage1Result.initialList)}
      
      Fridge Contents: ${fridgeItems.map(item => 
        `${item.name} (${item.quantity} ${item.unit})`
      ).join(", ")}
      
      Dietary Restrictions: ${preferences.dietaryRestrictions.filter(r => r.selected).map(r => r.name).join(", ")}
      Budget: ${preferences.budget}
      
      Return a JSON object with this exact structure:
      {
        "refinedList": [
          {
            "category": "Category name",
            "items": [
              {
                "name": "Item name",
                "quantity": "Quantity needed",
                "price": "$X.XX per unit",
                "totalPrice": "$X.XX",
                "note": "Any relevant notes"
              }
            ]
          }
        ],
        "fridgeItemsUsed": [
          {
            "item": "Fridge item name",
            "amountUsed": "Amount used"
          }
        ],
        "totalCost": "$X.XX"
      }`;

      console.log('Stage 2 Prompt:', stage2Prompt);

      const stage2Completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [{
          role: "system",
          content: "You are a grocery list refiner. Return ONLY a valid JSON object with no additional text."
        }, {
          role: "user",
          content: stage2Prompt
        }],
        temperature: 0.7,
        max_tokens: 1000
      });

      if (!stage2Completion.choices[0]?.message?.content) {
        throw new Error('No response from OpenAI Stage 2');
      }

      console.log('Stage 2 Response:', stage2Completion.choices[0].message.content);

      let stage2Result;
      try {
        const content = stage2Completion.choices[0].message.content.trim();
        // Remove any markdown code block markers if present
        const cleanContent = content.replace(/```json\n?|\n?```/g, '');
        stage2Result = JSON.parse(cleanContent);
        
        // Validate the response structure
        if (!stage2Result.refinedList || !Array.isArray(stage2Result.refinedList) || 
            !stage2Result.fridgeItemsUsed || !Array.isArray(stage2Result.fridgeItemsUsed) || 
            !stage2Result.totalCost) {
          throw new Error('Invalid response structure');
        }
      } catch (parseError) {
        console.error('Stage 2 JSON Parse Error:', parseError);
        console.error('Raw response:', stage2Completion.choices[0].message.content);
        throw new Error('Invalid JSON response from Stage 2');
      }

      // Stage 3: Generate Recipes
      const stage3Prompt = `Generate recipes using these ingredients:
      Grocery List: ${JSON.stringify(stage2Result.refinedList)}
      Fridge Items Used: ${JSON.stringify(stage2Result.fridgeItemsUsed)}
      
      Number of Days: ${preferences.daysToMealPlan}
      Cuisines: ${preferences.cuisineTypes.filter(c => c.selected).map(c => c.name).join(", ")}
      Dietary Restrictions: ${preferences.dietaryRestrictions.filter(r => r.selected).map(r => r.name).join(", ")}
      
      Return a JSON object with this exact structure:
      {
        "recipes": [
          {
            "name": "Recipe name",
            "cuisine": "Cuisine type",
            "ingredients": [
              {
                "item": "Ingredient name",
                "amount": "Amount needed",
                "unit": "Unit of measurement",
                "source": "grocery" or "fridge"
              }
            ],
            "instructions": "Step-by-step instructions"
          }
        ]
      }`;

      console.log('Stage 3 Prompt:', stage3Prompt);

      const stage3Completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [{
          role: "system",
          content: "You are a recipe generator. Return ONLY a valid JSON object with no additional text."
        }, {
          role: "user",
          content: stage3Prompt
        }],
        temperature: 0.7,
        max_tokens: 1000
      });

      if (!stage3Completion.choices[0]?.message?.content) {
        throw new Error('No response from OpenAI Stage 3');
      }

      console.log('Stage 3 Response:', stage3Completion.choices[0].message.content);

      let stage3Result;
      try {
        const content = stage3Completion.choices[0].message.content.trim();
        // Remove any markdown code block markers if present
        const cleanContent = content.replace(/```json\n?|\n?```/g, '');
        stage3Result = JSON.parse(cleanContent);
        
        // Validate the response structure
        if (!stage3Result.recipes || !Array.isArray(stage3Result.recipes)) {
          throw new Error('Invalid response structure');
        }

        // Validate each recipe has required fields
        stage3Result.recipes.forEach((recipe: any, index: number) => {
          if (!recipe.name || !recipe.cuisine || !recipe.ingredients || !Array.isArray(recipe.ingredients) || !recipe.instructions) {
            throw new Error(`Invalid recipe structure at index ${index}`);
          }
        });
      } catch (parseError) {
        console.error('Stage 3 JSON Parse Error:', parseError);
        console.error('Raw response:', stage3Completion.choices[0].message.content);
        throw new Error('Invalid JSON response from Stage 3');
      }

      // Stage 4: Final Budget Check
      const stage4Prompt = `Validate and optimize this meal plan:
      Grocery List: ${JSON.stringify(stage2Result.refinedList)}
      Recipes: ${JSON.stringify(stage3Result.recipes)}
      Budget: ${preferences.budget}
      Current Total: ${stage2Result.totalCost}
      
      Return a JSON object with this exact structure:
      {
        "finalList": [
          {
            "category": "Category name",
            "items": [
              {
                "name": "Item name",
                "quantity": "Quantity needed",
                "price": "$X.XX per unit",
                "totalPrice": "$X.XX"
              }
            ]
          }
        ],
        "recipes": [
          {
            "name": "Recipe name",
            "ingredients": [
              {
                "item": "Ingredient name",
                "amount": "Amount needed",
                "unit": "Unit of measurement",
                "source": "grocery" or "fridge"
              }
            ],
            "instructions": "Step-by-step instructions"
          }
        ],
        "totalCost": "$X.XX",
        "remainingBudget": "$X.XX",
        "optimizationNotes": "Any notes about budget optimization"
      }`;

      console.log('Stage 4 Prompt:', stage4Prompt);

      const stage4Completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [{
          role: "system",
          content: "You are a budget validator. Return ONLY a valid JSON object with no additional text. Ensure all prices are formatted with dollar signs and cents (e.g., $10.00)."
        }, {
          role: "user",
          content: stage4Prompt
        }],
        temperature: 0.7,
        max_tokens: 2000
      });

      if (!stage4Completion.choices[0]?.message?.content) {
        throw new Error('No response from OpenAI Stage 4');
      }

      console.log('Stage 4 Raw Response:', stage4Completion.choices[0].message.content);

      let finalResult;
      try {
        const content = stage4Completion.choices[0].message.content.trim();
        // Remove any markdown code block markers if present
        const cleanContent = content.replace(/```json\n?|\n?```/g, '');
        console.log('Stage 4 Cleaned Content:', cleanContent);
        
        finalResult = JSON.parse(cleanContent);
        console.log('Stage 4 Parsed Result:', JSON.stringify(finalResult, null, 2));
        
        // Validate the response structure
        if (!finalResult.finalList || !Array.isArray(finalResult.finalList)) {
          throw new Error('Missing or invalid finalList array');
        }
        if (!finalResult.recipes || !Array.isArray(finalResult.recipes)) {
          throw new Error('Missing or invalid recipes array');
        }
        if (!finalResult.totalCost || typeof finalResult.totalCost !== 'string' || !finalResult.totalCost.startsWith('$')) {
          throw new Error('Invalid totalCost format');
        }
        if (!finalResult.remainingBudget || typeof finalResult.remainingBudget !== 'string' || !finalResult.remainingBudget.startsWith('$')) {
          throw new Error('Invalid remainingBudget format');
        }

        // Validate each category in finalList
        finalResult.finalList.forEach((category: any, index: number) => {
          if (!category.category || !Array.isArray(category.items)) {
            throw new Error(`Invalid category structure at index ${index}`);
          }
          category.items.forEach((item: any, itemIndex: number) => {
            if (!item.name || !item.quantity || !item.price || !item.totalPrice) {
              throw new Error(`Invalid item structure in category ${category.category} at index ${itemIndex}`);
            }
          });
        });

        // Validate each recipe
        finalResult.recipes.forEach((recipe: any, index: number) => {
          if (!recipe.name || !Array.isArray(recipe.ingredients) || !recipe.instructions) {
            throw new Error(`Invalid recipe structure at index ${index}`);
          }
          recipe.ingredients.forEach((ingredient: any, ingIndex: number) => {
            if (!ingredient.item || !ingredient.amount || !ingredient.source) {
              throw new Error(`Invalid ingredient structure in recipe ${recipe.name} at index ${ingIndex}`);
            }
            // Only validate unit if amount is not "as needed" or similar
            if (ingredient.amount !== "as needed" && !ingredient.unit) {
              throw new Error(`Missing unit for ingredient ${ingredient.item} in recipe ${recipe.name}`);
            }
          });
        });

      } catch (parseError: any) {
        console.error('Stage 4 JSON Parse Error:', parseError);
        console.error('Raw response:', stage4Completion.choices[0].message.content);
        throw new Error(`Invalid JSON response from Stage 4: ${parseError.message}`);
      }

      setGeneratedList(finalResult);
      setShowResults(true);

    } catch (error) {
      console.error('Error generating list:', error);
      Alert.alert(
        'Error',
        'Failed to generate grocery list. Please try again. If the problem persists, please check your internet connection and try again.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const ResultsCard = () => {
    if (!showResults || !generatedList) return null;
  
    return (
      <View style={styles.resultsCard}>
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>Meal Plan & Shopping List</Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowResults(false)}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
  
        <ScrollView style={styles.resultsContent}>
          {/* Budget Summary */}
          <View style={styles.summaryContainer}>
            <Text style={styles.estimatedCost}>Total Cost: {generatedList.totalCost}</Text>
            <Text style={styles.remainingBudget}>
              Remaining Budget: {generatedList.remainingBudget}
            </Text>
            {generatedList.optimizationNotes && (
              <Text style={styles.optimizationNotes}>{generatedList.optimizationNotes}</Text>
            )}
          </View>
  
          {/* Recipes */}
          <Text style={styles.sectionHeader}>🍳 Recipes</Text>
          {generatedList.recipes.map((recipe, idx) => (
            <View key={idx} style={styles.recipeSection}>
              <Text style={styles.recipeName}>{recipe.name}</Text>
              <Text style={styles.recipeCuisine}>{recipe.cuisine}</Text>
              <Text style={styles.recipeInstructions}>{recipe.instructions}</Text>
              <Text style={styles.ingredientsTitle}>Ingredients:</Text>
              {recipe.ingredients.map((ingredient, ingIdx) => (
                <Text key={ingIdx} style={styles.ingredientItem}>
                  • {ingredient.amount} {ingredient.unit} {ingredient.item}
                  {ingredient.source === "fridge" ? " (from fridge)" : ""}
                </Text>
              ))}
            </View>
          ))}
  
          {/* Shopping List */}
          <Text style={styles.sectionHeader}>🛒 Shopping List</Text>
          {generatedList.finalList.map((cat, cidx) => (
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
                  <View style={styles.priceDetails}>
                    <Text style={styles.priceText}>{item.price}</Text>
                    <Text style={styles.totalPriceText}>{item.totalPrice}</Text>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };
  

  const RecipeSelectorModal = () => (
    <Modal
      visible={showRecipeSelector}
      animationType="slide"
      onRequestClose={() => setShowRecipeSelector(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select Recipes</Text>
          <TouchableOpacity
            onPress={() => setShowRecipeSelector(false)}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {userRecipes.map((recipe) => (
            <TouchableOpacity
              key={recipe.id}
              style={[
                styles.recipeCard,
                preferences.selectedRecipes.includes(recipe.id) && styles.selectedRecipeCard
              ]}
              onPress={() => toggleRecipeSelection(recipe.id)}
            >
              <View style={styles.recipeHeader}>
                <View style={styles.recipeTitleContainer}>
                  <Text style={styles.modalRecipeName}>{recipe.name}</Text>
                  <Text style={styles.modalRecipeCuisine}>{recipe.cuisine}</Text>
                </View>
                <Ionicons
                  name={preferences.selectedRecipes.includes(recipe.id) ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color={preferences.selectedRecipes.includes(recipe.id) ? '#4A90E2' : '#666'}
                />
              </View>

              <View style={styles.recipeDetails}>
                <Text style={styles.detailText}>
                  <Ionicons name="time-outline" size={16} color="#666" /> {recipe.prepTime} prep
                </Text>
                <Text style={styles.detailText}>
                  <Ionicons name="flame-outline" size={16} color="#666" /> {recipe.cookTime} cook
                </Text>
                <Text style={styles.detailText}>
                  <Ionicons name="people-outline" size={16} color="#666" /> {recipe.servings} servings
                </Text>
                <Text style={styles.detailText}>
                  <Ionicons name="speedometer-outline" size={16} color="#666" /> {recipe.difficulty}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );

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

        {/* Recipe Selection Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Recipes</Text>
          <TouchableOpacity
            style={styles.recipeSelectorButton}
            onPress={() => setShowRecipeSelector(true)}
          >
            <Text style={styles.recipeSelectorButtonText}>
              {preferences.selectedRecipes.length > 0
                ? `${preferences.selectedRecipes.length} recipe${preferences.selectedRecipes.length > 1 ? 's' : ''} selected`
                : 'Select Recipes'}
            </Text>
          </TouchableOpacity>
          {preferences.selectedRecipes.length > 0 && (
            <View style={styles.selectedRecipesList}>
              {userRecipes
                .filter(recipe => preferences.selectedRecipes.includes(recipe.id))
                .map(recipe => (
                  <View key={recipe.id} style={styles.selectedRecipeItem}>
                    <Text style={styles.selectedRecipeName}>{recipe.name}</Text>
                    <TouchableOpacity
                      onPress={() => toggleRecipeSelection(recipe.id)}
                      style={styles.removeRecipeButton}
                    >
                      <Ionicons name="close-circle" size={20} color="#FF4B4B" />
                    </TouchableOpacity>
                  </View>
                ))}
            </View>
          )}
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

      <RecipeSelectorModal />
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
  recipeSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
  },
  recipeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  recipeCuisine: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  recipeInstructions: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  ingredientsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  ingredientItem: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
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
  priceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#27AE60',
  },
  totalPriceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#27AE60',
    marginLeft: 8,
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
  optimizationNotes: {
    fontSize: 14,
    color: '#555',
    marginTop: 8,
  },
  remainingBudget: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginTop: 4,
  },
  recipeSelectorButton: {
    backgroundColor: '#F0F0F0',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  recipeSelectorButtonText: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600',
  },
  selectedRecipesList: {
    marginTop: 8,
  },
  selectedRecipeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedRecipeName: {
    fontSize: 14,
    color: '#333',
  },
  removeRecipeButton: {
    padding: 4,
  },
  selectedRecipeCard: {
    borderColor: '#4A90E2',
    borderWidth: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  modalContent: {
    padding: 16,
  },
  recipeCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    marginBottom: 12,
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recipeTitleContainer: {
    flex: 1,
  },
  modalRecipeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  modalRecipeCuisine: {
    fontSize: 14,
    color: '#555',
  },
  recipeDetails: {
    marginTop: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
}); 