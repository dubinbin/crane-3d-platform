import { create } from "zustand";
import type { CraneInfo, CurrentWorkCraneData } from "../types";


interface State {
  cranes: CraneInfo[];
  addCrane: (crane: CraneInfo) => void;
  removeCrane: (id: string) => void;
  updateCranePosition: (id: string, axis: 'x' | 'y' | 'z', value: number) => void;
  updateCraneRotation: (id: string, value: number) => void;
  updateCraneArmPitch: (id: string, value: number) => void;
  updateRopeLength: (id: string, value: number) => void;
  updateCraneHookHeight: (id: string, value: number) => void;
  updateCraneCarDistance: (id: string, value: number) => void;
  clearAllCranes: () => void;
  currentCrane: CurrentWorkCraneData | null;
  updateCurrentCrane: (crane: CurrentWorkCraneData) => void;
  clearCurrentCrane: () => void;
  errorLogs: {
    message: string;
    timestamp: number;
  }[];
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
  
  updateRopeLength: (id, value) => set((state) => ({
    cranes: state.cranes.map(c => 
      c.id === id ? { ...c, currentRopeLength: value } : c
    )
  })),

  updateCraneHookHeight: (id, value) => set((state) => ({
    cranes: state.cranes.map(c => 
      c.id === id ? { ...c, currentHookHeight: value } : c
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

  currentCrane: {
    workTime: 'N/A',
    workerName: '无操作人',
    craneId: 'N/A',
    craneLoadHeight: 0,
    craneHookheight: 0,
    currentRotationAngle: 0,
    currentCarDistance: 0,
    loadMatrix: 0,
    weight: 0,
    windSpeed: 0,
    swingWidth: 0,
    armInclinationAngle: 0,
  },

  updateCurrentCrane: (crane: CurrentWorkCraneData) => set({ currentCrane: crane }),

  clearCurrentCrane: () => set({ currentCrane: null }),
}));
