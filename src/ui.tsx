import { Text, Box } from "ink";
import { useQuery } from "@tanstack/react-query";
import type { FinalRequiredData } from "./data.js";
import { currentBranchOptions } from "./data.js";

interface PaneProps {
	isSelected: boolean;
	data: FinalRequiredData;
	height?: number;
	scrollPosition?: number;
}

interface CommitsProps extends PaneProps {
	cursorCommit: string | undefined;
}

interface StackProps extends PaneProps {
	cursorBranch: string | undefined;
}

interface ViewerProps extends PaneProps {
	cursorCommit: string | undefined;
	cursorBranch: string | undefined;
	showAsciiArt: boolean;
}

export function Stack({ cursorBranch, data, height, isSelected, scrollPosition = 0 }: StackProps) {
	// Build a tree structure from the branch map
	const buildBranchTree = () => {
		const branches: Array<{ name: string; depth: number; isLast: Array<boolean>; isCurrent: boolean }> = [];
		
		// Helper to add branches recursively
		const addBranch = (branchName: string, depth: number, isLast: Array<boolean>) => {
			const branch = data.branchMap.get(branchName);
			if (!branch) return;
			
			branches.push({
				name: branchName,
				depth,
				isLast: [...isLast],
				isCurrent: branchName === data.currentBranch
			});
			
			// Find children
			const children = Array.from(data.branchMap.values())
				.filter(b => b.parent === branchName)
				.map(b => b.name);
			
			children.forEach((child, index) => {
				const childIsLast = [...isLast, index === children.length - 1];
				addBranch(child, depth + 1, childIsLast);
			});
		};
		
		// Start with trunk
		addBranch(data.trunkName, 0, []);
		return branches;
	};
	
	const branches = buildBranchTree();
	
	// Calculate visible branches based on scroll position and height
	const visibleLines = height ? height - 4 : branches.length; // Account for borders and title
	
	// Bound scroll position to available content
	const maxScrollPosition = Math.max(0, branches.length - visibleLines);
	const boundedScrollPosition = Math.min(scrollPosition, maxScrollPosition);
	
	const visibleBranches = branches.slice(boundedScrollPosition, boundedScrollPosition + visibleLines);
	
	const renderBranchLine = (branch: { name: string; depth: number; isLast: Array<boolean>; isCurrent: boolean }) => {
		let prefix = "";
		
		// Build the tree prefix
		for (let i = 0; i < branch.depth; i++) {
			if (i === branch.depth - 1) {
				// Last level - show connection
				if (branch.isLast[i]) {
					prefix += "└─";
				} else {
					prefix += "├─";
				}
			} else {
				// Middle levels - show vertical lines or spaces
				if (branch.isLast[i]) {
					prefix += "  ";
				} else {
					prefix += "│ ";
				}
			}
		}
		
		// Add the branch indicator
		const indicator = branch.isCurrent ? "◉" : "◯";
		const fullLine = `${prefix}${indicator} ${branch.name}`;
		
		const isSelectedBranch = isSelected && branch.name === cursorBranch;
		
		return (
			<Text 
				key={branch.name}
				color={isSelectedBranch ? "black" : "white"}
				{...(isSelectedBranch && { backgroundColor: "cyan" })}
				bold={isSelectedBranch}
			>
				{fullLine}
			</Text>
		);
	};
	
	return (
		<Box 
			flexGrow={1} 
			borderStyle="round" 
			borderColor={isSelected ? "cyan" : "gray"}
			marginRight={1}
			marginBottom={1}
			paddingX={1}
			height={height}
		>
			<Box flexDirection="column">
				<Text color={isSelected ? "cyan" : "white"} bold={isSelected}>
					[1] Stack {isSelected && "← selected"}
				</Text>
				<Box marginTop={1} flexDirection="column">
					{visibleBranches.map((branch) => renderBranchLine(branch))}
				</Box>
			</Box>
		</Box>
	);
}

export function Commits({ cursorCommit, data, height, isSelected, scrollPosition = 0 }: CommitsProps) {
	const currentBranchInfo = data.branchMap.get(data.currentBranch);
	
	// Generate some colors for commit hashes (similar to lazygit)
	const hashColors = ["yellow", "green", "blue", "magenta", "cyan", "red"];
	
	// Calculate visible commits based on scroll position and height
	const commits = currentBranchInfo?.commits || [];
	const visibleLines = height ? height - 4 : commits.length; // Account for borders and title
	
	// Bound scroll position to available content
	const maxScrollPosition = Math.max(0, commits.length - visibleLines);
	const boundedScrollPosition = Math.min(scrollPosition, maxScrollPosition);
	
	const visibleCommits = commits.slice(boundedScrollPosition, boundedScrollPosition + visibleLines);
	
	return (
		<Box 
			flexGrow={1} 
			borderStyle="round" 
			borderColor={isSelected ? "cyan" : "gray"}
			marginRight={1}
			paddingX={1}
			height={height}
		>
			<Box flexDirection="column">
				<Text color={isSelected ? "cyan" : "white"} bold={isSelected}>
					[2] Commits {isSelected && "← selected"}
				</Text>
				<Box marginTop={1}>
					{visibleCommits.length > 0 ? (
						<Box flexDirection="column">
							{visibleCommits.map((commit) => {
								const isSelectedCommit = isSelected && commit.hash === cursorCommit;
								
								return (
									<Text 
										key={commit.hash}
										color={isSelectedCommit ? "black" : "white"}
										{...(isSelectedCommit && { backgroundColor: "cyan" })}
										bold={isSelectedCommit}
									>
										{commit.hash.substring(0, 7)} {commit.message}
									</Text>
								);
							})}
						</Box>
					) : (
						<Text color="gray">No commits found for current branch</Text>
					)}
				</Box>
			</Box>
		</Box>
	);
}

export function Viewer({ cursorBranch, cursorCommit, data, height, isSelected, scrollPosition = 0, showAsciiArt }: ViewerProps) {
	const currentBranchInfo = data.branchMap.get(data.currentBranch);
	const selectedCommit = currentBranchInfo?.commits.find(commit => commit.hash === cursorCommit);
	const selectedBranchInfo = cursorBranch ? data.branchMap.get(cursorBranch) : undefined;

	// Helper function to render gt log -s style output showing all commits from branch to trunk
	const renderBranchLogS = (branchInfo: typeof selectedBranchInfo) => {
		if (!branchInfo) return null;
		
		// Build the chain from selected branch to trunk
		const branchChain: Array<typeof branchInfo> = [];
		let currentBranch = branchInfo;
		
		// Walk up the parent chain to the trunk
		while (currentBranch) {
			branchChain.push(currentBranch);
			
			// Stop if we've reached the trunk
			if (currentBranch.name === data.trunkName || !currentBranch.parent) {
				break;
			}
			
			// Get the parent branch
			const parentBranch = data.branchMap.get(currentBranch.parent);
			if (!parentBranch) {
				break; // Stop if parent branch not found
			}
			currentBranch = parentBranch;
		}
		
		// Render each branch in the chain
		return (
			<Box flexDirection="column">
				{branchChain.map((branch, chainIndex) => {
					const isCurrent = branch.name === data.currentBranch;
					const indicator = isCurrent ? "◉" : "◯";
					const statusText = isCurrent ? " (current)" : "";
					
					// Determine branch status
					let branchStatus = "";
					if (branch.prStatus === "CLOSED" || branch.prStatus === "MERGED") {
						branchStatus = "";
					} else if (branch.currentVersion < branch.remoteVersion) {
						branchStatus = " (needs restack)";
					}
					
					return (
						<Box key={`chain-${chainIndex}-${branch.name}`} flexDirection="column">
							{/* Branch header */}
							<Text color={isCurrent ? "cyan" : "white"} bold>
								{indicator} {branch.name}{statusText}{branchStatus}
							</Text>
							<Text color="gray">│ 2 days ago</Text>
							<Text color="gray">│</Text>
							
							{/* PR Information */}
							{branch.prNumber > 0 && (
								<>
									<Text color="gray">
										│ PR #{branch.prNumber} ({branch.prStatus}) {branch.commits[0]?.message || "No description"}
									</Text>
									<Text color="gray">
										│ https://app.graphite.dev/github/pr/repo/{branch.prNumber}
									</Text>
									{branch.currentVersion > 0 && (
										<Text color="gray">
											│ Last submitted version: v{branch.currentVersion} (remote at v{branch.remoteVersion}, {branch.currentVersion < branch.remoteVersion ? "need get" : "up to date"})
										</Text>
									)}
									<Text color="gray">│</Text>
								</>
							)}
							
							{/* Commits */}
							{branch.commits.map((commit, index: number) => (
								<Text key={`${chainIndex}-${index}-${commit.hash}`} color="gray">
									│ {commit.hash.substring(0, 11)} - {commit.message}
								</Text>
							))}
							
							{/* Empty line separator */}
							<Text color="gray">│</Text>
						</Box>
					);
				})}
			</Box>
		);
	};
	
	// Helper to get all content lines for scrolling  
	const getContentLines = (): Array<{text: string; color: string; bold?: boolean}> => {
		if (showAsciiArt) {
			return [
				{ text: " ██████╗ ████████╗██╗   ██╗██╗", color: "cyan", bold: true },
				{ text: "██╔════╝ ╚══██╔══╝██║   ██║██║", color: "cyan", bold: true },
				{ text: "██║  ███╗   ██║   ██║   ██║██║", color: "cyan", bold: true },
				{ text: "██║   ██║   ██║   ██║   ██║██║", color: "cyan", bold: true },
				{ text: "╚██████╔╝   ██║   ╚██████╔╝██║", color: "cyan", bold: true },
				{ text: " ╚═════╝    ╚═╝    ╚═════╝ ╚═╝", color: "cyan", bold: true },
				{ text: "", color: "gray" },
				{ text: "Graphite Terminal User Interface", color: "gray" }
			];
		}
		if (selectedBranchInfo) {
			// Flatten the branch log into individual lines for scrolling
			const lines: Array<{text: string; color: string; bold?: boolean}> = [];
			
			// Build the chain from selected branch to trunk
			const branchChain: Array<typeof selectedBranchInfo> = [];
			let currentBranch = selectedBranchInfo;
			
			while (currentBranch) {
				branchChain.push(currentBranch);
				if (currentBranch.name === data.trunkName || !currentBranch.parent) break;
				const parentBranch = data.branchMap.get(currentBranch.parent);
				if (!parentBranch) break;
				currentBranch = parentBranch;
			}
			
			// Convert each branch to lines
			for (const branch of branchChain) {
				const isCurrent = branch.name === data.currentBranch;
				const indicator = isCurrent ? "◉" : "◯";
				const statusText = isCurrent ? " (current)" : "";
				let branchStatus = "";
				if (branch.prStatus !== "CLOSED" && branch.prStatus !== "MERGED" && branch.currentVersion < branch.remoteVersion) {
					branchStatus = " (needs restack)";
				}
				
				lines.push({ text: `${indicator} ${branch.name}${statusText}${branchStatus}`, color: isCurrent ? "cyan" : "white", bold: true });
				lines.push({ text: "│ 2 days ago", color: "gray" });
				lines.push({ text: "│", color: "gray" });
				
				if (branch.prNumber > 0) {
					lines.push({ text: `│ PR #${branch.prNumber} (${branch.prStatus}) ${branch.commits[0]?.message || "No description"}`, color: "gray" });
					lines.push({ text: `│ https://app.graphite.dev/github/pr/repo/${branch.prNumber}`, color: "gray" });
					if (branch.currentVersion > 0) {
						lines.push({ text: `│ Last submitted version: v${branch.currentVersion} (remote at v${branch.remoteVersion}, ${branch.currentVersion < branch.remoteVersion ? "need get" : "up to date"})`, color: "gray" });
					}
					lines.push({ text: "│", color: "gray" });
				}
				
				for (const commit of branch.commits) {
					lines.push({ text: `│ ${commit.hash.substring(0, 11)} - ${commit.message}`, color: "gray" });
				}
				
				lines.push({ text: "│", color: "gray" });
			}
			
			return lines;
		}
		if (selectedCommit) {
			return selectedCommit.patch.split('\n').map(line => ({ text: line, color: "gray" }));
		}
		return [{ text: "Navigate the stack (pane 1) to view branch details in gt log -s format", color: "gray" }];
	};

	const contentLines = getContentLines();
	const visibleLines = height ? height - 4 : contentLines.length; // Account for borders and title
	
	// Bound scroll position to available content
	const maxScrollPosition = Math.max(0, contentLines.length - visibleLines);
	const boundedScrollPosition = Math.min(scrollPosition, maxScrollPosition);
	
	const visibleContent = contentLines.slice(boundedScrollPosition, boundedScrollPosition + visibleLines);

	return (
		<Box 
			flexGrow={1} 
			borderStyle="round" 
			borderColor={isSelected ? "cyan" : "gray"}
			marginBottom={1}
			paddingX={1}
			height={height}
		>
			<Box flexDirection="column">
				<Text color={isSelected ? "cyan" : "white"} bold={isSelected}>
					[3] Viewer {isSelected && "← selected"}
				</Text>
				<Box marginTop={1} flexDirection="column">
					{visibleContent.map((line, index: number) => (
						<Text 
							key={`viewer-${index}-${line.text.slice(0, 20)}`} 
							color={line.color} 
							bold={line.bold || false}
						>
							{line.text}
						</Text>
					))}
				</Box>
			</Box>
		</Box>
	);
}

export function CommandLog({ height, isSelected, scrollPosition = 0 }: { isSelected: boolean; height?: number; scrollPosition?: number }) {
	// Mock command log data
	const logEntries = [
		{ command: "$ gt status", output: "✓ On branch: main", color: "green" },
		{ command: "$ gt log --oneline", output: "abc1234 feat: add login validation", color: "white" },
		{ command: "$ gt checkout feature/auth-login", output: "✓ Switched to branch 'feature/auth-login'", color: "green" },
		{ command: "$ gt sync", output: "✓ Synced with remote", color: "green" },
		{ command: "$ gt submit", output: "✓ Submitted PR #123", color: "green" },
		{ command: "$ gt stack", output: "◉ feature/auth-login (current)", color: "cyan" },
	];

	// Flatten entries for scrolling
	const allLines: Array<{ text: string; color: string }> = [];
	for (const entry of logEntries) {
		allLines.push({ text: entry.command, color: "gray" });
		allLines.push({ text: entry.output, color: entry.color });
	}

	const visibleLines = height ? height - 4 : allLines.length; // Account for borders and title
	
	// Bound scroll position to available content
	const maxScrollPosition = Math.max(0, allLines.length - visibleLines);
	const boundedScrollPosition = Math.min(scrollPosition, maxScrollPosition);
	
	const visibleEntries = allLines.slice(boundedScrollPosition, boundedScrollPosition + visibleLines);

	return (
		<Box 
			flexGrow={1} 
			borderStyle="round" 
			borderColor={isSelected ? "cyan" : "gray"}
			paddingX={1}
			height={height}
		>
			<Box flexDirection="column">
				<Text color={isSelected ? "cyan" : "white"} bold={isSelected}>
					[4] Command Log {isSelected && "← selected"}
				</Text>
				<Box marginTop={1}>
					{visibleEntries.map((entry, index) => (
						<Text key={`log-${index}-${entry.text.slice(0, 10)}`} color={entry.color}>
							{entry.text}
						</Text>
					))}
				</Box>
			</Box>
		</Box>
	);
}
