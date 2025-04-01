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
  SafeAreaView,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import OpenAI from 'openai';
import keys from '../config/keys';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: keys.OPENAI_API_KEY,
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

// Step Components
import PreferencesStep from '../components/meal-planner-steps/PreferencesStep';
import FridgeCheckStep from '../components/meal-planner-steps/FridgeCheckStep';
import RecipeGenerationStep from '../components/meal-planner-steps/RecipeGenerationStep';
import GroceryListStep from '../components/meal-planner-steps/GroceryListStep';

interface WizardState {
  currentStep: number;
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
  generatedRecipes: any[];
  groceryList: any[];
}

export default function GroceryListScreen() {
  const [loading, setLoading] = useState(false);
  const [wizardState, setWizardState] = useState<WizardState>({
    currentStep: 1,
    preferences: {
      budget: '',
      cuisines: [],
      dietaryRestrictions: [],
      portionSize: 2,
      selectedDays: [],
      selectedMealTypes: {},
    },
    selectedFridgeItems: [],
    generatedRecipes: [],
    groceryList: [],
  });

  const steps = [
    { id: 1, title: 'Preferences', icon: 'settings-outline' },
    { id: 2, title: 'Fridge Check', icon: 'refrigerator-outline' },
    { id: 3, title: 'Recipes', icon: 'restaurant-outline' },
    { id: 4, title: 'Grocery List', icon: 'cart-outline' },
  ];

  const handleNext = () => {
    setWizardState(prev => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, steps.length),
    }));
  };

  const handleBack = () => {
    setWizardState(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 1),
    }));
  };

  const updatePreferences = (preferences: Partial<WizardState['preferences']>) => {
    console.log('Updating preferences:', preferences);
    setWizardState(prev => {
      console.log('Previous state:', prev);
      const newState = {
        ...prev,
        preferences: {
          ...prev.preferences,
          ...preferences,
        },
      };
      console.log('New state:', newState);
      return newState;
    });
  };

  const updateSelectedFridgeItems = (items: string[]) => {
    setWizardState(prev => ({
      ...prev,
      selectedFridgeItems: items,
    }));
  };

  const updateGeneratedRecipes = (recipes: any[]) => {
    setWizardState(prev => ({
      ...prev,
      generatedRecipes: recipes,
    }));
  };

  const updateGroceryList = (list: any[]) => {
    setWizardState(prev => ({
      ...prev,
      groceryList: list,
    }));
  };

  const renderStep = () => {
    switch (wizardState.currentStep) {
      case 1:
        return (
          <PreferencesStep
            preferences={wizardState.preferences}
            onUpdate={updatePreferences}
            onNext={handleNext}
          />
        );
      case 2: {
        const fridgeCheckProps = {
          selectedItems: wizardState.selectedFridgeItems,
          onUpdate: updateSelectedFridgeItems,
          onNext: handleNext,
          onBack: handleBack,
        };
        console.log('FridgeCheckStep props:', fridgeCheckProps);
        return <FridgeCheckStep {...fridgeCheckProps} />;
      }
      case 3:
        return (
          <RecipeGenerationStep
            preferences={wizardState.preferences}
            selectedFridgeItems={wizardState.selectedFridgeItems}
            generatedRecipes={wizardState.generatedRecipes}
            onUpdate={updateGeneratedRecipes}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 4:
        return (
          <GroceryListStep
            generatedRecipes={wizardState.generatedRecipes}
            groceryList={wizardState.groceryList}
            onUpdate={updateGroceryList}
            onBack={handleBack}
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Meal Planner',
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTintColor: '#333',
        }}
      />

      {/* Progress Steps */}
      <View style={styles.stepsContainer}>
        {steps.map((step, index) => (
          <View key={step.id} style={styles.stepItem}>
            <View style={[
              styles.stepIcon,
              wizardState.currentStep >= step.id && styles.stepIconActive
            ]}>
              <Ionicons
                name={step.icon as any}
                size={24}
                color={wizardState.currentStep >= step.id ? '#FFFFFF' : '#666'}
              />
            </View>
            <Text style={[
              styles.stepTitle,
              wizardState.currentStep >= step.id && styles.stepTitleActive
            ]}>
              {step.title}
            </Text>
            {index < steps.length - 1 && (
              <View style={[
                styles.stepConnector,
                wizardState.currentStep > step.id && styles.stepConnectorActive
              ]} />
            )}
          </View>
        ))}
      </View>

      {/* Step Content */}
      <ScrollView style={styles.contentContainer}>
        {renderStep()}
      </ScrollView>
    </SafeAreaView>
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
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  stepItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIconActive: {
    backgroundColor: '#4A90E2',
  },
  stepTitle: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  stepTitleActive: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 8,
  },
  stepConnectorActive: {
    backgroundColor: '#4A90E2',
  },
  contentContainer: {
    flex: 1,
  },
}); 