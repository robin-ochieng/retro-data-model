import React, { createContext, useContext } from 'react';

/**
 * ViewModeContext provides read-only state for submitted submissions.
 * When isViewMode is true:
 * - All form inputs are disabled/read-only
 * - Autosave is blocked
 * - Mutations are prevented
 * - Users can only navigate and view data
 */
export const ViewModeContext = createContext<boolean>(false);

export const useViewMode = (): boolean => {
  return useContext(ViewModeContext);
};

interface ViewModeProviderProps {
  isViewMode: boolean;
  children: React.ReactNode;
}

export const ViewModeProvider: React.FC<ViewModeProviderProps> = ({ isViewMode, children }) => {
  return <ViewModeContext.Provider value={isViewMode}>{children}</ViewModeContext.Provider>;
};
