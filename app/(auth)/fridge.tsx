import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Button
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export default function FridgeScreen() {

  type FridgeItem = {
    id: string;
    name?: string;
    quantity?: string;
    expiration?: string;
    // ...any other fields you have
  };
  
  // State for the list of items
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);


  // Control the modal visibility
  const [modalVisible, setModalVisible] = useState(false);

  // Temporary states for user input in modal
  const [itemName, setItemName] = useState('');
  const [itemQuantity, setItemQuantity] = useState('');
  const [itemExpiration, setItemExpiration] = useState('');

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
        ...doc.data()
      }));
      setFridgeItems(items);
    });

    // Clean up listener when component unmounts
    return () => unsubscribe();
  }, []);

  // ----------- 2) Add a New Item to Firestore ----------- //
  const handleAddItem = async () => {
    const user = auth().currentUser;
    if (!user) return;

    try {
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('fridgeItems')
        .add({
          name: itemName,
          quantity: itemQuantity,
          expiration: itemExpiration,
          createdAt: firestore.FieldValue.serverTimestamp()
        });

      console.log('Item added to Firestore!');
    } catch (err) {
      console.log('Error adding item:', err);
    }

    // Clear inputs & close modal
    setItemName('');
    setItemQuantity('');
    setItemExpiration('');
    setModalVisible(false);
  };

  // Renders each fridge item in a row
  const renderFridgeItem = ({ item }: { item: FridgeItem }) => {
    return (
      <View style={styles.itemRow}>
        <Text style={styles.itemText}>{item.name}</Text>
        <Text style={styles.itemText}>Qty: {item.quantity}</Text>
        <Text style={styles.itemText}>Expires: {item.expiration}</Text>
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

      {/* Plus button to open the "toast-like" modal */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>

      {/* The "Modal" for adding a new item */}
      <Modal
        transparent={true}
        animationType="slide"
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add an Item</Text>

            <TextInput
              placeholder="Food name"
              value={itemName}
              onChangeText={setItemName}
              style={styles.input}
            />
            <TextInput
              placeholder="Quantity"
              value={itemQuantity}
              onChangeText={setItemQuantity}
              style={styles.input}
            />
            <TextInput
              placeholder="Expiration date"
              value={itemExpiration}
              onChangeText={setItemExpiration}
              style={styles.input}
            />

            <View style={styles.modalButtonRow}>
              <Button title="Cancel" onPress={() => setModalVisible(false)} />
              <Button title="Add Item" onPress={handleAddItem} />
            </View>
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
    backgroundColor: 'rgba(0,0,0,0.5)', // darker overlay
    justifyContent: 'center',
    alignItems: 'center'
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
  }
});
