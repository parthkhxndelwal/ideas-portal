import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';

interface ScannedData {
  type: string;
  data: string;
  timestamp: number;
  qrType?: "volunteer" | "participant" | "unknown";
  rollNumber?: string | null;
  transactionId?: string | null;
  isValid?: boolean;
}

export default function HistoryScreen() {
  const [history, setHistory] = useState<ScannedData[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const loadHistory = async () => {
    try {
      const historyStr = await AsyncStorage.getItem('scanHistory');
      if (historyStr) {
        setHistory(JSON.parse(historyStr));
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const clearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all scan history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('scanHistory');
            setHistory([]);
          },
        },
      ]
    );
  };

  const deleteItem = (index: number) => {
    Alert.alert('Delete Item', 'Remove this item from history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const newHistory = [...history];
          newHistory.splice(index, 1);
          setHistory(newHistory);
          await AsyncStorage.setItem('scanHistory', JSON.stringify(newHistory));
        },
      },
    ]);
  };

  const handleItemPress = (item: ScannedData) => {
    const displayData = item.qrType === 'volunteer' 
      ? `Volunteer Roll Number: ${item.rollNumber}`
      : item.qrType === 'participant'
      ? `Participant Roll Number: ${item.rollNumber}\nTransaction ID: ${item.transactionId}`
      : item.data;

    const isUrl = item.data.startsWith('http://') || item.data.startsWith('https://');

    Alert.alert(
      'Scanned Code',
      displayData,
      [
        {
          text: 'Share',
          onPress: () => {
            Share.share({ message: displayData });
          },
        },
        ...(isUrl
          ? [
              {
                text: 'Open',
                onPress: async () => {
                  const canOpen = await Linking.canOpenURL(item.data);
                  if (canOpen) {
                    await Linking.openURL(item.data);
                  }
                },
              },
            ]
          : []),
        { text: 'Close' },
      ]
    );
  };

  const getIconForType = (type: string, data: string) => {
    if (data.startsWith('http://') || data.startsWith('https://')) {
      return 'globe-outline';
    }
    if (data.startsWith('mailto:')) {
      return 'mail-outline';
    }
    if (data.startsWith('tel:')) {
      return 'call-outline';
    }
    return 'qr-code-outline';
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const renderItem = ({ item, index }: { item: ScannedData; index: number }) => (
    <Animated.View entering={FadeInRight.delay(index * 50)} exiting={FadeOutLeft}>
      <Pressable
        style={styles.historyItem}
        onPress={() => handleItemPress(item)}
        onLongPress={() => deleteItem(index)}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={getIconForType(item.type, item.data)} size={24} color="#007AFF" />
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.itemData} numberOfLines={2}>
            {item.qrType === 'volunteer' 
              ? `Volunteer: ${item.rollNumber}`
              : item.qrType === 'participant'
              ? `Participant: ${item.rollNumber}`
              : item.data
            }
          </Text>
          <Text style={styles.itemTime}>{formatDate(item.timestamp)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
      </Pressable>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scan History</Text>
        {history.length > 0 && (
          <Pressable onPress={clearHistory}>
            <Text style={styles.clearButton}>Clear All</Text>
          </Pressable>
        )}
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color="#C7C7CC" />
          <Text style={styles.emptyText}>No scan history yet</Text>
          <Text style={styles.emptySubtext}>
            Scanned QR codes will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.timestamp}-${index}`}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  clearButton: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5F2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemData: {
    fontSize: 16,
    color: '#000000',
    marginBottom: 4,
  },
  itemTime: {
    fontSize: 14,
    color: '#8E8E93',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#C7C7CC',
    textAlign: 'center',
  },
});
