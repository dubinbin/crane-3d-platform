import { create } from "zustand";
import { type CraneInfo } from "../types";


interface State {
  cranes: CraneInfo[];
  addCrane: (crane: CraneInfo) => void;
  removeCrane: (id: string) => void;
  updateCranePosition: (id: string, axis: 'x' | 'y' | 'z', value: number) => void;
  updateCraneRotation: (id: string, value: number) => void;
  updateCraneRotationText: (id: string, value: string) => void;
  updateCraneArmPitch: (id: string, value: number) => void;
  updateCraneArmPitchText: (id: string, value: string) => void;
  updateRopeLength: (id: string, value: number) => void;
  updateCraneCarDistance: (id: string, value: number) => void;
  updateCraneCarDistanceText: (id: string, value: string) => void;
  clearAllCranes: () => void;
  currentOperationCraneId: string | null;
  setCurrentOperationCraneId: (id: string | null) => void;
  errorLogs: {
    message: string;
    timestamp: number;
  }[];
  updateOtherWorkParams: (id: string, params: { workTime?: string; workerName?: string; loadMatrix?: number; weight?: number; windSpeed?: number; swingWidth?: number; armInclinationAngle?: number }) => void;
}

export const useStore = create<State>((set) => ({
  cranes: [],

  addCrane: (crane) => set((state) => ({
    cranes: [...state.cranes, crane]
  })),
  
  removeCrane: (id) => set((state) => ({
    cranes: state.cranes.filter(c => c.id !== id)
  })),
  
  updateCranePosition: (id, axis, value) => set((state) => ({
    cranes: state.cranes.map(c => 
      c.id === id 
        ? { ...c, position: { ...c.position, [axis]: value } as { x: number; y: number; z: number } }
        : c
    )
  })),
  
  updateCraneRotation: (id, value) => set((state) => ({
    cranes: state.cranes.map(c => 
      c.id === id ? { ...c, currentRotationAngle: value } : c
    )
  })),
  
  updateCraneArmPitch: (id, value) => set((state) => ({
    cranes: state.cranes.map(c => 
      c.id === id ? { ...c, currentArmPitchAngle: value } : c
    )
  })),
  
  updateCraneCarDistanceText: (id, value) => set((state) => ({
    cranes: state.cranes.map(c => 
      c.id === id ? { ...c, currentCarDistanceText: value } : c
    )
  })),
  updateRopeLength: (id, value) => set((state) => ({
    cranes: state.cranes.map(c => 
      c.id === id ? { ...c, currentRopeLength: value } : c
    )
  })),

  updateCraneCarDistance: (id, value) => set((state) => ({
    cranes: state.cranes.map(c => 
      c.id === id ? { ...c, currentCarDistance: value } : c
    )
  })),

  clearAllCranes: () => set({ cranes: [] }),

  errorLogs: [],

  addErrorLog: (log: { message: string; timestamp: number }) => set((state) => ({
    errorLogs: [...state.errorLogs, { message: log.message, timestamp: log.timestamp }]
  })),

  clearErrorLogs: () => set({ errorLogs: [] }),

  updateOtherWorkParams: (id: string, params: { workTime?: string; workerName?: string; loadMatrix?: number; weight?: number; windSpeed?: number; swingWidth?: number; armInclinationAngle?: number }) => set((state) => ({
    cranes: state.cranes.map(c => 
      c.id === id ? { ...c, ...params } : c
    )
  })),

  currentOperationCraneId: null,

  setCurrentOperationCraneId: (id) => set({ currentOperationCraneId: id }),

  updateCraneRotationText: (id, value) => set((state) => ({
    cranes: state.cranes.map(c => 
      c.id === id ? { ...c, currentRotationAngleText: value } : c
    )
  })),

  updateCraneArmPitchText: (id, value) => set((state) => ({
    cranes: state.cranes.map(c => 
      c.id === id ? { ...c, currentArmPitchAngleText: value } : c
    )
  })),
}));
