import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { analyzePronunciation } from './API/ibmWatson';

interface PracticeSession {
  id: string;
  text: string;
  score: number;
  date: string;
  feedback: string;
  wordScores?: WordScore[];
}

interface WordScore {
  word: string;
  confidence: number;
  isMispronounced: boolean;
}

const PracticeScreen = () => {
  const { sentence } = useLocalSearchParams<{ sentence: string }>();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [isRecording, setIsRecording] = useState(false);
  const [words, setWords] = useState<string[]>([]);
  const [pronunciationScore, setPronunciationScore] = useState<number | null>(null);
  const [showScore, setShowScore] = useState(false);
  const [wordScores, setWordScores] = useState<WordScore[]>([]);
  const [showWordFeedback, setShowWordFeedback] = useState(false);
  const [recordingStart, setRecordingStart] = useState<number | null>(null);
  const [recordingEnd, setRecordingEnd] = useState<number | null>(null);
  const [audioAnalysisOpen, setAudioAnalysisOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (sentence) {
      // Split sentence into words and clean them
      const wordArray = sentence.split(/\s+/).filter((word: string) => word.length > 0);
      setWords(wordArray);
    }
  }, [sentence]);

  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Microphone Permission Required', 'This app needs microphone access to record your pronunciation. Please enable it in your device settings.');
        return;
      }
      await Audio.setAudioModeAsync({ 
        allowsRecordingIOS: true, 
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: 1,
        interruptionModeAndroid: 1,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false
      });
      let recording;
      try {
        const result = await Audio.Recording.createAsync(
          {
            android: {
              extension: '.wav',
              outputFormat: 2, // WAV
              audioEncoder: 3, // AAC
              sampleRate: 16000,
              numberOfChannels: 1,
              bitRate: 128000,
            },
            ios: {
              extension: '.wav',
              outputFormat: 1, // Linear PCM
              audioQuality: 1, // High
              sampleRate: 16000,
              numberOfChannels: 1,
              bitRate: 128000,
              linearPCMBitDepth: 16,
              linearPCMIsBigEndian: false,
              linearPCMIsFloat: false,
            },
            web: {
              mimeType: 'audio/wav',
              bitsPerSecond: 128000,
            },
          },
          undefined,
          100
        );
        recording = result.recording;
      } catch (error) {
        const result = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY,
          undefined,
          100
        );
        recording = result.recording;
      }
      setRecording(recording);
      setIsRecording(true);
      setCurrentWordIndex(0);
      setPronunciationScore(null);
      setShowScore(false);
      setWordScores([]);
      setShowWordFeedback(false);
      setRecordingStart(Date.now());
      setRecordingEnd(null);
      startWordProgression();
      Alert.alert('Recording Started', 'Start speaking the text shown above!');
    } catch (error: any) {
      Alert.alert('Recording Error', `Failed to start recording: ${error.message || 'Unknown error'}`);
    }
  };

  const startWordProgression = () => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < words.length) {
        setCurrentWordIndex(index);
        index++;
      } else {
        clearInterval(interval);
        setCurrentWordIndex(-1);
      }
    }, 800); // Adjust timing as needed

    // Store interval to clear it if recording stops early
    setTimeout(() => clearInterval(interval), words.length * 800 + 1000);
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setIsRecording(false);
      setCurrentWordIndex(-1);
      setRecordingEnd(Date.now());
      if (uri) {
        Alert.alert('Recording Stopped', 'Processing your pronunciation...');
        await sendRecordingToWatson(uri);
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to stop recording: ${error.message || 'Unknown error'}`);
    }
  };

  const sendRecordingToWatson = async (uri: string) => {
    try {
      console.log('Processing audio file:', uri);
      
      // Read the audio file as base64
      const audioData = await FileSystem.readAsStringAsync(uri, { 
        encoding: FileSystem.EncodingType.Base64 
      });
      
      console.log('Audio file size (base64):', audioData.length);
      
      // Convert base64 to Uint8Array (since Buffer doesn't exist in React Native)
      const binaryString = atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      console.log('Binary audio data size:', bytes.length);
      console.log('First 100 bytes:', bytes.slice(0, 100));

      const result = await analyzePronunciation(bytes);

      if (result && result.results && result.results.length > 0) {
        const alternative = result.results[0].alternatives[0];
        if (alternative.word_confidence && alternative.word_confidence.length > 0) {
          console.log('Word confidence data:', alternative.word_confidence);
          scorePronunciation(alternative.word_confidence);
        } else {
          Alert.alert('Error', 'Could not analyze pronunciation. Please try speaking more clearly.');
        }
      } else {
        Alert.alert('Error', 'No speech detected. Please try again and speak more clearly.');
      }
    } catch (error: any) {
      console.error('Error sending audio to Watson:', error);
      Alert.alert('Error', `Failed to analyze pronunciation: ${error.message || 'Unknown error'}`);
    }
  };

  const scorePronunciation = async (wordConfidences: any[]) => {
    const scores = wordConfidences.map(([word, confidence]: [string, number]) => confidence);
    const averageScore = (scores.reduce((a, b) => a + b, 0) / scores.length) * 100;
    const finalScore = Math.round(averageScore);
    
    // Analyze word-level scores
    const wordLevelScores: WordScore[] = wordConfidences.map(([word, confidence]: [string, number]) => ({
      word: word.toLowerCase(),
      confidence: Math.round(confidence * 100),
      isMispronounced: confidence < 0.7 // Threshold for mispronunciation
    }));
    
    setWordScores(wordLevelScores);
    setPronunciationScore(finalScore);
    setShowScore(true);
    setShowWordFeedback(true);
    
    // Save practice session to AsyncStorage
    await savePracticeSession(finalScore, wordLevelScores);
  };

  const savePracticeSession = async (score: number, wordScores: WordScore[]) => {
    try {
      const session: PracticeSession = {
        id: Date.now().toString(),
        text: sentence || '',
        score: score,
        date: new Date().toISOString(),
        feedback: getScoreMessage(score),
        wordScores: wordScores
      };

      // Get existing sessions
      const existingSessions = await AsyncStorage.getItem('practiceSessions');
      const sessions: PracticeSession[] = existingSessions ? JSON.parse(existingSessions) : [];
      
      // Add new session
      sessions.unshift(session); // Add to beginning
      
      // Keep only last 50 sessions to prevent storage issues
      const limitedSessions = sessions.slice(0, 50);
      
      // Save back to storage
      await AsyncStorage.setItem('practiceSessions', JSON.stringify(limitedSessions));
      
      console.log('Practice session saved successfully');
    } catch (error) {
      console.error('Error saving practice session:', error);
    }
  };

  const renderWords = () => {
    return words.map((word, index) => {
      const wordScore = wordScores.find(ws => ws.word === word.toLowerCase());
      const isMispronounced = wordScore?.isMispronounced;
      
      return (
        <Text
          key={index}
          style={[
            styles.word,
            currentWordIndex === index && styles.currentWord,
            currentWordIndex > index && styles.completedWord,
            showWordFeedback && isMispronounced && styles.mispronouncedWord,
            showWordFeedback && wordScore && !isMispronounced && styles.correctWord
          ]}
        >
          {word}{' '}
          {showWordFeedback && wordScore && (
            <Text style={styles.wordScore}>
              ({wordScore.confidence}%)
            </Text>
          )}
        </Text>
      );
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return '#28a745'; // Green
    if (score >= 60) return '#ffc107'; // Yellow
    return '#dc3545'; // Red
  };

  const getScoreMessage = (score: number) => {
    if (score >= 85) return 'Excellent pronunciation! 🎉';
    if (score >= 60) return 'Good job! Keep practicing to improve. 👍';
    return 'Keep practicing for better clarity. 💪';
  };

  const handleBack = () => {
    router.back();
  };

  // Calculate WPM
  let wpm = null;
  if (recordingStart && recordingEnd && words.length > 0) {
    const durationMinutes = (recordingEnd - recordingStart) / 60000;
    if (durationMinutes > 0) {
      wpm = Math.round(words.length / durationMinutes);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* WPM Counter */}
      {wpm !== null && (
        <View style={styles.wpmSection}>
          <Text style={styles.wpmText}>Words per Minute: <Text style={{fontWeight:'bold'}}>{wpm}</Text></Text>
        </View>
      )}
      <View style={styles.textSection}>
        <Text style={styles.instructionText}>
          {isRecording ? 'Now reading:' : 'Text to practice:'}
        </Text>
        <View style={styles.textContainer}>
          {renderWords()}
        </View>
      </View>

      {/* Audio Analysis Dropdown */}
      {showScore && pronunciationScore !== null && (
        <View style={styles.analysisDropdownSection}>
          <Pressable
            style={styles.analysisDropdownButton}
            onPress={() => setAudioAnalysisOpen((open) => !open)}
          >
            <Text style={styles.analysisDropdownButtonText}>
              {audioAnalysisOpen ? '▼' : '▶'} Audio Analysis
            </Text>
          </Pressable>
          {audioAnalysisOpen && (
            <View style={styles.analysisDropdownContent}>
              <Text style={styles.scoreTitle}>Your Pronunciation Score</Text>
              <Text style={[styles.scoreText, { color: getScoreColor(pronunciationScore) }]}> {pronunciationScore}% </Text>
              <Text style={styles.feedbackText}> {getScoreMessage(pronunciationScore)} </Text>
              {wpm !== null && (
                <Text style={styles.wpmText}>Words per Minute: <Text style={{fontWeight:'bold'}}>{wpm}</Text></Text>
              )}
              {showWordFeedback && wordScores.length > 0 && (
                <View style={styles.wordFeedbackSection}>
                  <Text style={styles.wordFeedbackTitle}>Word-Level Analysis</Text>
                  <View style={styles.wordFeedbackContainer}>
                    {wordScores.map((wordScore, index) => (
                      <View key={index} style={styles.wordFeedbackItem}>
                        <Text style={[
                          styles.wordFeedbackWord,
                          { color: wordScore.isMispronounced ? '#dc3545' : '#28a745' }
                        ]}>
                          {wordScore.word}
                        </Text>
                        <Text style={[
                          styles.wordFeedbackScore,
                          { color: wordScore.isMispronounced ? '#dc3545' : '#28a745' }
                        ]}>
                          {wordScore.confidence}%
                        </Text>
                        {wordScore.isMispronounced && (
                          <Text style={styles.mispronouncedLabel}>⚠️ Needs work</Text>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      <View style={styles.buttonSection}>
        {!isRecording ? (
          <Pressable style={styles.recordButton} onPress={startRecording}>
            <Text style={styles.buttonText}>🎤 Start Recording</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.stopButton} onPress={stopRecording}>
            <Text style={styles.buttonText}>⏹️ Stop Recording</Text>
          </Pressable>
        )}
      </View>
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <Text style={styles.recordingText}>🔴 Recording...</Text>
        </View>
      )}
      <View style={styles.backButtonSection}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>🔙 Back</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  textSection: {
    flex: 1,
    marginBottom: 30,
  },
  instructionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 15,
    textAlign: 'center',
  },
  textContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    minHeight: 100,
    flexDirection: 'row',
    flexWrap: 'wrap',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  word: {
    fontSize: 20,
    color: '#6c757d',
    lineHeight: 32,
  },
  currentWord: {
    backgroundColor: '#28a745',
    color: '#fff',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: 'bold',
  },
  completedWord: {
    color: '#28a745',
    fontWeight: '600',
  },
  scoreSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 10,
  },
  scoreText: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  feedbackText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  buttonSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  recordButton: {
    backgroundColor: '#28a745',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  stopButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  recordingIndicator: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  recordingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc3545',
  },
  mispronouncedWord: {
    color: '#dc3545',
    fontWeight: 'bold',
  },
  correctWord: {
    color: '#28a745',
    fontWeight: 'bold',
  },
  wordScore: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '600',
  },
  wordFeedbackSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  wordFeedbackTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 10,
  },
  wordFeedbackContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  wordFeedbackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    marginBottom: 10,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  wordFeedbackWord: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '600',
  },
  wordFeedbackScore: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '600',
    marginLeft: 5,
  },
  mispronouncedLabel: {
    fontSize: 12,
    color: '#dc3545',
    fontWeight: '600',
    marginLeft: 5,
  },
  backButtonSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  backButton: {
    backgroundColor: '#28a745',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  wpmSection: {
    alignItems: 'center',
    marginBottom: 10,
  },
  wpmText: {
    fontSize: 18,
    color: '#007bff',
  },
  analysisDropdownSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  analysisDropdownButton: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 8,
  },
  analysisDropdownButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  analysisDropdownContent: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 8,
  },
});

export default PracticeScreen;