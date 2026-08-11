import { create } from "zustand";

interface RepState {
  name: string;
  email: string;
  pushToken: string | null;
  setRep: (name: string, email: string) => void;
  setPushToken: (token: string | null) => void;
}

/** Who the rep is, kept out of the query cache so a refetch never clears it. */
export const useRep = create<RepState>((set) => ({
  name: "Sai Shishir Koppula",
  email: "rep@example.com",
  pushToken: null,
  setRep: (name, email) => set({ name, email }),
  setPushToken: (pushToken) => set({ pushToken }),
}));
