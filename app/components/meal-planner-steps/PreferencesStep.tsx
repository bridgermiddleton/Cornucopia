import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MealTypeSelection {
  [mealType: string]: boolean;
}

interface DayMealTypes {
  [day: string]: MealTypeSelection;
}

interface PreferencesStepProps {
  preferences: {
    cuisines: string[];
    dietaryRestrictions: string[];
    portionSize: number;
    selectedDays: string[];
    selectedMealTypes: DayMealTypes;
  };
  onUpdate: (preferences: Partial<PreferencesStepProps['preferences']>) => void;
  onNext: () => void;
}

const CUISINES = [
  'Italian', 'Mexican', 'American', 'Asian', 'Mediterranean',
  'Indian', 'Thai', 'Japanese', 'Chinese', 'Greek',
  'Spanish', 'French', 'Vietnamese', 'Korean', 'Caribbean'
];

const DIETARY_RESTRICTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free',
  'Keto', 'Paleo', 'Low-Carb', 'Halal', 'Kosher'
];

const DAYS = [
  { id: 'SUN', label: 'S' },
  { id: 'MON', label: 'M' },
  { id: 'TUE', label: 'T' },
  { id: 'WED', label: 'W' },
  { id: 'THU', label: 'T' },
  { id: 'FRI', label: 'F' },
  { id: 'SAT', label: 'S' },
];

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner'];

export default function PreferencesStep({
  preferences,
  onUpdate,
  onNext,
}: PreferencesStepProps) {
  console.log('PreferencesStep props:', { preferences, onUpdate, onNext });
  
  const toggleCuisine = (cuisine: string) => {
    console.log('Toggling cuisine:', cuisine);
    const newCuisines = preferences.cuisines.includes(cuisine)
      ? preferences.cuisines.filter(c => c !== cuisine)
      : [...preferences.cuisines, cuisine];
    onUpdate({ cuisines: newCuisines });
  };

  const toggleDietaryRestriction = (restriction: string) => {
    const newRestrictions = preferences.dietaryRestrictions.includes(restriction)
      ? preferences.dietaryRestrictions.filter(r => r !== restriction)
      : [...preferences.dietaryRestrictions, restriction];
    onUpdate({ dietaryRestrictions: newRestrictions });
  };

  const updatePortionSize = (value: string) => {
    const size = parseInt(value) || 1;
    onUpdate({ portionSize: Math.max(1, size) });
  };

  const toggleDay = (dayId: string) => {
    const updatedDays = preferences.selectedDays.includes(dayId)
      ? preferences.selectedDays.filter(d => d !== dayId)
      : [...preferences.selectedDays, dayId];
    
    // Initialize meal types for new day
    const updatedMealTypes = { ...preferences.selectedMealTypes };
    if (!preferences.selectedDays.includes(dayId)) {
      updatedMealTypes[dayId] = {
        Breakfast: false,
        Lunch: false,
        Dinner: false,
      };
    } else {
      delete updatedMealTypes[dayId];
    }

    onUpdate({
      selectedDays: updatedDays,
      selectedMealTypes: updatedMealTypes,
    });
  };

  const toggleMealType = (day: string, mealType: string) => {
    const updatedMealTypes = {
      ...preferences.selectedMealTypes,
      [day]: {
        ...preferences.selectedMealTypes[day],
        [mealType]: !preferences.selectedMealTypes[day]?.[mealType],
      },
    };
    onUpdate({ selectedMealTypes: updatedMealTypes });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Days</Text>
        <View style={styles.daysContainer}>
          {DAYS.map((day) => (
            <TouchableOpacity
              key={day.id}
              style={[
                styles.dayCircle,
                preferences.selectedDays.includes(day.id) && styles.dayCircleSelected,
              ]}
              onPress={() => toggleDay(day.id)}
            >
              <Text
                style={[
                  styles.dayText,
                  preferences.selectedDays.includes(day.id) && styles.dayTextSelected,
                ]}
              >
                {day.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {preferences.selectedDays.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Meals for Each Day</Text>
          {preferences.selectedDays.map((day) => (
            <View key={day} style={styles.mealTypeContainer}>
              <Text style={styles.dayTitle}>{day}</Text>
              <View style={styles.mealTypesRow}>
                {MEAL_TYPES.map((mealType) => (
                  <TouchableOpacity
                    key={mealType}
                    style={[
                      styles.mealTypeButton,
                      preferences.selectedMealTypes[day]?.[mealType] && styles.mealTypeButtonSelected,
                    ]}
                    onPress={() => toggleMealType(day, mealType)}
                  >
                    <Text
                      style={[
                        styles.mealTypeText,
                        preferences.selectedMealTypes[day]?.[mealType] && styles.mealTypeTextSelected,
                      ]}
                    >
                      {mealType}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferred Cuisines</Text>
        <View style={styles.optionsGrid}>
          {CUISINES.map((cuisine) => (
            <TouchableOpacity
              key={cuisine}
              style={[
                styles.optionChip,
                preferences.cuisines.includes(cuisine) && styles.optionChipSelected
              ]}
              onPress={() => toggleCuisine(cuisine)}
            >
              <Text style={[
                styles.optionChipText,
                preferences.cuisines.includes(cuisine) && styles.optionChipTextSelected
              ]}>
                {cuisine}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dietary Restrictions</Text>
        <View style={styles.optionsGrid}>
          {DIETARY_RESTRICTIONS.map((restriction) => (
            <TouchableOpacity
              key={restriction}
              style={[
                styles.optionChip,
                preferences.dietaryRestrictions.includes(restriction) && styles.optionChipSelected
              ]}
              onPress={() => toggleDietaryRestriction(restriction)}
            >
              <Text style={[
                styles.optionChipText,
                preferences.dietaryRestrictions.includes(restriction) && styles.optionChipTextSelected
              ]}>
                {restriction}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Portion Size</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Number of people</Text>
          <TextInput
            style={styles.numberInput}
            value={preferences.portionSize.toString()}
            onChangeText={updatePortionSize}
            keyboardType="numeric"
          />
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.nextButton,
          !preferences.selectedDays.length && styles.nextButtonDisabled,
        ]}
        onPress={onNext}
        disabled={!preferences.selectedDays.length}
      >
        <Text style={styles.nextButtonText}>Next</Text>
        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dayCircleSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  dayTextSelected: {
    color: '#FFFFFF',
  },
  mealTypeContainer: {
    marginBottom: 16,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  mealTypesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  mealTypeButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    alignItems: 'center',
  },
  mealTypeButtonSelected: {
    backgroundColor: '#4A90E2',
  },
  mealTypeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  mealTypeTextSelected: {
    color: '#FFFFFF',
  },
  inputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    color: '#333',
  },
  numberInput: {
    width: 80,
    height: 40,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  optionChipSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  optionChipText: {
    fontSize: 14,
    color: '#333',
  },
  optionChipTextSelected: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: 16,
  },
  nextButton: {
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
  nextButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
}); 