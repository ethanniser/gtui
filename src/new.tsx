import {
	queryOptions,
	useQuery,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { useAppStore } from "./state.js";
import { Effect, pipe } from "effect";
import { Command } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";

type BranchName = string;
type BranchInfo = {
	name: string;
	parent: string;
	commits: Array<string>;
	children: string;
	prNumber: number;
	prStatus: string;
	currentVersion: number;
	remoteVersion: number;
};
type TreeNode<T> = {
	data: T;
	parent: TreeNode<T>;
	children: Array<TreeNode<T>>;
};
type Tree<T> = {
	root: TreeNode<T>;
};

type FinalRequiredData = {
	trunkName: string;
	currentBranch: string;
	branchMap: Map<BranchName, BranchInfo>;
	tree: Tree<BranchName>;
};

const runCommand = Effect.fnUntraced(function* (
	command: string,
	...args: Array<string>
) {
	const c = Command.make(command, ...args);
	const output = yield* Command.lines(c);
	return output;
});

const getCurrentBranch = runCommand("git", "branch", "--show-current").pipe(
	Effect.map((lines) => lines[0]),
);

const currentBranchOptions = queryOptions({
	queryKey: ["current-branch"],
	queryFn: () =>
		getCurrentBranch.pipe(Effect.provide(NodeContext.layer), Effect.runPromise),
});

const gtLogS = Effect.fnUntraced(function* (branchName: string) {
	const output = yield* runCommand("gt", "log", "-s");
	return output.join("\n");
});

const gtLogSOptions = (branchName: string) =>
	queryOptions({
		queryKey: ["gt-log-s", branchName],
		queryFn: () =>
			gtLogS(branchName).pipe(
				Effect.provide(NodeContext.layer),
				Effect.runPromise,
			),
	});
function App() {
	const currentBranch = useQuery(currentBranchOptions);
}
function Stack() {}
function Commits() {}
function Viewer({ currentBranch }: { currentBranch: string }) {
	const gtLogSResult = useQuery(gtLogSOptions(currentBranch));
}
function CommandLog() {}
