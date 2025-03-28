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
    mealsPerWeek: number;
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

      // Load user's saved recipes
      const recipesRef = firestore()
        .collection('users')
        .doc(currentUser.uid)
        .collection('recipes');

      const recipesSnapshot = await recipesRef.get();
      const savedRecipes = recipesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Recipe[];

      setUserRecipes(savedRecipes);

      // Generate prompt for OpenAI
      const prompt = `Generate ${preferences.mealsPerWeek} recipes based on these preferences:
Budget: $${preferences.budget}
Cuisines: ${preferences.cuisines.join(', ')}
Dietary Restrictions: ${preferences.dietaryRestrictions.join(', ')}
Portion Size: ${preferences.portionSize} people
Available Fridge Items: ${fridgeItems.map(item => `${item.name} (${item.quantity} ${item.unit})`).join(', ')}

Format the response as a valid JSON array of recipes. Each recipe should have this exact structure:
{
  "name": "Recipe Name",
  "cuisine": "Cuisine Type",
  "ingredients": [
    {
      "item": "Ingredient Name",
      "amount": "Amount",
      "unit": "Unit",
      "source": "grocery"
    }
  ],
  "instructions": "Step-by-step instructions",
  "prepTime": "30 minutes",
  "cookTime": "45 minutes",
  "servings": 4,
  "difficulty": "Easy"
}

Ensure the response is a valid JSON array starting with [ and ending with ]. Do not include any additional text or formatting.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are a recipe generator that returns only valid JSON arrays. Always verify the JSON is valid before responding."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });

      if (!completion.choices[0]?.message?.content) {
        throw new Error('No response from OpenAI');
      }

      let content = completion.choices[0].message.content;
      
      // Ensure the content is wrapped in an array if it's not already
      try {
        const parsed = JSON.parse(content);
        const recipes = Array.isArray(parsed) ? parsed : parsed.recipes || [parsed];
        onUpdate(recipes);
      } catch (parseError) {
        console.error('JSON Parse error:', parseError);
        throw new Error('Failed to parse recipe data');
      }
    } catch (error) {
      console.error('Error generating recipes:', error);
      Alert.alert('Error', 'Failed to generate recipes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const regenerateRecipe = async (index: number) => {
    setLoading(true);
    try {
      // Generate a single recipe replacement
      const prompt = `Generate 1 recipe based on the following preferences:
      Budget: $${preferences.budget}
      Cuisines: ${preferences.cuisines.join(', ')}
      Dietary Restrictions: ${preferences.dietaryRestrictions.join(', ')}
      Portion Size: ${preferences.portionSize} people
      
      Return a JSON object with this structure:
      {
        "name": "Recipe name",
        "cuisine": "Cuisine type",
        "ingredients": [
          {
            "item": "Ingredient name",
            "amount": "Amount needed",
            "unit": "Unit of measurement",
            "source": "grocery"
          }
        ],
        "instructions": "Step-by-step instructions",
        "prepTime": "Preparation time",
        "cookTime": "Cooking time",
        "servings": number,
        "difficulty": "Easy/Medium/Hard"
      }`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are a recipe generator. Return ONLY a valid JSON object."
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

      const newRecipe = JSON.parse(completion.choices[0].message.content);
      const updatedRecipes = [...generatedRecipes];
      updatedRecipes[index] = newRecipe;
      onUpdate(updatedRecipes);
    } catch (error) {
      console.error('Error regenerating recipe:', error);
      Alert.alert('Error', 'Failed to regenerate recipe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const replaceWithSavedRecipe = (index: number, recipe: Recipe) => {
    const updatedRecipes = [...generatedRecipes];
    updatedRecipes[index] = recipe;
    onUpdate(updatedRecipes);
    setShowRecipeModal(false);
  };

  const RecipeModal = () => (
    <Modal
      visible={showRecipeModal}
      animationType="slide"
      onRequestClose={() => setShowRecipeModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select a Recipe</Text>
          <TouchableOpacity
            onPress={() => setShowRecipeModal(false)}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {userRecipes.map((recipe) => (
            <TouchableOpacity
              key={recipe.id}
              style={styles.recipeCard}
              onPress={() => replaceWithSavedRecipe(generatedRecipes.indexOf(selectedRecipe!), recipe)}
            >
              <View style={styles.recipeHeader}>
                <View style={styles.recipeTitleContainer}>
                  <Text style={styles.modalRecipeName}>{recipe.name}</Text>
                  <Text style={styles.modalRecipeCuisine}>{recipe.cuisine}</Text>
                </View>
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

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>
        {generatedRecipes.length === 0
          ? 'Generate recipes based on your preferences'
          : 'Review and customize your meal plan'}
      </Text>

      {generatedRecipes.length === 0 ? (
        <TouchableOpacity
          style={styles.generateButton}
          onPress={generateRecipes}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.generateButtonText}>Generate Recipes</Text>
              <Ionicons name="restaurant-outline" size={24} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      ) : (
        <>
          {generatedRecipes.map((recipe, index) => (
            <View key={index} style={styles.recipeCard}>
              <View style={styles.recipeHeader}>
                <View style={styles.recipeTitleContainer}>
                  <Text style={styles.recipeName}>{recipe.name}</Text>
                  <Text style={styles.recipeCuisine}>{recipe.cuisine}</Text>
                </View>
                <View style={styles.recipeActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      setSelectedRecipe(recipe);
                      setShowRecipeModal(true);
                    }}
                  >
                    <Ionicons name="swap-horizontal-outline" size={20} color="#4A90E2" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => regenerateRecipe(index)}
                    disabled={loading}
                  >
                    <Ionicons name="refresh-outline" size={20} color="#4A90E2" />
                  </TouchableOpacity>
                </View>
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

              <Text style={styles.ingredientsTitle}>Ingredients:</Text>
              {recipe.ingredients.map((ingredient, ingIndex) => (
                <Text key={ingIndex} style={styles.ingredientItem}>
                  • {ingredient.amount} {ingredient.unit} {ingredient.item}
                  {ingredient.source === "fridge" ? " (from fridge)" : ""}
                </Text>
              ))}

              <Text style={styles.instructionsTitle}>Instructions:</Text>
              <Text style={styles.instructions}>{recipe.instructions}</Text>
            </View>
          ))}

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
        </>
      )}

      <RecipeModal />
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
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
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
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  recipeCard: {
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
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recipeTitleContainer: {
    flex: 1,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  recipeCuisine: {
    fontSize: 14,
    color: '#666',
  },
  recipeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  recipeDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  ingredientsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  ingredientItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  instructions: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    marginTop: 16,
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 16,
  },
  modalRecipeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  modalRecipeCuisine: {
    fontSize: 14,
    color: '#666',
  },
}); 