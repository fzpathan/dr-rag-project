/**
 * Toggle between text and voice input modes.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../../constants/colors';

interface InputModeToggleProps {
  mode: 'text' | 'voice';
  onModeChange: (mode: 'text' | 'voice') => void;
}

export function InputModeToggle({ mode, onModeChange }: InputModeToggleProps) {
  const translateX = useSharedValue(mode === 'text' ? 0 : 1);

  const handlePress = (newMode: 'text' | 'voice') => {
    translateX.value = withTiming(newMode === 'text' ? 0 : 1, { duration: 200 });
    onModeChange(newMode);
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value * 140 }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.indicator, indicatorStyle]} />

      <TouchableOpacity
        style={styles.option}
        onPress={() => handlePress('text')}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name="keyboard"
          size={20}
          color={mode === 'text' ? colors.textOnPrimary : colors.textSecondary}
        />
        <Text
          style={[
            styles.optionText,
            mode === 'text' && styles.optionTextActive,
          ]}
        >
          Text
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.option}
        onPress={() => handlePress('voice')}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name="microphone"
          size={20}
          color={mode === 'voice' ? colors.textOnPrimary : colors.textSecondary}
        />
        <Text
          style={[
            styles.optionText,
            mode === 'voice' && styles.optionTextActive,
          ]}
        >
          Voice
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.neutral[200],
    borderRadius: 12,
    padding: 4,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 140,
    height: 44,
    backgroundColor: colors.primary[500],
    borderRadius: 10,
  },
  option: {
    width: 140,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 1,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  optionTextActive: {
    color: colors.textOnPrimary,
  },
});

export default InputModeToggle;
