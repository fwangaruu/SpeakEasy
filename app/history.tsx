import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';

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

const HistoryScreen = () => {
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadSessions = async () => {
    try {
      const storedSessions = await AsyncStorage.getItem('practiceSessions');
      if (storedSessions) {
        const parsedSessions: PracticeSession[] = JSON.parse(storedSessions);
        setSessions(parsedSessions);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      Alert.alert('Error', 'Failed to load practice history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadSessions();
  };

  const clearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to delete all practice sessions? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete All', 
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('practiceSessions');
              setSessions([]);
              Alert.alert('Success', 'Practice history cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear history');
            }
          }
        }
      ]
    );
  };

  const deleteSession = (sessionId: string) => {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this practice session?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedSessions = sessions.filter(session => session.id !== sessionId);
              setSessions(updatedSessions);
              await AsyncStorage.setItem('practiceSessions', JSON.stringify(updatedSessions));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete session');
            }
          }
        }
      ]
    );
  };

  const practiceAgain = (text: string) => {
    router.push({
      pathname: '/practice',
      params: { sentence: text }
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return '#28a745'; // Green
    if (score >= 60) return '#ffc107'; // Yellow
    return '#dc3545'; // Red
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getAverageScore = () => {
    if (sessions.length === 0) return 0;
    const total = sessions.reduce((sum, session) => sum + session.score, 0);
    return Math.round(total / sessions.length);
  };

  const renderSession = ({ item }: { item: PracticeSession }) => (
    <View style={styles.sessionCard}>
      <View style={styles.sessionHeader}>
        <Text style={styles.dateText}>{formatDate(item.date)}</Text>
        <Pressable 
          style={styles.deleteButton}
          onPress={() => deleteSession(item.id)}
        >
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </Pressable>
      </View>
      
      <Text style={styles.sessionText} numberOfLines={3}>
        "{item.text}"
      </Text>
      
      <View style={styles.scoreContainer}>
        <Text style={[styles.scoreText, { color: getScoreColor(item.score) }]}>
          {item.score}%
        </Text>
        <Text style={styles.feedbackText}>{item.feedback}</Text>
      </View>
      
      <Pressable 
        style={styles.practiceAgainButton}
        onPress={() => practiceAgain(item.text)}
      >
        <Text style={styles.practiceAgainText}>🎤 Practice Again</Text>
      </Pressable>
    </View>
  );

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <Text style={styles.statsTitle}>Your Progress</Text>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{sessions.length}</Text>
          <Text style={styles.statLabel}>Total Sessions</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: getScoreColor(getAverageScore()) }]}>
            {getAverageScore()}%
          </Text>
          <Text style={styles.statLabel}>Average Score</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Loading practice history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {sessions.length > 0 && renderStats()}
      
      {sessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>📚</Text>
          <Text style={styles.emptyTitle}>No Practice Sessions Yet</Text>
          <Text style={styles.emptySubtitle}>
            Start practicing to see your progress here!
          </Text>
          <Pressable 
            style={styles.startPracticingButton}
            onPress={() => router.push('/')}
          >
            <Text style={styles.startPracticingText}>Start Practicing</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.headerContainer}>
            <Text style={styles.historyTitle}>Practice History</Text>
            <Pressable style={styles.clearButton} onPress={clearHistory}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </Pressable>
          </View>
          
          <FlatList
            data={sessions}
            renderItem={renderSession}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.listContent}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
  },
  statsContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2b2d42',
    marginBottom: 15,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007bff',
  },
  statLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2b2d42',
  },
  clearButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sessionCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 12,
    color: '#6c757d',
  },
  deleteButton: {
    padding: 4,
  },
  deleteButtonText: {
    fontSize: 16,
  },
  sessionText: {
    fontSize: 16,
    color: '#495057',
    marginBottom: 12,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  feedbackText: {
    fontSize: 12,
    color: '#6c757d',
    flex: 1,
    marginLeft: 12,
  },
  practiceAgainButton: {
    backgroundColor: '#007bff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  practiceAgainText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2b2d42',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 24,
  },
  startPracticingButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  startPracticingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HistoryScreen;