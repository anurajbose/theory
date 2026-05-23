import { create } from 'zustand';
import { JobRoleKey } from '../utils/roleConfig';

interface OnboardingState {
  step: number;
  jobRole: JobRoleKey | null;
  deptId: string | null;
  teamId: string | null;
  sections: string[];
  setStep: (step: number) => void;
  next: () => void;
  back: () => void;
  setJobRole: (role: JobRoleKey, defaultSections: string[]) => void;
  setDeptTeam: (deptId: string, teamId: string) => void;
  setSections: (sections: string[]) => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  step: 1,
  jobRole: null,
  deptId: null,
  teamId: null,
  sections: [],

  setStep: (step) => set({ step }),
  next: () => set((s) => ({ step: Math.min(s.step + 1, 5) })),
  back: () => set((s) => ({ step: Math.max(s.step - 1, 1) })),
  setJobRole: (jobRole, sections) => set({ jobRole, sections }),
  setDeptTeam: (deptId, teamId) => set({ deptId, teamId }),
  setSections: (sections) => set({ sections }),
}));
