import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
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
  prepTime: string;
  cookTime: string;
  servings: number;
  difficulty: string;
  day: string;
  mealType: string;
}

interface FridgeItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expirationDate: string;
  category: string;
}

interface RecipeGenerationStepProps {
  preferences: {
    budget: string;
    cuisines: string[];
    dietaryRestrictions: string[];
    portionSize: number;
    selectedDays: string[];
    selectedMealTypes: {
      [day: string]: {
        [mealType: string]: boolean;
      };
    };
  };
  selectedFridgeItems: string[];
  generatedRecipes: Recipe[];
  onUpdate: (recipes: Recipe[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const openai = new OpenAI({
  apiKey: keys.OPENAI_API_KEY,
});

export default function RecipeGenerationStep({
  preferences,
  selectedFridgeItems,
  generatedRecipes,
  onUpdate,
  onNext,
  onBack,
}: RecipeGenerationStepProps) {
  const [loading, setLoading] = useState(false);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [userRecipes, setUserRecipes] = useState<Recipe[]>([]);

  const generateRecipes = async () => {
    setLoading(true);
    try {
      // Load user's fridge items
      const currentUser = auth().currentUser;
      if (!currentUser) return;

      const fridgeRef = firestore()
        .collection('users')
        .doc(currentUser.uid)
        .collection('fridgeItems');

      const fridgeSnapshot = await fridgeRef.get();
      const fridgeItems = fridgeSnapshot.docs
        .filter(doc => selectedFridgeItems.includes(doc.id))
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as FridgeItem[];

      // Track remaining quantities of fridge items
      const remainingQuantities: { [key: string]: number } = {};
      fridgeItems.forEach(item => {
        remainingQuantities[item.name] = item.quantity;
      });

      // Generate recipes for each selected day and meal type
      const allRecipes: Recipe[] = [];
      
      for (const day of preferences.selectedDays) {
        const mealTypes = preferences.selectedMealTypes[day];
        for (const [mealType, isSelected] of Object.entries(mealTypes)) {
          if (isSelected) {
            // Filter out items that have been completely used
            const availableFridgeItems = fridgeItems.filter(item => 
              remainingQuantities[item.name] > 0
            );

            const prompt = `Generate 1 recipe for ${mealType} that should try to use some of these available ingredients from the user's fridge (use them only if they make sense for the recipe):
${availableFridgeItems.map(item => `- ${item.name} (${remainingQuantities[item.name]} ${item.unit} available)`).join('\n')}

Additional preferences:
Budget: $${preferences.budget}
Cuisines: ${preferences.cuisines.join(', ')}
Dietary Restrictions: ${preferences.dietaryRestrictions.join(', ')}
Portion Size: ${preferences.portionSize} people

IMPORTANT: 
- Use fridge ingredients that make sense for the recipe, but don't force using them if they don't fit
- When using a fridge ingredient, specify a reasonable amount that doesn't exceed what's available
- Mark fridge ingredients with "source": "fridge" in the JSON
- The amounts should be appropriate for ${preferences.portionSize} people

Return a JSON object with this structure:
{
  "name": "Recipe Name",
  "cuisine": "Cuisine Type",
  "ingredients": [
    {
      "item": "Ingredient Name",
      "amount": "Amount",
      "unit": "Unit",
      "source": "fridge" // Use "fridge" for ingredients from the fridge list, "grocery" for others
    }
  ],
  "instructions": "Step-by-step instructions",
  "prepTime": "30 minutes",
  "cookTime": "45 minutes",
  "servings": ${preferences.portionSize},
  "difficulty": "Easy"
}`;

            const completion = await openai.chat.completions.create({
              model: "gpt-4-turbo-preview",
              messages: [
                {
                  role: "system",
                  content: "You are a recipe generator that specializes in creating recipes using available ingredients when appropriate. You should incorporate ingredients from the user's fridge when they make sense for the recipe, but don't force their usage if they don't fit naturally. Return ONLY a valid JSON object."
                },
                {
                  role: "user",
                  content: prompt
                }
              ],
              temperature: 0.7,
              max_tokens: 1000,
              response_format: { type: "json_object" }
            });

            if (completion.choices[0]?.message?.content) {
              const recipe = JSON.parse(completion.choices[0].message.content);
              
              // Update remaining quantities for used fridge items
              recipe.ingredients.forEach((ing: { item: string; amount: string; unit: string; source: string }) => {
                if (ing.source === "fridge") {
                  const amount = parseFloat(ing.amount);
                  if (!isNaN(amount) && remainingQuantities[ing.item]) {
                    remainingQuantities[ing.item] = Math.max(0, remainingQuantities[ing.item] - amount);
                  }
                }
              });

              allRecipes.push({
                ...recipe,
                id: `${day}-${mealType}`,
                day,
                mealType
              });
            }
          }
        }
      }

      onUpdate(allRecipes);
    } catch (error) {
      console.error('Error generating recipes:', error);
      Alert.alert('Error', 'Failed to generate recipes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const regenerateRecipe = async (day: string, mealType: string) => {
    setLoading(true);
    try {
      // Get current fridge items
      const currentUser = auth().currentUser;
      if (!currentUser) return;

      const fridgeRef = firestore()
        .collection('users')
        .doc(currentUser.uid)
        .collection('fridgeItems');

      const fridgeSnapshot = await fridgeRef.get();
      const fridgeItems = fridgeSnapshot.docs
        .filter(doc => selectedFridgeItems.includes(doc.id))
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as FridgeItem[];

      const prompt = `Generate 1 recipe for ${mealType} that should try to use some of these available ingredients from the user's fridge (use them only if they make sense for the recipe):
${fridgeItems.map(item => `- ${item.name} (${item.quantity} ${item.unit} available)`).join('\n')}

Additional preferences:
Budget: $${preferences.budget}
Cuisines: ${preferences.cuisines.join(', ')}
Dietary Restrictions: ${preferences.dietaryRestrictions.join(', ')}
Portion Size: ${preferences.portionSize} people

IMPORTANT: 
- Use fridge ingredients that make sense for the recipe, but don't force using them if they don't fit
- When using a fridge ingredient, specify a reasonable amount that doesn't exceed what's available
- Mark fridge ingredients with "source": "fridge" in the JSON
- The amounts should be appropriate for ${preferences.portionSize} people

Return a JSON object with this structure:
{
  "name": "Recipe Name",
  "cuisine": "Cuisine Type",
  "ingredients": [
    {
      "item": "Ingredient Name",
      "amount": "Amount",
      "unit": "Unit",
      "source": "fridge" // Use "fridge" for ingredients from the fridge list, "grocery" for others
    }
  ],
  "instructions": "Step-by-step instructions",
  "prepTime": "30 minutes",
  "cookTime": "45 minutes",
  "servings": ${preferences.portionSize},
  "difficulty": "Easy"
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are a recipe generator that specializes in creating recipes using available ingredients when appropriate. You should incorporate ingredients from the user's fridge when they make sense for the recipe, but don't force their usage if they don't fit naturally. Return ONLY a valid JSON object."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });

      if (completion.choices[0]?.message?.content) {
        const newRecipe = JSON.parse(completion.choices[0].message.content);
        const updatedRecipes = generatedRecipes.map(recipe => 
          recipe.day === day && recipe.mealType === mealType
            ? { ...newRecipe, id: `${day}-${mealType}`, day, mealType }
            : recipe
        );
        onUpdate(updatedRecipes);
      }
    } catch (error) {
      console.error('Error regenerating recipe:', error);
      Alert.alert('Error', 'Failed to regenerate recipe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const navigateDay = (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      setCurrentDayIndex(prev => 
        prev < preferences.selectedDays.length - 1 ? prev + 1 : prev
      );
    } else {
      setCurrentDayIndex(prev => prev > 0 ? prev - 1 : prev);
    }
  };

  const getCurrentDayRecipes = () => {
    const currentDay = preferences.selectedDays[currentDayIndex];
    return generatedRecipes.filter(recipe => recipe.day === currentDay);
  };

  const getDayName = (dayId: string) => {
    const days: { [key: string]: string } = {
      'SUN': 'Sunday',
      'MON': 'Monday',
      'TUE': 'Tuesday',
      'WED': 'Wednesday',
      'THU': 'Thursday',
      'FRI': 'Friday',
      'SAT': 'Saturday'
    };
    return days[dayId] || dayId;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {(generatedRecipes || []).length === 0 ? 'Generate Your Meal Plan' : 'Your Meal Plan'}
        </Text>
        <Text style={styles.subtitle}>
          {(generatedRecipes || []).length === 0 
            ? 'Click generate to create your personalized meal plan'
            : 'Review and customize your meals'
          }
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Generating your meal plan...</Text>
        </View>
      ) : (generatedRecipes || []).length === 0 ? (
        <TouchableOpacity
          style={styles.generateButton}
          onPress={generateRecipes}
          disabled={loading}
        >
          <Text style={styles.generateButtonText}>Generate Meal Plan</Text>
          <Ionicons name="restaurant-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      ) : (
        <View style={styles.cardContainer}>
          <View style={styles.dayCard}>
            <Text style={styles.dayTitle}>
              {getDayName(preferences.selectedDays[currentDayIndex])}
            </Text>
            
            {getCurrentDayRecipes().map((recipe) => (
              <View key={recipe.id} style={styles.mealContainer}>
                <Text style={styles.mealType}>{recipe.mealType}</Text>
                <View style={styles.recipeRow}>
                  <View style={styles.recipeInfo}>
                    <Text style={styles.recipeName}>{recipe.name}</Text>
                    <Text style={styles.recipeCuisine}>{recipe.cuisine}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.regenerateButton}
                    onPress={() => regenerateRecipe(recipe.day, recipe.mealType)}
                  >
                    <Ionicons name="refresh-outline" size={20} color="#4A90E2" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <View style={styles.navigationContainer}>
              <TouchableOpacity
                style={[styles.navButton, currentDayIndex === 0 && styles.navButtonDisabled]}
                onPress={() => navigateDay('prev')}
                disabled={currentDayIndex === 0}
              >
                <Ionicons name="arrow-back" size={24} color={currentDayIndex === 0 ? '#999' : '#333'} />
              </TouchableOpacity>
              <Text style={styles.pageIndicator}>
                {currentDayIndex + 1} / {preferences.selectedDays.length}
              </Text>
              <TouchableOpacity
                style={[
                  styles.navButton,
                  currentDayIndex === preferences.selectedDays.length - 1 && styles.navButtonDisabled
                ]}
                onPress={() => navigateDay('next')}
                disabled={currentDayIndex === preferences.selectedDays.length - 1}
              >
                <Ionicons name="arrow-forward" size={24} color={currentDayIndex === preferences.selectedDays.length - 1 ? '#999' : '#333'} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.backButton]}
              onPress={onBack}
            >
              <Ionicons name="arrow-back" size={20} color="#4A90E2" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.nextButton]}
              onPress={onNext}
            >
              <Text style={styles.nextButtonText}>Next</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  cardContainer: {
    flex: 1,
    padding: 16,
  },
  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 400,
  },
  dayTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
  },
  mealContainer: {
    marginBottom: 24,
  },
  mealType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  recipeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    padding: 16,
    borderRadius: 12,
  },
  recipeInfo: {
    flex: 1,
  },
  recipeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  recipeCuisine: {
    fontSize: 14,
    color: '#666',
  },
  regenerateButton: {
    padding: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
  },
  navButton: {
    padding: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 25,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  pageIndicator: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    margin: 16,
    padding: 16,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
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
  nextButton: {
    backgroundColor: '#4A90E2',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
}); 