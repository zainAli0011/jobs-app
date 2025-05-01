import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '../constants/Colors';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { Category, JOB_TYPES } from '../services/api';

interface FilterSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterOptions) => void;
  categories: Category[];
  currentFilters: FilterOptions;
}

export interface FilterOptions {
  search?: string;
  category?: string;
  location?: string;
  type?: string;
  featured?: boolean;
}

export const FilterSheet: React.FC<FilterSheetProps> = ({
  isVisible,
  onClose,
  onApplyFilters,
  categories,
  currentFilters,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [filters, setFilters] = useState<FilterOptions>(currentFilters || {});
  const [categoryExpanded, setCategoryExpanded] = useState(false);
  const [jobTypeExpanded, setJobTypeExpanded] = useState(false);

  useEffect(() => {
    // Update local filters when current filters change
    setFilters(currentFilters || {});
  }, [currentFilters]);

  if (!isVisible) return null;

  const handleToggleCategory = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCategoryExpanded(!categoryExpanded);
    if (categoryExpanded && jobTypeExpanded) setJobTypeExpanded(false);
  };

  const handleToggleJobType = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setJobTypeExpanded(!jobTypeExpanded);
    if (jobTypeExpanded && categoryExpanded) setCategoryExpanded(false);
  };

  const handleSelectCategory = (categorySlug: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilters(prev => ({
      ...prev,
      category: prev.category === categorySlug ? undefined : categorySlug,
    }));
    setCategoryExpanded(false);
  };

  const handleSelectJobType = (type: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilters(prev => ({
      ...prev,
      type: prev.type === type ? undefined : type,
    }));
    setJobTypeExpanded(false);
  };

  const handleToggleFeatured = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilters(prev => ({
      ...prev,
      featured: !prev.featured,
    }));
  };

  const handleReset = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setFilters({});
  };

  const handleApply = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onApplyFilters(filters);
    onClose();
  };

  const getActiveCategoryName = () => {
    if (!filters.category) return 'All Categories';
    const category = categories.find(c => c.slug === filters.category);
    return category ? category.name : 'All Categories';
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.overlay}
    >
      <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
      
      <BlurView
        intensity={90}
        tint={colorScheme === 'dark' ? 'dark' : 'light'}
        style={[
          styles.container,
          { backgroundColor: colorScheme === 'dark' ? 'rgba(25, 26, 31, 0.9)' : 'rgba(255, 255, 255, 0.9)' }
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Filter Jobs</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <FontAwesome5 name="times" size={18} color={colors.icon} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* Category filter */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Category</Text>
            <TouchableOpacity
              style={[
                styles.dropdownButton,
                { 
                  backgroundColor: colorScheme === 'dark' ? '#2D3038' : '#F3F4F6',
                  borderColor: colorScheme === 'dark' ? '#3E4049' : '#E5E7EB' 
                }
              ]}
              onPress={handleToggleCategory}
            >
              <Text style={[
                styles.dropdownButtonText,
                { color: filters.category ? colors.tint : colors.text }
              ]}>
                {getActiveCategoryName()}
              </Text>
              <FontAwesome5
                name={categoryExpanded ? 'chevron-up' : 'chevron-down'}
                size={12}
                color={colors.icon}
              />
            </TouchableOpacity>
            
            {categoryExpanded && (
              <View style={[
                styles.dropdownList,
                { 
                  backgroundColor: colorScheme === 'dark' ? '#2D3038' : '#F3F4F6',
                  borderColor: colorScheme === 'dark' ? '#3E4049' : '#E5E7EB' 
                }
              ]}>
                <ScrollView 
                  style={styles.dropdownScroll}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  <TouchableOpacity 
                    style={[
                      styles.dropdownItem,
                      !filters.category && styles.activeDropdownItem
                    ]}
                    onPress={() => handleSelectCategory('')}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      !filters.category && { color: colors.tint, fontWeight: '500' },
                      { color: !filters.category ? colors.tint : colors.text }
                    ]}>
                      All Categories
                    </Text>
                  </TouchableOpacity>
                  
                  {categories.map((category) => (
                    <TouchableOpacity 
                      key={category.id}
                      style={[
                        styles.dropdownItem,
                        filters.category === category.slug && styles.activeDropdownItem
                      ]}
                      onPress={() => handleSelectCategory(category.slug)}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        { color: filters.category === category.slug ? colors.tint : colors.text }
                      ]}>
                        {category.name} {category.count ? `(${category.count})` : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
          
          {/* Location filter - changed to text input */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: colorScheme === 'dark' ? '#2D3038' : '#F3F4F6',
                  color: colors.text,
                  borderColor: colorScheme === 'dark' ? '#3E4049' : '#E5E7EB' 
                }
              ]}
              placeholder="Enter city, state, or 'Remote'..."
              placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#9CA3AF'}
              value={filters.location}
              onChangeText={(text) => setFilters(prev => ({ ...prev, location: text }))}
            />
          </View>
          
          {/* Job Type filter */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Job Type</Text>
            <TouchableOpacity
              style={[
                styles.dropdownButton,
                { 
                  backgroundColor: colorScheme === 'dark' ? '#2D3038' : '#F3F4F6',
                  borderColor: colorScheme === 'dark' ? '#3E4049' : '#E5E7EB' 
                }
              ]}
              onPress={handleToggleJobType}
            >
              <Text style={[
                styles.dropdownButtonText,
                { color: filters.type ? colors.tint : colors.text }
              ]}>
                {filters.type || 'All Job Types'}
              </Text>
              <FontAwesome5
                name={jobTypeExpanded ? 'chevron-up' : 'chevron-down'}
                size={12}
                color={colors.icon}
              />
            </TouchableOpacity>
            
            {jobTypeExpanded && (
              <View style={[
                styles.dropdownList,
                { 
                  backgroundColor: colorScheme === 'dark' ? '#2D3038' : '#F3F4F6',
                  borderColor: colorScheme === 'dark' ? '#3E4049' : '#E5E7EB' 
                }
              ]}>
                <ScrollView 
                  style={styles.dropdownScroll}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  <TouchableOpacity 
                    style={[
                      styles.dropdownItem,
                      !filters.type && styles.activeDropdownItem
                    ]}
                    onPress={() => handleSelectJobType('')}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      !filters.type && { color: colors.tint, fontWeight: '500' },
                      { color: !filters.type ? colors.tint : colors.text }
                    ]}>
                      All Job Types
                    </Text>
                  </TouchableOpacity>
                  
                  {JOB_TYPES.map((type) => (
                    <TouchableOpacity 
                      key={type}
                      style={[
                        styles.dropdownItem,
                        filters.type === type && styles.activeDropdownItem
                      ]}
                      onPress={() => handleSelectJobType(type)}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        { color: filters.type === type ? colors.tint : colors.text }
                      ]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
          
          {/* Featured jobs toggle */}
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.toggleContainer}
              onPress={handleToggleFeatured}
            >
              <View style={styles.toggleTextContainer}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Featured Jobs Only
                </Text>
                <Text style={[styles.toggleDescription, { color: colors.icon }]}>
                  Show only featured job postings
                </Text>
              </View>
              
              <View style={[
                styles.toggle,
                { backgroundColor: filters.featured ? colors.tint : colorScheme === 'dark' ? '#3E4049' : '#E5E7EB' }
              ]}>
                <View style={[
                  styles.toggleHandle,
                  { 
                    backgroundColor: colorScheme === 'dark' ? '#F3F4F6' : '#FFFFFF',
                    transform: [{ translateX: filters.featured ? 18 : 0 }]
                  }
                ]} />
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
        
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[
              styles.footerButton,
              styles.resetButton,
              { borderColor: colorScheme === 'dark' ? '#3E4049' : '#E5E7EB' }
            ]}
            onPress={handleReset}
          >
            <Text style={[styles.resetButtonText, { color: colors.text }]}>Reset</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.footerButton, styles.applyButton, { backgroundColor: colors.tint }]}
            onPress={handleApply}
          >
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    position: 'relative',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(150, 150, 150, 0.2)',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    maxHeight: '80%',
  },
  section: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    fontSize: 16,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownButtonText: {
    fontSize: 16,
  },
  dropdownList: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    maxHeight: 200,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(150, 150, 150, 0.2)',
  },
  activeDropdownItem: {
    backgroundColor: 'rgba(79, 70, 229, 0.05)',
  },
  dropdownItemText: {
    fontSize: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
  },
  toggleHandle: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(150, 150, 150, 0.2)',
  },
  footerButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButton: {
    marginRight: 8,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  applyButton: {
    marginLeft: 8,
  },
  applyButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '500',
  },
}); 