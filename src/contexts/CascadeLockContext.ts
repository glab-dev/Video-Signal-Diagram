import { createContext } from 'react';

export interface CascadeLockContextType {
  getCascadeGroup: (nodeId: string) => { isLocked: boolean; isFirstInGroup: boolean; groupNodes: string[] };
  toggleCascadeLock: (nodeId: string) => void;
}

export const CascadeLockContext = createContext<CascadeLockContextType | null>(null);
