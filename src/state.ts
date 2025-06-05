import { create } from "zustand";

type CommandRun = {
	input: string;
	output: string;
};
type State = {
	pane: "stack" | "commits" | "viewer";
	commandLog: Array<CommandRun>;
	cursorBranch?: string;
	cursorCommit?: string;
};

type Action = {
	// /** Transition to loaded state when have new data */
	// dataLoaded: (data: AppData) => void;
	// /** Transition to error state with message */
	// setError: (error: string) => void;
	// /** Transition to refetching state (when starting refetch) */
	// startRefresh: () => void;
};

export const useAppStore = create<State & Action>((set) => ({
	pane: "stack",
	commandLog: [],
}));
