import { queryOptions, useQuery } from "@tanstack/react-query";
import { Effect, pipe } from "effect";
import { Command } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";

export type BranchName = string;
export type BranchInfo = {
	name: string;
	parent: string;
	commits: Array<string>;
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

export const currentBranchOptions = queryOptions({
	queryKey: ["current-branch"],
	queryFn: () =>
		getCurrentBranch.pipe(Effect.provide(NodeContext.layer), Effect.runPromise),
});

export const gtLogS = Effect.fnUntraced(function* (branchName: string) {
	const output = yield* runCommand("gt", "log", "-s");
	return output.join("\n");
});

export const gtLogSOptions = (branchName: string) =>
	queryOptions({
		queryKey: ["gt-log-s", branchName],
		queryFn: () =>
			gtLogS(branchName).pipe(
				Effect.provide(NodeContext.layer),
				Effect.runPromise,
			),
	});

