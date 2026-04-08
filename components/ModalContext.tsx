'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface ModalState {
  isAddGymOpen: boolean;
  openAddGym: () => void;
  closeAddGym: () => void;
  isFeedbackOpen: boolean;
  openFeedback: () => void;
  closeFeedback: () => void;
}

const ModalCtx = createContext<ModalState>({
  isAddGymOpen: false,
  openAddGym: () => {},
  closeAddGym: () => {},
  isFeedbackOpen: false,
  openFeedback: () => {},
  closeFeedback: () => {},
});

export function ModalProvider({ children }: { children: ReactNode }) {
  const [isAddGymOpen, setIsAddGymOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  return (
    <ModalCtx.Provider
      value={{
        isAddGymOpen,
        openAddGym: () => setIsAddGymOpen(true),
        closeAddGym: () => setIsAddGymOpen(false),
        isFeedbackOpen,
        openFeedback: () => setIsFeedbackOpen(true),
        closeFeedback: () => setIsFeedbackOpen(false),
      }}
    >
      {children}
    </ModalCtx.Provider>
  );
}

export function useModal() {
  return useContext(ModalCtx);
}
