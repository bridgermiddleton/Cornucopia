import { Text, View, StyleSheet, KeyboardAvoidingView, TextInput, Button, ActivityIndicator} from "react-native";
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
    <View
      style={styles.container}
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
            />
            <Button
              title="Create account"
              onPress={signUp}
            />
          </>
        )
      
      }
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    flex: 1,
    justifyContent: "center",
  },
  input: {
    marginVertical: 10,
    padding: 10,
    borderWidth: 1,
    backgroundColor: "#fff",
    borderRadius: 4,
  }


})
