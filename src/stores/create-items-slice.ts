export interface ItemsSlice<TItem extends { id: string }> {
  items: TItem[];
  addItem: (item: TItem) => void;
  addItems: (items: TItem[]) => void;
  updateItem: (id: string, updates: Partial<TItem>) => void;
  removeItem: (id: string) => void;
  clearItems: () => void;
}

type ItemsSetState<TItem extends { id: string }> = (
  partial:
    | Partial<{ items: TItem[] }>
    | ((state: { items: TItem[] }) => Partial<{ items: TItem[] }>),
) => void;

export function createItemsSlice<TItem extends { id: string }>(
  set: ItemsSetState<TItem>,
): ItemsSlice<TItem> {
  return {
    items: [],
    addItem: (item) => set((s) => ({ items: [...s.items, item] })),
    addItems: (items) => set((s) => ({ items: [...s.items, ...items] })),
    updateItem: (id, updates) =>
      set((s) => ({
        items: s.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
      })),
    removeItem: (id) =>
      set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
    clearItems: () => set({ items: [] }),
  };
}
