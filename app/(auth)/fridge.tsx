import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Button,
  Alert,
  Platform,
  Pressable,
  ScrollView,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import DatePicker from 'react-native-date-picker'
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';

// Define FridgeItem interface
interface FridgeItem {
  id: string;
  name: string;
  quantity: string;
  expiration: string;
  category: string;
}

// Define interface for AccordionSection props
interface AccordionSectionProps {
  category: string;
  items: FridgeItem[];
  isOpen: boolean;
  onToggle: () => void;
}

// Define interface for grouped items
interface GroupedItems {
  [key: string]: FridgeItem[];
}

export default function FridgeScreen() {
  // Define food categories
  const FOOD_CATEGORIES = [
    { label: 'Select a category...', value: '' },
    { label: 'Fruits & Vegetables', value: 'produce' },
    { label: 'Meat', value: 'meat' },
    { label: 'Seafood', value: 'seafood' },
    { label: 'Dairy & Eggs', value: 'dairy' },
    { label: 'Beverages', value: 'beverages' },
    { label: 'Condiments & Sauces', value: 'condiments' },
    { label: 'Spices & Seasonings', value: 'spices' },
    { label: 'Grains & Pasta', value: 'grains' },
    { label: 'Snacks', value: 'snacks' },
    { label: 'Leftovers', value: 'leftovers' },
    { label: 'Ready Meals', value: 'ready_meals' },
    { label: 'Other', value: 'other' }
  ];

  // State for the list of items
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);

  const [expiration, setExpiration] = useState(new Date())
  const [open, setOpen] = useState(false)

  // Control the modals visibility
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Temporary states for add modal
  const [itemName, setItemName] = useState('');
  const [itemQuantity, setItemQuantity] = useState('');
  const [itemCategory, setItemCategory] = useState('');

  // States for edit modal
  const [editingItem, setEditingItem] = useState<FridgeItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editExpiration, setEditExpiration] = useState(new Date());
  const [editDatePickerOpen, setEditDatePickerOpen] = useState(false);

  // Add new state for category picker visibility
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showEditCategoryPicker, setShowEditCategoryPicker] = useState(false);

  // Change Set to array for open categories
  const [openCategories, setOpenCategories] = useState<string[]>([]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // ----------- 1) Real-Time Subscription to Firestore ----------- //
  useEffect(() => {
    // Check if user is logged in
    const user = auth().currentUser;
    if (!user) {
      console.log('No user is logged in, cannot fetch fridge items.');
      return;
    }

    // Reference to /users/{uid}/fridgeItems
    const fridgeCollection = firestore()
      .collection('users')
      .doc(user.uid)
      .collection('fridgeItems')
      .orderBy('createdAt', 'desc'); // optional ordering

    // Listen in real time
    const unsubscribe = fridgeCollection.onSnapshot(snapshot => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || '',
        quantity: doc.data().quantity || '',
        expiration: doc.data().expiration || new Date().toISOString(),
        category: doc.data().category || '',
        ...doc.data()
      })) as FridgeItem[];
      setFridgeItems(items);
    });

    // Clean up listener when component unmounts
    return () => unsubscribe();
  }, []);

  // Reset all edit-related states
  const resetEditStates = () => {
    setEditModalVisible(false);
    setShowDeleteConfirm(false);
    setEditingItem(null);
    setEditName('');
    setEditQuantity('');
    setEditCategory('');
    setEditExpiration(new Date());
    setEditDatePickerOpen(false);
    setShowEditCategoryPicker(false);
  };

  // Reset all add-related states
  const resetAddStates = () => {
    setAddModalVisible(false);
    setItemName('');
    setItemQuantity('');
    setItemCategory('');
    setExpiration(new Date());
    setOpen(false);
    setShowCategoryPicker(false);
  };

  // ----------- Handle Item Deletion ----------- //
  const handleDeleteItem = async () => {
    console.log('handleDeleteItem called');
    if (!editingItem) {
      console.log('No item to delete');
      return;
    }

    const user = auth().currentUser;
    if (!user) {
      console.log('No user logged in');
      return;
    }

    try {
      console.log('Attempting to delete item:', editingItem.id);
      // First delete the item
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('fridgeItems')
        .doc(editingItem.id)
        .delete();

      console.log('Item deleted from Firestore!');
      
      // Then close both modals and reset states
      setEditModalVisible(false);
      resetEditStates();
    } catch (err) {
      console.log('Error deleting item:', err);
      Alert.alert('Error', 'Failed to delete item. Please try again.');
      // Only close edit modal on error, keep edit modal open
      setEditModalVisible(false);
    }
  };

  // ----------- Handle Item Update ----------- //
  const handleUpdateItem = async () => {
    // Validate required fields
    if (!editName.trim()) {
      Alert.alert('Required Field', 'Please enter a food name');
      return;
    }
    if (!editQuantity.trim()) {
      Alert.alert('Required Field', 'Please enter a quantity');
      return;
    }
    if (!editCategory) {
      Alert.alert('Required Field', 'Please select a category');
      return;
    }
    if (!editExpiration) {
      Alert.alert('Required Field', 'Please select an expiration date');
      return;
    }

    if (!editingItem) return;

    const user = auth().currentUser;
    if (!user) return;

    try {
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('fridgeItems')
        .doc(editingItem.id)
        .update({
          name: editName.trim(),
          quantity: editQuantity.trim(),
          category: editCategory,
          expiration: editExpiration.toISOString(),
        });

      console.log('Item updated in Firestore!');
      resetEditStates();
    } catch (err) {
      console.log('Error updating item:', err);
      Alert.alert('Error', 'Failed to update item. Please try again.');
      resetEditStates();
    }
  };

  // ----------- Handle Add Item ----------- //
  const handleAddItem = async () => {
    // Validate required fields
    if (!itemName.trim()) {
      Alert.alert('Required Field', 'Please enter a food name');
      return;
    }
    if (!itemQuantity.trim()) {
      Alert.alert('Required Field', 'Please enter a quantity');
      return;
    }
    if (!itemCategory) {
      Alert.alert('Required Field', 'Please select a category');
      return;
    }
    if (!expiration) {
      Alert.alert('Required Field', 'Please select an expiration date');
      return;
    }

    const user = auth().currentUser;
    if (!user) return;

    try {
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('fridgeItems')
        .add({
          name: itemName.trim(),
          quantity: itemQuantity.trim(),
          category: itemCategory,
          expiration: expiration.toISOString(),
          createdAt: firestore.FieldValue.serverTimestamp()
        });

      console.log('Item added to Firestore!');
      resetAddStates();
    } catch (err) {
      console.log('Error adding item:', err);
      Alert.alert('Error', 'Failed to add item. Please try again.');
      resetAddStates();
    }
  };

  // Update toggle function to use array instead of Set
  const toggleCategory = (category: string) => {
    setOpenCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(cat => cat !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  // Group items by category
  const groupedItems: GroupedItems = fridgeItems.reduce((acc: GroupedItems, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  // AccordionSection component
  const AccordionSection: React.FC<AccordionSectionProps> = ({ category, items, isOpen, onToggle }) => {
    return (
      <View style={styles.accordionContainer}>
        <TouchableOpacity 
          style={[
            styles.accordionHeader,
            isOpen && styles.accordionHeaderActive
          ]} 
          onPress={onToggle}
          activeOpacity={0.7}
        >
          <Text style={styles.accordionTitle}>
            {FOOD_CATEGORIES.find(cat => cat.value === category)?.label || category}
          </Text>
          <Text style={styles.accordionIcon}>{isOpen ? '▼' : '▶'}</Text>
        </TouchableOpacity>
        {isOpen && (
          <View style={styles.accordionContent}>
            {items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={() => {
                    // Reset edit states before setting new values
                    setEditingItem(null);
                    setEditName('');
                    setEditQuantity('');
                    setEditCategory('');
                    setEditExpiration(new Date());
                    setEditDatePickerOpen(false);
                    
                    // Set new values
                    setEditingItem(item);
                    setEditName(item.name);
                    setEditQuantity(item.quantity);
                    setEditCategory(item.category);
                    setEditExpiration(new Date(item.expiration));
                    setEditModalVisible(true);
                  }}
                >
                  <Text style={styles.editButtonText}>⋯</Text>
                </TouchableOpacity>
                <Text style={styles.itemText}>{item.name}</Text>
                <Text style={styles.itemText}>Qty: {item.quantity}</Text>
                <Text style={styles.itemText}>Expires: {formatDate(item.expiration)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.screenContainer}>
      <Stack.Screen 
        options={{
          title: 'My Fridge',
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTintColor: '#333',
        }} 
      />
      
      {/* If no items, show a helpful message */}
      {fridgeItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Your fridge is currently empty. Add some items!
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.accordionList}>
          {Object.entries(groupedItems).map(([category, items]) => (
            <AccordionSection
              key={category}
              category={category}
              items={items}
              isOpen={openCategories.includes(category)}
              onToggle={() => toggleCategory(category)}
            />
          ))}
        </ScrollView>
      )}

      {/* Plus button to open the add modal */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          resetAddStates();
          setAddModalVisible(true);
        }}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>

      {/* The Modal for adding a new item */}
      <Modal
        transparent={true}
        animationType="slide"
        visible={addModalVisible}
        onRequestClose={() => resetAddStates()}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add an Item</Text>

            <TextInput
              placeholder="Food Name"
              value={itemName}
              onChangeText={setItemName}
              style={styles.input}
              autoCapitalize='words'
              autoCorrect={true}
            />
            <TextInput
              placeholder="Quantity"
              value={itemQuantity}
              onChangeText={(text) => setItemQuantity(text.replace(/[^0-9]/g, ''))}
              style={styles.input}
              keyboardType="numeric"
            />
            <Pressable
              style={({ pressed }) => [
                styles.categoryButton,
                pressed && styles.categoryButtonPressed
              ]}
              onPress={() => setShowCategoryPicker(true)}
            >
              <View style={styles.categoryButtonContent}>
                <Text style={styles.categoryButtonText}>
                  {itemCategory ? FOOD_CATEGORIES.find(cat => cat.value === itemCategory)?.label : 'Select a category...'}
                </Text>
                <Text style={styles.categoryButtonIcon}>▼</Text>
              </View>
            </Pressable>
            <View style={styles.dateContainer}>
              <Button title="Select Expiration Date" onPress={() => setOpen(true)} />
              <Text style={styles.selectedDate}>
                Selected: {formatDate(expiration.toISOString())}
              </Text>
            </View>
            <DatePicker
              modal
              open={open}
              mode='date'
              date={expiration}
              minimumDate={new Date()}
              onConfirm={(date) => {
                setOpen(false)
                setExpiration(date)
              }}
              onCancel={() => {
                setOpen(false)
              }}
            />

            <Modal
              transparent={true}
              visible={showCategoryPicker}
              animationType="slide"
              onRequestClose={() => setShowCategoryPicker(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.pickerModalContainer}>
                  <Text style={styles.modalTitle}>Select Category</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={itemCategory}
                      onValueChange={(value: string) => {
                        setItemCategory(value);
                      }}
                      style={styles.picker}
                    >
                      {FOOD_CATEGORIES.map((category) => (
                        <Picker.Item
                          key={category.value}
                          label={category.label}
                          value={category.value}
                        />
                      ))}
                    </Picker>
                  </View>
                  <View style={styles.pickerButtonRow}>
                    <TouchableOpacity
                      style={[styles.pickerButton, styles.cancelButton]}
                      onPress={() => setShowCategoryPicker(false)}
                    >
                      <Text style={styles.pickerButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.pickerButton, styles.confirmButton]}
                      onPress={() => setShowCategoryPicker(false)}
                    >
                      <Text style={styles.pickerButtonText}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

            <View style={styles.modalButtonRow}>
              <Button title="Cancel" onPress={resetAddStates} />
              <Button title="Add Item" onPress={handleAddItem} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        transparent={true}
        animationType="slide"
        visible={editModalVisible}
        onRequestClose={resetEditStates}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {showDeleteConfirm ? 'Confirm Delete' : 'Edit Item'}
            </Text>

            {showDeleteConfirm ? (
              <>
                <Text style={styles.deleteModalText}>
                  Are you sure you want to remove {editingItem?.name}?
                </Text>
                <View style={styles.editModalButtons}>
                  <TouchableOpacity 
                    style={[styles.editModalButton, styles.cancelButton]}
                    onPress={() => setShowDeleteConfirm(false)}
                  >
                    <Text style={styles.editModalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.editModalButton, styles.deleteButton]}
                    onPress={handleDeleteItem}
                  >
                    <Text style={styles.editModalButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <TextInput
                  placeholder="Food Name"
                  value={editName}
                  onChangeText={setEditName}
                  style={styles.input}
                  autoCapitalize='words'
                  autoCorrect={true}
                />
                <TextInput
                  placeholder="Quantity"
                  value={editQuantity}
                  onChangeText={(text) => setEditQuantity(text.replace(/[^0-9]/g, ''))}
                  style={styles.input}
                  keyboardType="numeric"
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.categoryButton,
                    pressed && styles.categoryButtonPressed
                  ]}
                  onPress={() => setShowEditCategoryPicker(true)}
                >
                  <View style={styles.categoryButtonContent}>
                    <Text style={styles.categoryButtonText}>
                      {editCategory ? FOOD_CATEGORIES.find(cat => cat.value === editCategory)?.label : 'Select a category...'}
                    </Text>
                    <Text style={styles.categoryButtonIcon}>▼</Text>
                  </View>
                </Pressable>
                <View style={styles.dateContainer}>
                  <Button title="Select Expiration Date" onPress={() => setEditDatePickerOpen(true)} />
                  <Text style={styles.selectedDate}>
                    Selected: {formatDate(editExpiration.toISOString())}
                  </Text>
                </View>
                <DatePicker
                  modal
                  open={editDatePickerOpen}
                  mode='date'
                  date={editExpiration}
                  minimumDate={new Date()}
                  onConfirm={(date) => {
                    setEditDatePickerOpen(false);
                    setEditExpiration(date);
                  }}
                  onCancel={() => {
                    setEditDatePickerOpen(false);
                  }}
                />

                <Modal
                  transparent={true}
                  visible={showEditCategoryPicker}
                  animationType="slide"
                  onRequestClose={() => setShowEditCategoryPicker(false)}
                >
                  <View style={styles.modalOverlay}>
                    <View style={styles.pickerModalContainer}>
                      <Text style={styles.modalTitle}>Select Category</Text>
                      <View style={styles.pickerContainer}>
                        <Picker
                          selectedValue={editCategory}
                          onValueChange={(value: string) => {
                            setEditCategory(value);
                          }}
                          style={styles.picker}
                        >
                          {FOOD_CATEGORIES.map((category) => (
                            <Picker.Item
                              key={category.value}
                              label={category.label}
                              value={category.value}
                            />
                          ))}
                        </Picker>
                      </View>
                      <View style={styles.pickerButtonRow}>
                        <TouchableOpacity
                          style={[styles.pickerButton, styles.cancelButton]}
                          onPress={() => setShowEditCategoryPicker(false)}
                        >
                          <Text style={styles.pickerButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.pickerButton, styles.confirmButton]}
                          onPress={() => setShowEditCategoryPicker(false)}
                        >
                          <Text style={styles.pickerButtonText}>Confirm</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </Modal>

                <View style={styles.editModalButtons}>
                  <TouchableOpacity 
                    style={[styles.editModalButton, styles.cancelButton]}
                    onPress={resetEditStates}
                  >
                    <Text style={styles.editModalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.editModalButton, styles.deleteButton]}
                    onPress={() => setShowDeleteConfirm(true)}
                  >
                    <Text style={styles.editModalButtonText}>Delete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.editModalButton, styles.updateButton]}
                    onPress={handleUpdateItem}
                  >
                    <Text style={styles.editModalButtonText}>Update</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// -------------- STYLES --------------

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    textAlign: 'center',
    color: '#666',
    lineHeight: 24,
  },
  itemRow: {
    backgroundColor: '#FFFFFF',
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 40,
    backgroundColor: '#4A90E2',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#F5F5F5',
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  modalButtonRow: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  dateContainer: {
    marginVertical: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
  },
  selectedDate: {
    marginTop: 8,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  editButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  editModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 10,
  },
  editModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  editModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  updateButton: {
    backgroundColor: '#4CAF50',
  },
  deleteButton: {
    backgroundColor: '#FF6B6B',
  },
  cancelButton: {
    backgroundColor: '#95A5A6',
  },
  deleteModalText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginVertical: 24,
    lineHeight: 24,
  },
  categoryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryButtonPressed: {
    backgroundColor: '#F5F5F5',
    borderColor: '#CCCCCC',
  },
  categoryButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryButtonText: {
    color: '#333',
    fontSize: 16,
    flex: 1,
  },
  categoryButtonIcon: {
    color: '#666',
    fontSize: 16,
    marginLeft: 8,
  },
  pickerModalContainer: {
    backgroundColor: '#FFFFFF',
    width: '90%',
    borderRadius: 16,
    padding: 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  pickerContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginVertical: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        height: 200,
      },
      android: {
        height: 50,
      },
    }),
  },
  picker: {
    width: '100%',
    height: '100%',
  },
  pickerButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 10,
  },
  pickerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  pickerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#4A90E2',
  },
  accordionList: {
    flex: 1,
    paddingVertical: 20,
  },
  accordionContainer: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#4A90E2',
  },
  accordionHeaderActive: {
    backgroundColor: '#357ABD',
  },
  accordionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  accordionIcon: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  accordionContent: {
    padding: 16,
  },
});
