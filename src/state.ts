import { Rx, useRxSet } from "@effect-rx/rx-react";
import { Chunk } from "effect";
import { useCallback } from "react";

type Pane = "header" | "stack" | "commits" | "viewer" | "log";
export const paneRx = Rx.make<Pane>("stack");
export const cursorBranchRx = Rx.make<string | undefined>(undefined);
export const cursorCommitRx = Rx.make<string | undefined>(undefined);
export const scrollPositionRx = Rx.make<Record<Pane, number>>({
	header: 0,
	stack: 0,
	commits: 0,
	viewer: 0,
	log: 0
})
export const useSetScroll = () => {
	const setScroll = useRxSet(scrollPositionRx);
	return useCallback((pane: Pane, position: number) => {
		setScroll((prev) => ({
			...prev,
			[pane]: position
		}));
	}, [setScroll]);
}
type CommandRun = {
	command: string;
	output: string;
	color: string;
};
export const commandLogRx = Rx.make(Chunk.fromIterable<CommandRun>([
	{ command: "$ gt status", output: "✓ On branch: main", color: "green" },
	{ command: "$ gt log --oneline", output: "abc1234 feat: add login validation", color: "white" },
	{ command: "$ gt checkout feature/auth-login", output: "✓ Switched to branch 'feature/auth-login'", color: "green" },
	{ command: "$ gt sync", output: "✓ Synced with remote", color: "green" },
	{ command: "$ gt submit", output: "✓ Submitted PR #123", color: "green" },
	{ command: "$ gt stack", output: "◉ feature/auth-login (current)", color: "cyan" },
]))
