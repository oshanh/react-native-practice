import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDBLogs } from '../../database/dbLogger';

export default function LogsScreen() {
  const { logs, clearLogs } = useDBLogs();
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollViewRef = useRef<ScrollView | null>(null);

  const getLogColor = (level: string) => {
    switch (level) {
      case 'error': return '#ef4444';
      case 'warn': return '#f59e0b';
      case 'info': return '#3b82f6';
      case 'debug': return '#8b5cf6';
      default: return '#9ca3af';
    }
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error': return 'alert-circle';
      case 'warn': return 'warning';
      case 'info': return 'information-circle';
      case 'debug': return 'bug';
      default: return 'radio-button-on';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Database Logs</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.headerButton, autoScroll && styles.activeButton]}
            onPress={() => setAutoScroll(!autoScroll)}
          >
            <Ionicons 
              name={autoScroll ? 'play' : 'pause'} 
              size={16} 
              color={autoScroll ? '#10b981' : '#6b7280'} 
            />
            <Text style={[styles.headerButtonText, autoScroll && styles.activeButtonText]}>
              Auto-scroll
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearButton} onPress={clearLogs}>
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsBar}>
        <Text style={styles.statsText}>Total: {logs.length}</Text>
        <Text style={styles.statsText}>
          Errors: {logs.filter((l: { level: string }) => l.level === 'error').length}
        </Text>
        <Text style={styles.statsText}>
          Warnings: {logs.filter((l: { level: string }) => l.level === 'warn').length}
        </Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        onContentSizeChange={() => {
          if (autoScroll && scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true });
          }
        }}
      >
        {logs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color="#6b7280" />
            <Text style={styles.emptyText}>No logs yet</Text>
            <Text style={styles.emptySubtext}>
              Database operations will appear here
            </Text>
          </View>
        ) : (
          logs.map((log, index) => (
            <View key={`${log.timestamp}-${index}`} style={styles.logItem}>
              <View style={styles.logHeader}>
                <View style={styles.logIconContainer}>
                  <Ionicons 
                    name={getLogIcon(log.level) as any} 
                    size={16} 
                    color={getLogColor(log.level)} 
                  />
                </View>
                <Text style={styles.logTime}>{log.timestamp}</Text>
                <Text style={[styles.logLevel, { color: getLogColor(log.level) }]}>
                  {log.level.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.logMessage}>{log.message}</Text>
              {log.details && (
                <Text style={styles.logDetails}>{log.details}</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
  },
  header: {
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#1a1d21',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#374151',
  },
  activeButton: {
    backgroundColor: '#065f46',
  },
  headerButtonText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
  },
  activeButtonText: {
    color: '#10b981',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#7f1d1d',
  },
  clearButtonText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    backgroundColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  statsText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 8,
  },
  logItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  logIconContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logTime: {
    color: '#6b7280',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  logLevel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  logMessage: {
    color: '#e5e7eb',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'monospace',
  },
  logDetails: {
    color: '#9ca3af',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
    fontFamily: 'monospace',
  },
});
