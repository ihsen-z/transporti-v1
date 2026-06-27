import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/core/auth/authStore';
import { useTheme } from '../../src/core/theme/ThemeProvider';
import { tokenService } from '../../src/core/auth/tokenService';
import { apiClient } from '../../src/core/api/client';
import { socketManager } from '../../src/core/socket/socketManager';
import { Feather } from '@expo/vector-icons';
import * as Linking from 'expo-linking';

interface Message {
  id: number;
  content: string;
  sender: {
    id: number;
    name: string;
    role: string;
  };
  is_system: boolean;
  is_read: boolean;
  created_at: string;
}

interface OtherParty {
  id: number;
  name: string;
  role: string;
  phone: string | null;
  email: string | null;
}

interface JobInfo {
  id: number;
  pickup_address: string;
  dropoff_address: string;
  status: string;
  job_type: string;
}

export default function ChatScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { theme } = useTheme();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [otherParty, setOtherParty] = useState<OtherParty | null>(null);
  const [jobInfo, setJobInfo] = useState<JobInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  // Fetch message list
  const fetchMessages = useCallback(async (silent = false) => {
    try {
      const response = await apiClient.get(`/jobs/${jobId}/messages/`);
      const data = response.data;
      setOtherParty(data.other_party);
      setJobInfo(data.job);
      
      setMessages((prev) => {
        const merged = [...prev];
        data.messages.forEach((newMsg: any) => {
          if (!merged.some((m) => m.id === newMsg.id)) {
            merged.push(newMsg);
          }
        });
        return merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      });
    } catch (err) {
      console.warn('[ChatScreen] Error fetching messages:', err);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [jobId]);

  // 1. Initial Load & Polling Fallback
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMessages();
    }, 0);

    const interval = setInterval(() => {
      fetchMessages(true);
    }, 4000); // Poll every 4 seconds

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchMessages]);

  // 2. WebSocket Setup
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    tokenService.getAccessToken().then((token) => {
      if (!token) return;

      socketManager.connect(Number(jobId), token);
      setIsSocketConnected(true);

      unsubscribe = socketManager.onMessage((msg) => {
        if (msg && msg.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          });
          // Scroll to end when message is received
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
      socketManager.disconnect();
      setIsSocketConnected(false);
    };
  }, [jobId]);

  // Scroll to bottom when messages load
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 200);
    }
  }, [isLoading, messages.length]);

  // Send message handler
  const handleSend = async () => {
    if (!inputText.trim()) return;
    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      // Send message via POST HTTP API (failsafe & authenticated)
      const response = await apiClient.post(`/jobs/${jobId}/messages/`, {
        content: textToSend,
      });

      const newMsg = response.data.data;
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      });

      // Also try to send via websocket to keep other client informed in real-time
      if (isSocketConnected) {
        socketManager.sendMessage(textToSend);
      }

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible d’envoyer le message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCall = () => {
    if (otherParty?.phone) {
      Linking.openURL(`tel:${otherParty.phone}`);
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    if (item.is_system) {
      return (
        <View style={styles.systemMessageContainer}>
          <View style={[styles.systemMessageBadge, { backgroundColor: theme.colors.neutral[100] }]}>
            <Text style={[styles.systemMessageText, { color: theme.colors.neutral[600] }]}>
              {item.content}
            </Text>
          </View>
        </View>
      );
    }

    const isMine = item.sender.id === user?.id;

    return (
      <View style={[styles.messageRow, isMine ? styles.myRow : styles.otherRow]}>
        <View
          style={[
            styles.messageBubble,
            isMine
              ? [styles.myBubble, { backgroundColor: theme.colors.primary[500] }]
              : [styles.otherBubble, { backgroundColor: theme.colors.neutral[200] }],
          ]}
        >
          {!isMine && (
            <Text style={[styles.senderName, { color: theme.colors.primary[700] }]}>
              {item.sender.name} ({item.sender.role === 'CLIENT' ? 'Client' : 'Transporteur'})
            </Text>
          )}
          <Text style={[styles.messageText, { color: isMine ? '#FFF' : theme.colors.text.primary }]}>
            {item.content}
          </Text>
          <Text style={[styles.timeText, { color: isMine ? 'rgba(255,255,255,0.7)' : theme.colors.text.secondary }]}>
            {new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIconButton}>
          <Feather name="arrow-left" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
            {otherParty ? otherParty.name : 'Discussion'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.text.secondary }]}>
            {otherParty ? (otherParty.role === 'CLIENT' ? 'Client' : 'Transporteur') : 'Chargement...'}
          </Text>
        </View>

        {otherParty?.phone ? (
          <TouchableOpacity onPress={handleCall} style={styles.callButton}>
            <Feather name="phone" size={20} color={theme.colors.primary[500]} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Mini Job Summary bar */}
      {jobInfo && (
        <View style={[styles.jobBar, { backgroundColor: theme.colors.background.card, borderBottomColor: theme.colors.border.default }]}>
          <Feather name="truck" size={16} color={theme.colors.text.secondary} />
          <Text style={[styles.jobBarText, { color: theme.colors.text.primary }]} numberOfLines={1}>
            {jobInfo.job_type} : {jobInfo.pickup_address} ➔ {jobInfo.dropoff_address}
          </Text>
          <View style={[styles.jobStatusBadge, { backgroundColor: theme.colors.primary[50] }]}>
            <Text style={[styles.jobStatusText, { color: theme.colors.primary[700] }]}>{jobInfo.status}</Text>
          </View>
        </View>
      )}

      {/* Message List */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onLayout={() => {
            if (messages.length > 0) flatListRef.current?.scrollToEnd({ animated: false });
          }}
        />

        {/* Input Bar */}
        <View style={[styles.inputBar, { borderTopColor: theme.colors.border.default, backgroundColor: theme.colors.background.card }]}>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.background.default, color: theme.colors.text.primary }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Écrivez votre message..."
            placeholderTextColor={theme.colors.text.secondary}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: theme.colors.primary[500] }]}
            onPress={handleSend}
            disabled={isSending || !inputText.trim()}
          >
            {isSending ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Feather name="send" size={18} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  backIconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 12,
  },
  callButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  jobBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  jobBarText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  jobStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  jobStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 16,
  },
  messageRow: {
    flexDirection: 'row',
    width: '100%',
  },
  myRow: {
    justifyContent: 'flex-end',
  },
  otherRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  myBubble: {
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 19,
  },
  timeText: {
    fontSize: 9,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 8,
    width: '100%',
  },
  systemMessageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  systemMessageText: {
    fontSize: 11,
    textAlign: 'center',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
