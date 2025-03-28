import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const [newItem, setNewItem] = useState<Partial<GroceryItem>>({
    name: '',
    quantity: '',
    unit: '',
    category: 'Other',
    estimatedPrice: '',
  });
  const [showAddItem, setShowAddItem] = useState(false);

  useEffect(() => {
    if (groceryList.length === 0) {
      generateGroceryList();
    }
  }, []);

  const generateGroceryList = async () => {
    setLoading(true);
    try {
      const prompt = `Generate a grocery list based on these recipes:
      ${generatedRecipes.map(recipe => `
        ${recipe.name}:
        ${recipe.ingredients
          .filter(ing => ing.source === 'grocery')
          .map(ing => `${ing.amount} ${ing.unit} ${ing.item}`)
          .join('\n')}
      `).join('\n\n')}
      
      Return a JSON array of grocery items with this structure:
      {
        "name": "Item name",
        "quantity": "Quantity needed",
        "unit": "Unit of measurement",
        "category": "Store category",
        "estimatedPrice": "$X.XX",
        "note": "Optional note"
      }`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are a grocery list generator. Return ONLY a valid JSON array of grocery items."
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

      const items = JSON.parse(completion.choices[0].message.content);
      onUpdate(items);
    } catch (error) {
      console.error('Error generating grocery list:', error);
      Alert.alert('Error', 'Failed to generate grocery list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    if (!newItem.name || !newItem.quantity || !newItem.unit || !newItem.estimatedPrice) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const item: GroceryItem = {
      name: newItem.name!,
      quantity: newItem.quantity!,
      unit: newItem.unit!,
      category: newItem.category!,
      estimatedPrice: newItem.estimatedPrice!,
      note: newItem.note,
    };

    onUpdate([...groceryList, item]);
    setNewItem({
      name: '',
      quantity: '',
      unit: '',
      category: 'Other',
      estimatedPrice: '',
    });
    setShowAddItem(false);
  };

  const removeItem = (index: number) => {
    const updatedList = groceryList.filter((_, i) => i !== index);
    onUpdate(updatedList);
  };

  const updateItem = (index: number, field: keyof GroceryItem, value: string) => {
    const updatedList = [...groceryList];
    updatedList[index] = {
      ...updatedList[index],
      [field]: value,
    };
    onUpdate(updatedList);
  };

  const groupedItems = STORE_CATEGORIES.reduce((acc, category) => {
    acc[category] = groceryList.filter(item => item.category === category);
    return acc;
  }, {} as Record<string, GroceryItem[]>);

  const totalCost = groceryList.reduce((sum, item) => {
    const price = parseFloat(item.estimatedPrice.replace('$', ''));
    return sum + price;
  }, 0);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>
        Review and customize your grocery list
      </Text>

      {STORE_CATEGORIES.map(category => (
        groupedItems[category].length > 0 && (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category}</Text>
            {groupedItems[category].map((item, index) => (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemDetails}>
                    {item.quantity} {item.unit}
                  </Text>
                  {item.note && (
                    <Text style={styles.itemNote}>{item.note}</Text>
                  )}
                </View>
                <View style={styles.itemActions}>
                  <Text style={styles.itemPrice}>{item.estimatedPrice}</Text>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeItem(groceryList.indexOf(item))}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FF4B4B" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )
      ))}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAddItem(true)}
      >
        <Ionicons name="add-circle-outline" size={24} color="#4A90E2" />
        <Text style={styles.addButtonText}>Add Item</Text>
      </TouchableOpacity>

      <View style={styles.totalSection}>
        <Text style={styles.totalLabel}>Total Estimated Cost:</Text>
        <Text style={styles.totalAmount}>${totalCost.toFixed(2)}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.backButton]}
          onPress={onBack}
        >
          <Ionicons name="arrow-back" size={20} color="#4A90E2" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      {showAddItem && (
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Item</Text>
            <TextInput
              style={styles.input}
              placeholder="Item name"
              value={newItem.name}
              onChangeText={(text) => setNewItem(prev => ({ ...prev, name: text }))}
            />
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Quantity"
                value={newItem.quantity}
                onChangeText={(text) => setNewItem(prev => ({ ...prev, quantity: text }))}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Unit"
                value={newItem.unit}
                onChangeText={(text) => setNewItem(prev => ({ ...prev, unit: text }))}
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Estimated price ($)"
              value={newItem.estimatedPrice}
              onChangeText={(text) => setNewItem(prev => ({ ...prev, estimatedPrice: text }))}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Category"
              value={newItem.category}
              onChangeText={(text) => setNewItem(prev => ({ ...prev, category: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Note (optional)"
              value={newItem.note}
              onChangeText={(text) => setNewItem(prev => ({ ...prev, note: text }))}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddItem(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={addItem}
              >
                <Text style={styles.saveButtonText}>Add Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 14,
    color: '#666',
  },
  itemNote: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
  },
  removeButton: {
    padding: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  addButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
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
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    width: '90%',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    padding: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#4A90E2',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 