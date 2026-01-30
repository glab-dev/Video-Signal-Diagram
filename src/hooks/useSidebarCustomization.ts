import { useState, useEffect, useCallback } from 'react';
import {
  getSidebarCustomization,
  saveSidebarCustomization,
  resetSidebarCustomization,
} from '../store/db';
import type { SidebarCustomization } from '../store/db';

export interface UseSidebarCustomizationReturn {
  customization: SidebarCustomization;
  loading: boolean;
  // Category operations
  hideCategory: (categoryKey: string) => Promise<void>;
  showCategory: (categoryKey: string) => Promise<void>;
  isCategoryHidden: (categoryKey: string) => boolean;
  // Item operations
  hideItem: (categoryKey: string, itemName: string) => Promise<void>;
  showItem: (categoryKey: string, itemName: string) => Promise<void>;
  isItemHidden: (categoryKey: string, itemName: string) => boolean;
  // Move operations
  moveItem: (originalCategoryKey: string, itemName: string, newCategoryKey: string) => Promise<void>;
  getItemCategory: (originalCategoryKey: string, itemName: string) => string;
  // Reset
  resetToDefaults: () => Promise<void>;
}

const DEFAULT_CUSTOMIZATION: SidebarCustomization = {
  id: 'main',
  hiddenCategories: [],
  hiddenItems: [],
  itemMoves: {},
};

export function useSidebarCustomization(): UseSidebarCustomizationReturn {
  const [customization, setCustomization] = useState<SidebarCustomization>(DEFAULT_CUSTOMIZATION);
  const [loading, setLoading] = useState(true);

  // Load customization on mount
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getSidebarCustomization();
        setCustomization(data);
      } catch (error) {
        console.error('Failed to load sidebar customization:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Helper to create item key
  const getItemKey = (categoryKey: string, itemName: string) => `${categoryKey}:${itemName}`;

  // Category operations
  const hideCategory = useCallback(async (categoryKey: string) => {
    const newCustomization = {
      ...customization,
      hiddenCategories: [...customization.hiddenCategories, categoryKey],
    };
    setCustomization(newCustomization);
    await saveSidebarCustomization(newCustomization);
  }, [customization]);

  const showCategory = useCallback(async (categoryKey: string) => {
    const newCustomization = {
      ...customization,
      hiddenCategories: customization.hiddenCategories.filter(c => c !== categoryKey),
    };
    setCustomization(newCustomization);
    await saveSidebarCustomization(newCustomization);
  }, [customization]);

  const isCategoryHidden = useCallback((categoryKey: string) => {
    return customization.hiddenCategories.includes(categoryKey);
  }, [customization.hiddenCategories]);

  // Item operations
  const hideItem = useCallback(async (categoryKey: string, itemName: string) => {
    const itemKey = getItemKey(categoryKey, itemName);
    const newCustomization = {
      ...customization,
      hiddenItems: [...customization.hiddenItems, itemKey],
    };
    setCustomization(newCustomization);
    await saveSidebarCustomization(newCustomization);
  }, [customization]);

  const showItem = useCallback(async (categoryKey: string, itemName: string) => {
    const itemKey = getItemKey(categoryKey, itemName);
    const newCustomization = {
      ...customization,
      hiddenItems: customization.hiddenItems.filter(i => i !== itemKey),
    };
    setCustomization(newCustomization);
    await saveSidebarCustomization(newCustomization);
  }, [customization]);

  const isItemHidden = useCallback((categoryKey: string, itemName: string) => {
    const itemKey = getItemKey(categoryKey, itemName);
    return customization.hiddenItems.includes(itemKey);
  }, [customization.hiddenItems]);

  // Move operations
  const moveItem = useCallback(async (originalCategoryKey: string, itemName: string, newCategoryKey: string) => {
    const itemKey = getItemKey(originalCategoryKey, itemName);
    const newItemMoves = { ...customization.itemMoves };

    if (newCategoryKey === originalCategoryKey) {
      // Moving back to original category - remove the move
      delete newItemMoves[itemKey];
    } else {
      newItemMoves[itemKey] = newCategoryKey;
    }

    const newCustomization = {
      ...customization,
      itemMoves: newItemMoves,
    };
    setCustomization(newCustomization);
    await saveSidebarCustomization(newCustomization);
  }, [customization]);

  const getItemCategory = useCallback((originalCategoryKey: string, itemName: string) => {
    const itemKey = getItemKey(originalCategoryKey, itemName);
    return customization.itemMoves[itemKey] || originalCategoryKey;
  }, [customization.itemMoves]);

  // Reset
  const resetToDefaults = useCallback(async () => {
    await resetSidebarCustomization();
    setCustomization(DEFAULT_CUSTOMIZATION);
  }, []);

  return {
    customization,
    loading,
    hideCategory,
    showCategory,
    isCategoryHidden,
    hideItem,
    showItem,
    isItemHidden,
    moveItem,
    getItemCategory,
    resetToDefaults,
  };
}
