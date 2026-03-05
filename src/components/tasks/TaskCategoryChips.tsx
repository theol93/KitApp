import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

type TaskCategoryChipsProps = {
  categories: string[];
  selectedCategory: string;
  onSelect: (category: string) => void;
};

export const TaskCategoryChips: React.FC<TaskCategoryChipsProps> = ({
  categories,
  selectedCategory,
  onSelect,
}) => {
  const renderCategory = ({ item }: { item: string }) => {
    const isActive = item === selectedCategory;
    return (
      <Pressable
        onPress={() => onSelect(item)}
        style={[styles.categoryChip, isActive && styles.categoryChipActive]}
      >
        <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>{item}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.categoriesContainer}>
      <FlatList
        horizontal
        data={categories}
        keyExtractor={item => item}
        renderItem={renderCategory}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  categoriesContainer: {
    marginBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#333333',
    marginRight: 8,
    backgroundColor: '#0D0D0D',
  },
  categoryChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  categoryChipText: {
    color: '#E5E5E5',
    fontSize: 13,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

