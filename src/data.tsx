import { Effect } from "effect";
import { Command } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { parseExtractedGraphiteData } from "./graphite-parser.js";
import { Rx } from "@effect-rx/rx-react";

export type BranchName = string;
export type BranchInfo = {
	name: string;
	parent: string;
	commits: Array<{
		hash: string;
		message: string;
		patch: string
	}>;
	children: string;
	prNumber: number;
	prStatus: string;
	currentVersion: number;
	remoteVersion: number;
};
export type TreeNode<T> = {
	data: T;
	parent: TreeNode<T>;
	children: Array<TreeNode<T>>;
};
export type Tree<T> = {
	root: TreeNode<T>;
};

export type FinalRequiredData = {
	trunkName: string;
	currentBranch: string;
	branchMap: Map<BranchName, BranchInfo>;
	tree: Tree<BranchName>;
};

export const runCommand = Effect.fnUntraced(function* (
	command: string,
	...args: Array<string>
) {
	const c = Command.make(command, ...args);
	const output = yield* Command.lines(c);
	return output;
});

export const getCurrentBranch = runCommand("git", "branch", "--show-current").pipe(
	Effect.map((lines) => lines[0]),
);

const runtime = Rx.runtime(NodeContext.layer);

export const currentBranchRx = runtime.rx(getCurrentBranch)
export const graphiteDataRx = runtime.rx(parseExtractedGraphiteData(".git"));
