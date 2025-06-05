import { create } from "zustand";

type CommandRun = {
	input: string;
	output: string;
};
type State = {
	pane: "stack" | "commits" | "viewer" | "log";
	commandLog: Array<CommandRun>;
	cursorBranch?: string;
	cursorCommit?: string;
};

type Action = {
	setPane: (pane: State["pane"]) => void;
};

export const useAppStore = create<State & Action>((set) => ({
	pane: "stack",
	commandLog: [],
	setPane: (pane) => set({ pane }),
}));
