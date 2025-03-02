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
  Platform
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import DatePicker from 'react-native-date-picker'

export default function FridgeScreen() {

  type FridgeItem = {
    id: string;
    name: string;
    quantity: string;
    expiration: string;
    // ...any other fields you have
  };
  
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

  // States for edit modal
  const [editingItem, setEditingItem] = useState<FridgeItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editExpiration, setEditExpiration] = useState(new Date());
  const [editDatePickerOpen, setEditDatePickerOpen] = useState(false);

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
    setEditExpiration(new Date());
    setEditDatePickerOpen(false);
  };

  // Reset all add-related states
  const resetAddStates = () => {
    setAddModalVisible(false);
    setItemName('');
    setItemQuantity('');
    setExpiration(new Date());
    setOpen(false);
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

  // Renders each fridge item in a row
  const renderFridgeItem = ({ item }: { item: FridgeItem }) => {
    return (
      <View style={styles.itemRow}>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => {
            // Reset edit states before setting new values
            setEditingItem(null);
            setEditName('');
            setEditQuantity('');
            setEditExpiration(new Date());
            setEditDatePickerOpen(false);
            
            // Set new values
            setEditingItem(item);
            setEditName(item.name);
            setEditQuantity(item.quantity);
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
    );
  };

  return (
    <View style={styles.screenContainer}>
      {/* If no items, show a helpful message */}
      {fridgeItems.length === 0 ? (
        <Text style={styles.emptyText}>
          Your fridge is currently empty. Add some items!
        </Text>
      ) : (
        <FlatList
          data={fridgeItems}
          keyExtractor={(item) => item.id}
          renderItem={renderFridgeItem}
          contentContainerStyle={{ paddingVertical: 20 }}
        />
      )}

      {/* Plus button to open the add modal */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          resetAddStates();
          setAddModalVisible(true);
        }}
      >
        <Text style={styles.addButtonText}>+</Text>
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
    backgroundColor: '#faf8f4',
    padding: 16
  },
  emptyText: {
    marginTop: 50,
    fontSize: 18,
    textAlign: 'center',
    color: '#333'
  },
  itemRow: {
    backgroundColor: '#fff',
    marginVertical: 8,
    padding: 12,
    borderRadius: 8,
    // optional shadow on iOS
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2 // shadow on Android
  },
  itemText: {
    fontSize: 16,
    color: '#333'
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 40,
    backgroundColor: '#3498db',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center'
  },
  addButtonText: {
    fontSize: 30,
    color: '#fff',
    lineHeight: 35
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 998,
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10
  },
  input: {
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
    borderRadius: 8,
    padding: 10
  },
  modalButtonRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  dateContainer: {
    marginVertical: 10,
  },
  selectedDate: {
    marginTop: 8,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  editButton: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3498db',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 24,
    marginTop: -4, // Adjust the vertical position of the dots
  },
  editModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  editModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  editModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  updateButton: {
    backgroundColor: '#27ae60',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
  },
  deleteModalText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginVertical: 20,
  },
});
