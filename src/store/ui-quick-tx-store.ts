import { create } from "zustand";

export interface QuickTxModalState {
  isOpen: boolean;
  defaultType: "expense" | "income";
  openQuickTx: (defaultType?: "expense" | "income") => void;
  closeQuickTx: () => void;
  setIsOpen: (isOpen: boolean) => void;
}

export const useQuickTxModal = create<QuickTxModalState>((set) => ({
  isOpen: false,
  defaultType: "expense",
  openQuickTx: (defaultType = "expense") => set({ isOpen: true, defaultType }),
  closeQuickTx: () => set({ isOpen: false }),
  setIsOpen: (isOpen) => set({ isOpen }),
}));
