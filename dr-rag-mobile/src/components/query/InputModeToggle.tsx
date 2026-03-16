/**
 * Animated pill toggle between text and voice modes.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../constants/colors';

interface InputModeToggleProps {
  mode: 'text' | 'voice';
  onModeChange: (mode: 'text' | 'voice') => void;
}

const PILL_W = 136;

export function InputModeToggle({ mode, onModeChange }: InputModeToggleProps) {
  const translateX = useSharedValue(mode === 'text' ? 0 : PILL_W + 8);

  const handlePress = (newMode: 'text' | 'voice') => {
    translateX.value = withSpring(newMode === 'text' ? 0 : PILL_W + 8, {
      damping: 22,
      stiffness: 200,
    });
    onModeChange(newMode);
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.track}>
      {/* Animated gradient pill */}
      <Animated.View style={[styles.indicator, indicatorStyle]} pointerEvents="none">
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Text option */}
      <TouchableOpacity style={styles.option} onPress={() => handlePress('text')} activeOpacity={0.7}>
        <MaterialCommunityIcons
          name="keyboard-outline"
          size={18}
          color={mode === 'text' ? '#fff' : colors.textSecondary}
        />
        <Text style={[styles.label, mode === 'text' && styles.labelActive]}>Text</Text>
      </TouchableOpacity>

      {/* Voice option */}
      <TouchableOpacity style={styles.option} onPress={() => handlePress('voice')} activeOpacity={0.7}>
        <MaterialCommunityIcons
          name="microphone-outline"
          size={18}
          color={mode === 'voice' ? '#fff' : colors.textSecondary}
        />
        <Text style={[styles.label, mode === 'voice' && styles.labelActive]}>Voice</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: PILL_W,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: colors.glowTeal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 3,
  },
  option: {
    width: PILL_W,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    zIndex: 1,
  },
  label: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  labelActive: { color: '#fff' },
});

export default InputModeToggle;
