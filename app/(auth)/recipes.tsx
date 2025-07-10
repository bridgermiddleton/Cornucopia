import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  Platform,
  StatusBar,
  Pressable,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

interface Recipe {
  id: string;
  name: string;
  cuisine: string;
  prepTime: {
    value: number;
    unit: TimeUnit;
  };
  cookTime: {
    value: number;
    unit: TimeUnit;
  };
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  ingredients: {
    item: string;
    amount: number;
    unit: MeasurementUnit;
  }[];
  instructions: string[];
  notes?: string;
  isFavorite: boolean;
}

type TimeUnit = 'seconds' | 'minutes' | 'hours';
type MeasurementUnit = 
  | 'piece' 
  | 'pound' 
  | 'ounce' 
  | 'gram' 
  | 'kilogram'
  | 'cup' 
  | 'tablespoon' 
  | 'teaspoon'
  | 'milliliter'
  | 'liter'
  | 'pinch'
  | 'whole';

const CUISINES = [
  'American',
  'Chinese',
  'French',
  'Greek',
  'Indian',
  'Italian',
  'Japanese',
  'Korean',
  'Mediterranean',
  'Mexican',
  'Middle Eastern',
  'Spanish',
  'Thai',
  'Vietnamese',
  'Other'
];

const TIME_UNITS: TimeUnit[] = ['seconds', 'minutes', 'hours'];

const MEASUREMENT_UNITS: MeasurementUnit[] = [
  'piece',
  'pound',
  'ounce',
  'gram',
  'kilogram',
  'cup',
  'tablespoon',
  'teaspoon',
  'milliliter',
  'liter',
  'pinch',
  'whole'
];

export default function RecipesScreen() {
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [newRecipe, setNewRecipe] = useState<Partial<Recipe>>({
    name: '',
    cuisine: '',
    prepTime: { value: 0, unit: 'minutes' },
    cookTime: { value: 0, unit: 'minutes' },
    servings: 4,
    difficulty: 'Medium',
    ingredients: [{ item: '', amount: 0, unit: 'piece' }],
    instructions: [''],
    isFavorite: false,
  });

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    setLoading(true);
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
      })) as Recipe[];

      setRecipes(loadedRecipes);
    } catch (error) {
      console.error('Error loading recipes:', error);
      Alert.alert('Error', 'Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const saveRecipe = async () => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return;

      // Validate required fields
      if (!newRecipe.name?.trim()) {
        Alert.alert('Error', 'Recipe name is required');
        return;
      }

      if (!newRecipe.cuisine?.trim()) {
        Alert.alert('Error', 'Cuisine is required');
        return;
      }

      if (!newRecipe.prepTime?.value || newRecipe.prepTime.value < 0) {
        Alert.alert('Error', 'Prep time must be a positive number');
        return;
      }

      if (!newRecipe.cookTime?.value || newRecipe.cookTime.value < 0) {
        Alert.alert('Error', 'Cook time must be a positive number');
        return;
      }

      if (!newRecipe.servings || newRecipe.servings < 1) {
        Alert.alert('Error', 'Servings must be at least 1');
        return;
      }

      if (!newRecipe.ingredients?.length || newRecipe.ingredients.some(ing => !ing.item?.trim())) {
        Alert.alert('Error', 'At least one ingredient is required');
        return;
      }

      if (!newRecipe.instructions?.length || newRecipe.instructions.some(inst => !inst.trim())) {
        Alert.alert('Error', 'At least one instruction is required');
        return;
      }

      const recipeData = {
        name: newRecipe.name.trim(),
        cuisine: newRecipe.cuisine.trim(),
        prepTime: {
          value: newRecipe.prepTime.value,
          unit: newRecipe.prepTime.unit
        },
        cookTime: {
          value: newRecipe.cookTime.value,
          unit: newRecipe.cookTime.unit
        },
        servings: newRecipe.servings,
        difficulty: newRecipe.difficulty || 'Medium',
        ingredients: newRecipe.ingredients.map(ing => ({
          item: ing.item.trim(),
          amount: ing.amount || 0,
          unit: ing.unit || 'piece'
        })),
        instructions: newRecipe.instructions.map(inst => inst.trim()).filter(Boolean),
        notes: newRecipe.notes?.trim() || '',
        isFavorite: newRecipe.isFavorite ?? false,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      if (editingRecipe) {
        await firestore()
          .collection('users')
          .doc(currentUser.uid)
          .collection('recipes')
          .doc(editingRecipe.id)
          .update(recipeData);
      } else {
        const newRecipeData = {
          ...recipeData,
          createdAt: firestore.FieldValue.serverTimestamp(),
        };
        await firestore()
          .collection('users')
          .doc(currentUser.uid)
          .collection('recipes')
          .add(newRecipeData);
      }

      setShowAddModal(false);
      setEditingRecipe(null);
      setNewRecipe({
        name: '',
        cuisine: '',
        prepTime: { value: 0, unit: 'minutes' },
        cookTime: { value: 0, unit: 'minutes' },
        servings: 4,
        difficulty: 'Medium',
        ingredients: [{ item: '', amount: 0, unit: 'piece' }],
        instructions: [''],
        isFavorite: false,
      });
      loadRecipes();
    } catch (error) {
      console.error('Error saving recipe:', error);
      Alert.alert('Error', 'Failed to save recipe');
    }
  };

  const deleteRecipe = async (recipeId: string) => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return;

      await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .collection('recipes')
        .doc(recipeId)
        .delete();

      loadRecipes();
    } catch (error) {
      console.error('Error deleting recipe:', error);
      Alert.alert('Error', 'Failed to delete recipe');
    }
  };

  const toggleFavorite = async (recipe: Recipe) => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return;

      await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .collection('recipes')
        .doc(recipe.id)
        .update({
          isFavorite: !recipe.isFavorite,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

      loadRecipes();
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update recipe');
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingRecipe(null);
    setNewRecipe({
      name: '',
      cuisine: '',
      prepTime: { value: 0, unit: 'minutes' },
      cookTime: { value: 0, unit: 'minutes' },
      servings: 4,
      difficulty: 'Medium',
      ingredients: [{ item: '', amount: 0, unit: 'piece' }],
      instructions: [''],
      isFavorite: false,
    });
  };

  const RecipeModal = () => {
    const [formValues, setFormValues] = useState({
      name: newRecipe.name || '',
      cuisine: newRecipe.cuisine || '',
      prepTime: newRecipe.prepTime || { value: 0, unit: 'minutes' as TimeUnit },
      cookTime: newRecipe.cookTime || { value: 0, unit: 'minutes' as TimeUnit },
      servings: newRecipe.servings?.toString() || '4',
      notes: newRecipe.notes || '',
      ingredients: [...(newRecipe.ingredients || [])],
      instructions: [...(newRecipe.instructions || [])],
      difficulty: newRecipe.difficulty || 'Medium'
    });
    const [showCuisinePicker, setShowCuisinePicker] = useState(false);
    const [showPrepTimePicker, setShowPrepTimePicker] = useState(false);
    const [showCookTimePicker, setShowCookTimePicker] = useState(false);
    const [showUnitPicker, setShowUnitPicker] = useState<number | null>(null);

    useEffect(() => {
      setFormValues({
        name: newRecipe.name || '',
        cuisine: newRecipe.cuisine || '',
        prepTime: newRecipe.prepTime || { value: 0, unit: 'minutes' as TimeUnit },
        cookTime: newRecipe.cookTime || { value: 0, unit: 'minutes' as TimeUnit },
        servings: newRecipe.servings?.toString() || '4',
        notes: newRecipe.notes || '',
        ingredients: [...(newRecipe.ingredients || [])],
        instructions: [...(newRecipe.instructions || [])],
        difficulty: newRecipe.difficulty || 'Medium'
      });
    }, [newRecipe]);

    const handleSave = async () => {
      try {
        setNewRecipe(prev => ({
          ...prev,
          name: formValues.name,
          cuisine: formValues.cuisine,
          prepTime: formValues.prepTime,
          cookTime: formValues.cookTime,
          servings: parseInt(formValues.servings) || 4,
          notes: formValues.notes,
          ingredients: formValues.ingredients,
          instructions: formValues.instructions,
          difficulty: formValues.difficulty
        }));
        await saveRecipe();
        closeModal();
      } catch (error) {
        console.error('Error saving recipe:', error);
      }
    };

    const CuisinePicker = () => (
      <Modal
        visible={showCuisinePicker}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Cuisine</Text>
              <TouchableOpacity
                onPress={() => setShowCuisinePicker(false)}
                style={styles.pickerCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.cuisineList}>
              {CUISINES.map((cuisine) => (
                <TouchableOpacity
                  key={cuisine}
                  style={[
                    styles.cuisineOption,
                    formValues.cuisine === cuisine && styles.cuisineOptionSelected
                  ]}
                  onPress={() => {
                    setFormValues(prev => ({ ...prev, cuisine }));
                    setShowCuisinePicker(false);
                  }}
                >
                  <Text style={[
                    styles.cuisineOptionText,
                    formValues.cuisine === cuisine && styles.cuisineOptionTextSelected
                  ]}>
                    {cuisine}
                  </Text>
                  {formValues.cuisine === cuisine && (
                    <Ionicons name="checkmark" size={20} color="#4A90E2" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );

    const updateIngredient = (index: number, field: string, value: string) => {
      setFormValues(prev => ({
        ...prev,
        ingredients: prev.ingredients.map((ing, i) =>
          i === index ? { ...ing, [field]: value } : ing
        ),
      }));
    };

    const addIngredient = () => {
      setFormValues(prev => ({
        ...prev,
        ingredients: [...prev.ingredients, { item: '', amount: 0, unit: 'piece' }],
      }));
    };

    const updateInstruction = (index: number, value: string) => {
      setFormValues(prev => ({
        ...prev,
        instructions: prev.instructions.map((inst, i) =>
          i === index ? value : inst
        ),
      }));
    };

    const addInstruction = () => {
      setFormValues(prev => ({
        ...prev,
        instructions: [...prev.instructions, ''],
      }));
    };

    const TimeUnitPicker = ({ 
      visible, 
      onClose, 
      currentUnit, 
      onSelect, 
      title 
    }: { 
      visible: boolean; 
      onClose: () => void; 
      currentUnit: TimeUnit; 
      onSelect: (unit: TimeUnit) => void;
      title: string;
    }) => (
      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>{title}</Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.pickerCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.timeUnitList}>
              {TIME_UNITS.map((unit) => (
                <TouchableOpacity
                  key={unit}
                  style={[
                    styles.timeUnitOption,
                    currentUnit === unit && styles.timeUnitOptionSelected
                  ]}
                  onPress={() => {
                    onSelect(unit);
                    onClose();
                  }}
                >
                  <Text style={[
                    styles.timeUnitOptionText,
                    currentUnit === unit && styles.timeUnitOptionTextSelected
                  ]}>
                    {unit}
                  </Text>
                  {currentUnit === unit && (
                    <Ionicons name="checkmark" size={20} color="#4A90E2" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );

    const MeasurementUnitPicker = ({ 
      visible, 
      onClose, 
      currentUnit, 
      onSelect 
    }: { 
      visible: boolean; 
      onClose: () => void; 
      currentUnit: MeasurementUnit; 
      onSelect: (unit: MeasurementUnit) => void;
    }) => (
      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Unit</Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.pickerCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.measurementUnitList}>
              {MEASUREMENT_UNITS.map((unit) => (
                <TouchableOpacity
                  key={unit}
                  style={[
                    styles.measurementUnitOption,
                    currentUnit === unit && styles.measurementUnitOptionSelected
                  ]}
                  onPress={() => {
                    onSelect(unit);
                    onClose();
                  }}
                >
                  <Text style={[
                    styles.measurementUnitOptionText,
                    currentUnit === unit && styles.measurementUnitOptionTextSelected
                  ]}>
                    {unit}
                  </Text>
                  {currentUnit === unit && (
                    <Ionicons name="checkmark" size={20} color="#4A90E2" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );

    return (
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <StatusBar barStyle="dark-content" />
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingRecipe ? 'Edit Recipe' : 'Add New Recipe'}
              </Text>
              <TouchableOpacity
                onPress={closeModal}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Recipe Name</Text>
                <TextInput
                  style={styles.input}
                  value={formValues.name}
                  onChangeText={(text) => setFormValues(prev => ({ ...prev, name: text }))}
                  placeholder="Enter recipe name"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Cuisine</Text>
                <Pressable
                  style={styles.cuisineSelector}
                  onPress={() => setShowCuisinePicker(true)}
                >
                  <Text style={[
                    styles.cuisineSelectorText,
                    !formValues.cuisine && styles.cuisineSelectorPlaceholder
                  ]}>
                    {formValues.cuisine || "Select cuisine type"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </Pressable>
              </View>

              <CuisinePicker />

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Prep Time</Text>
                  <View style={styles.timeInputContainer}>
                    <TextInput
                      style={[styles.input, styles.timeInput]}
                      value={formValues.prepTime.value.toString()}
                      onChangeText={(text) => {
                        const value = parseInt(text) || 0;
                        setFormValues(prev => ({
                          ...prev,
                          prepTime: { ...prev.prepTime, value }
                        }));
                      }}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                    <Pressable
                      style={styles.timeUnitSelector}
                      onPress={() => setShowPrepTimePicker(true)}
                    >
                      <Text style={styles.timeUnitSelectorText}>
                        {formValues.prepTime.unit}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="#666" />
                    </Pressable>
                  </View>
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Cook Time</Text>
                  <View style={styles.timeInputContainer}>
                    <TextInput
                      style={[styles.input, styles.timeInput]}
                      value={formValues.cookTime.value.toString()}
                      onChangeText={(text) => {
                        const value = parseInt(text) || 0;
                        setFormValues(prev => ({
                          ...prev,
                          cookTime: { ...prev.cookTime, value }
                        }));
                      }}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                    <Pressable
                      style={styles.timeUnitSelector}
                      onPress={() => setShowCookTimePicker(true)}
                    >
                      <Text style={styles.timeUnitSelectorText}>
                        {formValues.cookTime.unit}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="#666" />
                    </Pressable>
                  </View>
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Servings</Text>
                  <TextInput
                    style={styles.input}
                    value={formValues.servings}
                    onChangeText={(text) => {
                      const value = parseInt(text) || 4;
                      setFormValues(prev => ({ ...prev, servings: value.toString() }));
                    }}
                    keyboardType="numeric"
                    placeholder="4"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Difficulty</Text>
                  <View style={styles.difficultyButtons}>
                    {(['Easy', 'Medium', 'Hard'] as const).map((level) => (
                      <TouchableOpacity
                        key={level}
                        style={[
                          styles.difficultyButton,
                          formValues.difficulty === level && styles.difficultyButtonActive,
                        ]}
                        onPress={() => setFormValues(prev => ({ ...prev, difficulty: level }))}
                      >
                        <Text
                          style={[
                            styles.difficultyButtonText,
                            formValues.difficulty === level && styles.difficultyButtonTextActive,
                          ]}
                        >
                          {level}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Ingredients</Text>
                {formValues.ingredients.map((ingredient, index) => (
                  <View key={index} style={styles.ingredientRow}>
                    <TextInput
                      style={[styles.input, styles.ingredientInput, { flex: 2 }]}
                      value={ingredient.amount.toString()}
                      onChangeText={(text) => {
                        const value = parseFloat(text) || 0;
                        updateIngredient(index, 'amount', value.toString());
                      }}
                      placeholder="Amount"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                    />
                    <Pressable
                      style={[styles.input, styles.ingredientInput, { flex: 1, marginHorizontal: 8 }]}
                      onPress={() => setShowUnitPicker(index)}
                    >
                      <Text style={styles.unitSelectorText}>
                        {ingredient.unit}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="#666" />
                    </Pressable>
                    <TextInput
                      style={[styles.input, styles.ingredientInput, { flex: 3 }]}
                      value={ingredient.item}
                      onChangeText={(text) => updateIngredient(index, 'item', text)}
                      placeholder="Ingredient"
                      placeholderTextColor="#999"
                    />
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={addIngredient}
                >
                  <Text style={styles.addButtonText}>Add Ingredient</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Instructions</Text>
                {formValues.instructions.map((instruction, index) => (
                  <View key={index} style={styles.instructionRow}>
                    <Text style={styles.stepNumber}>{index + 1}.</Text>
                    <TextInput
                      style={[styles.input, styles.instructionInput, { flex: 1 }]}
                      value={instruction}
                      onChangeText={(text) => updateInstruction(index, text)}
                      placeholder={`Step ${index + 1}`}
                      placeholderTextColor="#999"
                      multiline
                    />
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={addInstruction}
                >
                  <Text style={styles.addButtonText}>Add Step</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  value={formValues.notes}
                  onChangeText={(text) => setFormValues(prev => ({ ...prev, notes: text }))}
                  placeholder="Add any additional notes"
                  placeholderTextColor="#999"
                  multiline
                />
              </View>

              <TimeUnitPicker
                visible={showPrepTimePicker}
                onClose={() => setShowPrepTimePicker(false)}
                currentUnit={formValues.prepTime.unit}
                onSelect={(unit) => setFormValues(prev => ({
                  ...prev,
                  prepTime: { ...prev.prepTime, unit }
                }))}
                title="Select Prep Time Unit"
              />

              <TimeUnitPicker
                visible={showCookTimePicker}
                onClose={() => setShowCookTimePicker(false)}
                currentUnit={formValues.cookTime.unit}
                onSelect={(unit) => setFormValues(prev => ({
                  ...prev,
                  cookTime: { ...prev.cookTime, unit }
                }))}
                title="Select Cook Time Unit"
              />

              {showUnitPicker !== null && (
                <MeasurementUnitPicker
                  visible={true}
                  onClose={() => setShowUnitPicker(null)}
                  currentUnit={formValues.ingredients[showUnitPicker].unit}
                  onSelect={(unit) => {
                    updateIngredient(showUnitPicker, 'unit', unit);
                    setShowUnitPicker(null);
                  }}
                />
              )}

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Save Recipe</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
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
          title: 'My Recipes',
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTintColor: '#333',
        }}
      />

      <ScrollView style={styles.scrollView}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setEditingRecipe(null);
            setNewRecipe({
              name: '',
              cuisine: '',
              prepTime: { value: 0, unit: 'minutes' },
              cookTime: { value: 0, unit: 'minutes' },
              servings: 4,
              difficulty: 'Medium',
              ingredients: [{ item: '', amount: 0, unit: 'piece' }],
              instructions: [''],
              isFavorite: false,
            });
            setShowAddModal(true);
          }}
        >
          <Text style={styles.addButtonText}>Add New Recipe</Text>
        </TouchableOpacity>

        {recipes.map((recipe) => (
          <View key={recipe.id} style={styles.recipeCard}>
            <View style={styles.recipeHeader}>
              <View style={styles.recipeTitleContainer}>
                <Text style={styles.recipeName}>{recipe.name}</Text>
                <Text style={styles.recipeCuisine}>{recipe.cuisine}</Text>
              </View>
              <TouchableOpacity
                onPress={() => toggleFavorite(recipe)}
                style={styles.favoriteButton}
              >
                <Ionicons
                  name={recipe.isFavorite ? 'heart' : 'heart-outline'}
                  size={24}
                  color={recipe.isFavorite ? '#FF4B4B' : '#666'}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.recipeDetails}>
              <Text style={styles.detailText}>
                <Ionicons name="time-outline" size={16} color="#666" /> {recipe.prepTime.value} {recipe.prepTime.unit} prep
              </Text>
              <Text style={styles.detailText}>
                <Ionicons name="flame-outline" size={16} color="#666" /> {recipe.cookTime.value} {recipe.cookTime.unit} cook
              </Text>
              <Text style={styles.detailText}>
                <Ionicons name="people-outline" size={16} color="#666" /> {recipe.servings} servings
              </Text>
              <Text style={styles.detailText}>
                <Ionicons name="speedometer-outline" size={16} color="#666" /> {recipe.difficulty}
              </Text>
            </View>

            <View style={styles.recipeActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setEditingRecipe(recipe);
                  setNewRecipe({
                    ...recipe,
                    id: recipe.id
                  });
                  setShowAddModal(true);
                }}
              >
                <Ionicons name="pencil" size={20} color="#4A90E2" />
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  Alert.alert(
                    'Delete Recipe',
                    'Are you sure you want to delete this recipe?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteRecipe(recipe.id) },
                    ]
                  );
                }}
              >
                <Ionicons name="trash" size={20} color="#FF4B4B" />
                <Text style={[styles.actionButtonText, { color: '#FF4B4B' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <RecipeModal />
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
  addButton: {
    backgroundColor: '#F0F0F0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#4A90E2',
    fontSize: 15,
    fontWeight: '600',
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
  favoriteButton: {
    padding: 4,
  },
  recipeDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipeActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#4A90E2',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
    height: 56,
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 8,
    marginRight: -8,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  difficultyButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  difficultyButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  difficultyButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  difficultyButtonText: {
    fontSize: 13,
    color: '#666',
  },
  difficultyButtonTextActive: {
    color: '#FFFFFF',
  },
  ingredientRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  instructionRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  stepNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
    marginTop: 12,
    width: 24,
  },
  saveButton: {
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cuisineSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  cuisineSelectorText: {
    fontSize: 15,
    color: '#333',
  },
  cuisineSelectorPlaceholder: {
    color: '#999',
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  pickerCloseButton: {
    padding: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuisineList: {
    padding: 8,
  },
  cuisineOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
  },
  cuisineOptionSelected: {
    backgroundColor: '#F0F7FF',
  },
  cuisineOptionText: {
    fontSize: 16,
    color: '#333',
  },
  cuisineOptionTextSelected: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  ingredientInput: {
    minHeight: 44,
  },
  instructionInput: {
    minHeight: 44,
    paddingTop: 12,
  },
  notesInput: {
    minHeight: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInput: {
    flex: 1,
  },
  timeUnitSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
    minWidth: 100,
  },
  timeUnitSelectorText: {
    fontSize: 15,
    color: '#333',
  },
  unitSelectorText: {
    fontSize: 15,
    color: '#333',
  },
  timeUnitList: {
    padding: 8,
  },
  timeUnitOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
  },
  timeUnitOptionSelected: {
    backgroundColor: '#F0F7FF',
  },
  timeUnitOptionText: {
    fontSize: 16,
    color: '#333',
  },
  timeUnitOptionTextSelected: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  measurementUnitList: {
    padding: 8,
  },
  measurementUnitOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
  },
  measurementUnitOptionSelected: {
    backgroundColor: '#F0F7FF',
  },
  measurementUnitOptionText: {
    fontSize: 16,
    color: '#333',
  },
  measurementUnitOptionTextSelected: {
    color: '#4A90E2',
    fontWeight: '600',
  },
}); 