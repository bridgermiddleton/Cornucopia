import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PreferencesStepProps {
  preferences: {
    budget: string;
    cuisines: string[];
    dietaryRestrictions: string[];
    portionSize: number;
    mealsPerWeek: number;
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

export default function PreferencesStep({ preferences, onUpdate, onNext }: PreferencesStepProps) {
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

  const updateMealsPerWeek = (value: string) => {
    const meals = parseInt(value) || 7;
    onUpdate({ mealsPerWeek: Math.min(Math.max(1, meals), 14) });
  };

  return (
    <ScrollView style={styles.container}>
      {/* Budget Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weekly Budget</Text>
        <View style={styles.budgetContainer}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={styles.budgetInput}
            placeholder="Enter your budget"
            value={preferences.budget}
            onChangeText={(text) => onUpdate({ budget: text })}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Portion Size Section */}
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

      {/* Meals Per Week Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Meals Per Week</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Number of meals (1-14)</Text>
          <TextInput
            style={styles.numberInput}
            value={preferences.mealsPerWeek.toString()}
            onChangeText={updateMealsPerWeek}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Cuisines Section */}
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

      {/* Dietary Restrictions Section */}
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

      {/* Next Button */}
      <TouchableOpacity
        style={styles.nextButton}
        onPress={onNext}
        disabled={!preferences.budget || preferences.cuisines.length === 0}
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
  budgetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 20,
    color: '#333',
    marginRight: 8,
  },
  budgetInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
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
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
}); 