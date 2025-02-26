import { Image, View, StyleSheet, KeyboardAvoidingView, TextInput, Button, ActivityIndicator} from "react-native";
import React, {useState} from "react";
import auth from '@react-native-firebase/auth';
export default function Index() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const signUp =  async () => {
    setLoading(true);

    try {
      await auth().createUserWithEmailAndPassword(email, password);
      alert("Check your emails!");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }

  };
  const signIn = async () => {
    try {
      await auth().signInWithEmailAndPassword(email, password);
      alert("Check your emails!");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };
  return (
  <View style={styles.screenContainer}>
    <View style={styles.logoRow}>
      <Image
        source={require('../assets/images/cornucopia_logo.png')} // Or use a remote URI: { uri: 'https://example.com/logo.png' }
        style={styles.logo}
      />
    </View>
    <View
      style={styles.loginContainer}
    >
      <KeyboardAvoidingView behavior="padding">
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
        />

        {loading ? (
          <ActivityIndicator size={'small'} style={{margin: 28}} />
        ) : (
          <>
            <Button
              title="Login"
              onPress={signIn}
              color={'#43413e'}
            />
            <Button
              title="Create account"
              onPress={signUp}
              color={'#43413e'}
            />
          </>
        )
      
      }
      </KeyboardAvoidingView>
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: "#c9c0b7",
  },
  logoRow: {
    flexDirection: 'row',       // positions items in a row
    justifyContent: 'center',   // center horizontally
    alignItems: 'center',       // center vertically (in row dimension)
    paddingTop: 60,             // some space from top
    paddingBottom: 60 
  },
  loginContainer: {
    marginHorizontal: 20,
    justifyContent: "center",
  },
  input: {
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginVertical: 10,
    fontSize: 16,
    color: '#333',
    // optional shadow on iOS:
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    // optional elevation on Android:
    elevation: 2
  },
  logo: {
    width: 150,    // Adjust width
    height: 150,   // Adjust height
    marginBottom: 20,
  },


})
