import { queryOptions, useQuery } from "@tanstack/react-query";
import { Effect, pipe } from "effect";
import { Command } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { parseExtractedGraphiteData } from "./graphite-parser.js";

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
	gtLogS: string;
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
// Mock data for development
function createMockCommits(count: number, branchName: string) {
	const commits = [];
	const commitTypes = ["feat", "fix", "refactor", "docs", "test", "chore", "style", "perf"];
	const actions = ["add", "update", "remove", "improve", "optimize", "fix", "implement", "enhance"];
	const subjects = ["validation", "authentication", "component", "handler", "service", "utils", "config", "types", "tests", "documentation"];
	
	for (let i = 0; i < count; i++) {
		const type = commitTypes[Math.floor(Math.random() * commitTypes.length)];
		const action = actions[Math.floor(Math.random() * actions.length)];
		const subject = subjects[Math.floor(Math.random() * subjects.length)];
		const feature = branchName.split('/').pop() || branchName;
		
		// Create more realistic commit messages
		const messageVariations = [
			`${type}: ${action} ${feature} ${subject}`,
			`${type}: ${action} ${subject} for ${feature}`,
			`${type}(${feature}): ${action} ${subject}`,
			`${type}: ${action} missing ${subject} in ${feature}`,
			`${type}: ${action} better ${subject} handling`,
		];
		
		const message = messageVariations[Math.floor(Math.random() * messageVariations.length)];
		
		commits.push({
			hash: Math.random().toString(36).substring(2, 9),
			message,
			patch: `diff --git a/src/${feature}.ts b/src/${feature}.ts
index 1234567..abcdefg 100644
--- a/src/${feature}.ts
+++ b/src/${feature}.ts
@@ -10,6 +10,12 @@ export function ${feature}() {
+  // ${action} ${feature} functionality
+  const result = process${feature.charAt(0).toUpperCase() + feature.slice(1)}();
+  
   return result;
 }`
		});
	}
	
	return commits;
}

function buildTreeFromBranches(branches: Array<{ name: string; parent: string }>): Tree<BranchName> {
	const nodeMap = new Map<string, TreeNode<BranchName>>();
	
	// Create all nodes first
	for (const branch of branches) {
		nodeMap.set(branch.name, {
			data: branch.name,
			parent: null as unknown as TreeNode<BranchName>, // Will be set later
			children: []
		});
	}
	
	// Set up parent-child relationships
	let root: TreeNode<BranchName> | null = null;
	
	for (const branch of branches) {
		const node = nodeMap.get(branch.name);
		if (!node) continue;
		
		if (branch.parent && nodeMap.has(branch.parent)) {
			const parentNode = nodeMap.get(branch.parent);
			if (parentNode) {
				node.parent = parentNode;
				parentNode.children.push(node);
			}
		} else {
			// This is the root
			root = node;
		}
	}
	
	if (!root) {
		throw new Error("No root node found");
	}
	
	return { root };
}

export const mockFinalRequiredData: FinalRequiredData = (() => {
	const branches = [
		{ name: "main", parent: "" },
		{ name: "feature/auth", parent: "main" },
		{ name: "feature/auth-login", parent: "feature/auth" },
		{ name: "feature/auth-login-validation", parent: "feature/auth-login" },
		{ name: "feature/auth-signup", parent: "feature/auth" },
		{ name: "feature/auth-signup-email", parent: "feature/auth-signup" },
		{ name: "feature/dashboard", parent: "main" },
		{ name: "feature/dashboard-widgets", parent: "feature/dashboard" },
		{ name: "feature/dashboard-widgets-charts", parent: "feature/dashboard-widgets" },
		{ name: "feature/dashboard-layout", parent: "feature/dashboard" },
		{ name: "feature/dashboard-layout-responsive", parent: "feature/dashboard-layout" },
		{ name: "feature/api", parent: "main" },
		{ name: "feature/api-users", parent: "feature/api" },
		{ name: "feature/api-posts", parent: "feature/api" },
		{ name: "feature/api-posts-comments", parent: "feature/api-posts" },
	];
	
	const branchMap = new Map<BranchName, BranchInfo>();
	
	for (const branch of branches) {
		const commitCount = branch.name === "main" ? 8 : Math.floor(Math.random() * 6) + 3; // main gets 8, others get 3-8 commits
		const prNumber = branch.name === "main" ? 0 : Math.floor(Math.random() * 100) + 1;
		const prStatuses = ["open", "merged", "closed", "draft"];
		
		branchMap.set(branch.name, {
			name: branch.name,
			parent: branch.parent,
			commits: createMockCommits(commitCount, branch.name),
			children: branches.filter(b => b.parent === branch.name).map(b => b.name).join(","),
			prNumber,
			prStatus: prNumber === 0 ? "" : prStatuses[Math.floor(Math.random() * prStatuses.length)],
			currentVersion: Math.floor(Math.random() * 10) + 1,
			remoteVersion: Math.floor(Math.random() * 10) + 1,
			gtLogS: `◉ rhys/dmns-1291-having-edit-open-adding-a-domain-will-open-edit-on-the-newly (current)
│ 2 days ago
│
│ PR #46596 (Required checks failed) [project domains page]: remove id property which is not being sent to client
│ https://app.graphite.dev/github/pr/vercel/front/46596
│ Last submitted version: v2 (remote at v5, need get)
│
│ 48c43cb5801 - [project domains page]: remove id wophich is not being sent to client
│
◯ rhys/dmns-1290-clear-search-bar-after-entering-a-domain
│ 2 days ago
│
│ PR #46595 (Required checks failed) [project domains page]: clear search on enter domain name
│ https://app.graphite.dev/github/pr/vercel/front/46595
│ Last submitted version: v2 (remote at v5, need get)
│
│ de2ee5b8b34 - [project domains page]: clear search on enter domain name
│
◯ rhys/dmns-1251-get-rid-of-enable-vercel-dns-button-clicking-on-the-tab-is (needs restack)
│ 2 days ago
│
│ PR #46369 (Required checks failed) [project domains page]: auto enable vercel dns, style fixes, fix no-redirect flash
│ https://app.graphite.dev/github/pr/vercel/front/46369
│ Last submitted version: v11 (remote at v14, need get)
│
│ b88a855f936 - [project domains page]: auto enable vercel dns
│
◯ rhys/dmns-1231-if-invalid-configuration-show-dns-config-inline (needs restack)
│ 2 days ago
│
│ PR #46081 (Merge conflicts) [project domains page]: show status inline
│ https://app.graphite.dev/github/pr/vercel/front/46081
│ Last submitted version: v21 (remote at v22, need get)
│
│ b09cd838fb7 - [project domains page]: put add domain in a modal (#46084)
│ 83a4421c18b - [project domains page]: show status inline
│
◯ main
│ 4 hours ago
│
│ 7b1b19ed731 - [dash] Find 9 (#46855)
│`,
		});
	}
	
	return {
		trunkName: "main",
		currentBranch: "feature/auth-login-validation",
		branchMap,
		tree: buildTreeFromBranches(branches)
	};
})();
// Graphite data parsing (from extracted .git folder)
export const graphiteDataOptions = queryOptions({
	queryKey: ["graphite-data"],
	// change to .git later in prod lollllll
	queryFn: () => Effect.runPromise(parseExtractedGraphiteData("gt-extracted")),
});

export const useGraphiteData = () => useQuery(graphiteDataOptions);

