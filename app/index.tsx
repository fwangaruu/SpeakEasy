import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const HomeScreen = () => {
  const [practiceText, setPracticeText] = useState('');
  const router = useRouter();

  const handleGoToPractice = () => {
    if (!practiceText.trim()) {
      Alert.alert('Please enter some text', 'You need to enter text to practice with!');
      return;
    }
    router.push({
      pathname: '/practice',
      params: { sentence: practiceText.trim() }
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appName}>SpeakEasy</Text>
      </View>

      <View style={styles.middleSection}>
        <Text style={styles.welcomeText}>Welcome, Let's start practicing!</Text>
        
        <Text style={styles.label}>Type a sentence to practice:</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., The quick brown fox jumps over the lazy dog."
          value={practiceText}
          onChangeText={setPracticeText}
          multiline
        />
      </View>

      <View style={styles.bottomSection}>
        <Pressable
          style={styles.button}
          onPress={handleGoToPractice}
        >
          <Text style={styles.buttonText}>🎤 Go to Practice</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.cameraButton]}
          onPress={() => router.push('/capture' as any)}
        >
          <Text style={styles.buttonText}>📷 Capture from Image</Text>
        </Pressable>
        
        <View style={styles.navigationButtons}>
          <Pressable
            style={styles.navButton}
            onPress={() => router.push('/history')}
          >
            <Text style={styles.navButtonText}>📚 View History</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flexGrow: 1, 
    padding: 24, 
    backgroundColor: 'lightblue',
    justifyContent: 'center'
  },
  header: { 
    alignItems: 'center', 
    marginBottom: 60 
  },
  appName: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: '#2b2d42' 
  },
  middleSection: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
    marginBottom: 40 
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2b2d42',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 36
  },
  label: { 
    fontSize: 18, 
    color: '#4a4e69', 
    marginBottom: 15,
    textAlign: 'center'
  },
  input: { 
    width: '100%', 
    borderColor: 'white',
    backgroundColor: 'white', 
    borderWidth: 10,
  },
  bottomSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  cameraButton: {
    backgroundColor: '#17a2b8',
    marginTop: 15,
  },
  navigationButtons: {
    flexDirection: 'row',
    marginTop: 10,
  },
  navButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  navButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default HomeScreen;