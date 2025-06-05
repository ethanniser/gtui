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
	selectedCommitIndex: number;
};

type Action = {
	setPane: (pane: State["pane"]) => void;
	setSelectedCommitIndex: (index: number) => void;
};

export const useAppStore = create<State & Action>((set) => ({
	pane: "stack",
	commandLog: [],
	selectedCommitIndex: 0,
	setPane: (pane) => set({ pane }),
	setSelectedCommitIndex: (index) => set({ selectedCommitIndex: index }),
}));
