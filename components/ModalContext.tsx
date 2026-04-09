'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface DoplnitGym {
  id: number;
  name: string;
  note?: string;
}

interface ModalState {
  isAddGymOpen: boolean;
  openAddGym: () => void;
  closeAddGym: () => void;
  isFeedbackOpen: boolean;
  openFeedback: () => void;
  closeFeedback: () => void;
  doplnitGym: DoplnitGym | null;
  openDoplnit: (gym: DoplnitGym) => void;
  closeDoplnit: () => void;
}

const ModalCtx = createContext<ModalState>({
  isAddGymOpen: false,
  openAddGym: () => {},
  closeAddGym: () => {},
  isFeedbackOpen: false,
  openFeedback: () => {},
  closeFeedback: () => {},
  doplnitGym: null,
  openDoplnit: () => {},
  closeDoplnit: () => {},
});

export function ModalProvider({ children }: { children: ReactNode }) {
  const [isAddGymOpen, setIsAddGymOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [doplnitGym, setDoplnitGym] = useState<DoplnitGym | null>(null);

  return (
    <ModalCtx.Provider
      value={{
        isAddGymOpen,
        openAddGym: () => setIsAddGymOpen(true),
        closeAddGym: () => setIsAddGymOpen(false),
        isFeedbackOpen,
        openFeedback: () => setIsFeedbackOpen(true),
        closeFeedback: () => setIsFeedbackOpen(false),
        doplnitGym,
        openDoplnit: (gym) => setDoplnitGym(gym),
        closeDoplnit: () => setDoplnitGym(null),
      }}
    >
      {children}
    </ModalCtx.Provider>
  );
}

export function useModal() {
  return useContext(ModalCtx);
}
