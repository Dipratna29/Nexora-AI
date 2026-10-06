import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from "./AppIcon";
import CosmicBackground from './CosmicBackground';
import GlassCard from './GlassCard';
import GlowButton from './GlowButton';
import { colors, typography, radius, spacing } from '../../theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log technical detail safely in development console without throwing to redbox
    if (__DEV__) {
      console.log('ErrorBoundary caught component exception:', error.message, errorInfo.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <CosmicBackground>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
              <GlassCard style={styles.card} variant="highlight" glow>
                <View style={styles.iconCircle}>
                  <Ionicons name="shield-outline" size={36} color={colors.warning} />
                </View>

                <Text style={styles.title}>Something went wrong</Text>
                <Text style={styles.description}>
                  We encountered an unexpected issue loading this section. Your account and emergency safety services remain secure.
                </Text>

                <GlowButton
                  title="Try Again"
                  onPress={this.handleReset}
                  icon="refresh"
                  size="md"
                  style={styles.retryBtn}
                />
              </GlassCard>
            </View>
          </SafeAreaView>
        </CosmicBackground>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 184, 77, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 184, 77, 0.3)',
  },
  title: {
    ...typography.h3,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryBtn: {
    width: '100%',
  },
});
