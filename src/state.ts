import { create } from "zustand";

type CommandRun = {
	input: string;
	output: string;
};
type State = {
	pane: "header" | "stack" | "commits" | "viewer" | "log";
	commandLog: Array<CommandRun>;
	cursorBranch?: string;
	cursorCommit?: string;
	scrollPositions: {
		stack: number;
		commits: number;
		viewer: number;
		log: number;
	};
};

type Action = {
	setPane: (pane: State["pane"]) => void;
	setCursorBranch: (branchName: string) => void;
	setCursorCommit: (commitHash: string) => void;
	setScrollPosition: (pane: keyof State["scrollPositions"], position: number) => void;
};

export const useAppStore = create<State & Action>((set) => ({
	pane: "stack",
	commandLog: [],
	scrollPositions: {
		stack: 0,
		commits: 0,
		viewer: 0,
		log: 0,
	},
	setPane: (pane) => set({ pane }),
	setCursorBranch: (branchName) => set({ cursorBranch: branchName }),
	setCursorCommit: (commitHash) => set({ cursorCommit: commitHash }),
	setScrollPosition: (pane, position) => set((state) => ({
		scrollPositions: {
			...state.scrollPositions,
			[pane]: position,
		},
	})),
}));
