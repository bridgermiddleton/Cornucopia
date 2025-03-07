import { Image, View, StyleSheet, KeyboardAvoidingView, TextInput, TouchableOpacity, ActivityIndicator, Text, Platform, Alert } from "react-native";
import React, {useState} from "react";
import auth from '@react-native-firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

export default function Index() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const requestLocationPermission = async () => {
    try {
      const result = await request(
        Platform.OS === 'ios' 
          ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE 
          : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
      );
      return result;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return RESULTS.DENIED;
    }
  };

  const signUp = async () => {
    setLoading(true);
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      
      // After successful account creation, prompt for location permission
      Alert.alert(
        'Location Access',
        'Would you like to enable location services to find grocery stores near you?',
        [
          {
            text: 'No, Thanks',
            style: 'cancel',
          },
          {
            text: 'Yes, Enable',
            onPress: async () => {
              const permissionResult = await requestLocationPermission();
              if (permissionResult === RESULTS.GRANTED) {
                console.log('Location permission granted');
              }
            },
          },
        ],
        { cancelable: true }
      );
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async () => {
    setLoading(true);
    try {
      await auth().signInWithEmailAndPassword(email, password);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.screenContainer}
    >
      <View style={styles.contentContainer}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/images/co.png')}
              style={styles.logo}
            />
            <View style={styles.logoShadow} />
          </View>
        </View>

        {/* Login Form Section */}
        <View style={styles.formSection}>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#999"
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#999"
              secureTextEntry
            />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#4A90E2" style={styles.loadingIndicator} />
          ) : (
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.loginButton]} 
                onPress={signIn}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Login</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.button, styles.signupButton]} 
                onPress={signUp}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Create Account</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  logo: {
    width: 160,
    height: 160,
    resizeMode: 'contain',
  },
  logoShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 80,
    transform: [{ scale: 1.1 }],
    zIndex: -1,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  buttonContainer: {
    marginTop: 24,
    gap: 12,
  },
  button: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButton: {
    backgroundColor: '#4A90E2',
  },
  signupButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingIndicator: {
    marginTop: 24,
  },
});
