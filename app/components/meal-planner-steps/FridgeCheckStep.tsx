import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

interface FridgeItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expirationDate: string;
  category: string;
}

interface FridgeCheckStepProps {
  selectedItems: string[];
  onUpdate: (items: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function FridgeCheckStep({ 
  selectedItems = [], 
  onUpdate, 
  onNext, 
  onBack 
}: FridgeCheckStepProps) {
  console.log('FridgeCheckStep props:', { selectedItems, onUpdate, onNext, onBack });
  
  const [loading, setLoading] = useState(true);
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadFridgeItems();
  }, []);

  const loadFridgeItems = async () => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return;

      const fridgeRef = firestore()
        .collection('users')
        .doc(currentUser.uid)
        .collection('fridgeItems');

      const snapshot = await fridgeRef.get();
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FridgeItem[];

      // Group items by category
      const uniqueCategories = Array.from(new Set(items.map(item => item.category)));
      setCategories(uniqueCategories);
      setFridgeItems(items);
    } catch (error) {
      console.error('Error loading fridge items:', error);
      Alert.alert('Error', 'Failed to load fridge items');
    } finally {
      setLoading(false);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    if (!onUpdate) {
      console.error('onUpdate is undefined');
      return;
    }
    const newSelection = selectedItems.includes(itemId)
      ? selectedItems.filter(id => id !== itemId)
      : [...selectedItems, itemId];
    onUpdate(newSelection);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>
        Select items from your fridge to include in meal planning
      </Text>

      {categories.map(category => (
        <View key={category} style={styles.categorySection}>
          <Text style={styles.categoryTitle}>{category}</Text>
          {fridgeItems
            .filter(item => item.category === category)
            .map(item => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.itemCard,
                  selectedItems.includes(item.id) && styles.itemCardSelected
                ]}
                onPress={() => toggleItemSelection(item.id)}
              >
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemDetails}>
                    {item.quantity} {item.unit} • Expires: {item.expirationDate}
                  </Text>
                </View>
                <Ionicons
                  name={selectedItems.includes(item.id) ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color={selectedItems.includes(item.id) ? '#4A90E2' : '#666'}
                />
              </TouchableOpacity>
            ))}
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
    </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
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
  itemCardSelected: {
    borderColor: '#4A90E2',
    borderWidth: 2,
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
}); 