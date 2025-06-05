import { Text, Box } from "ink";
import { useQuery } from "@tanstack/react-query";
import type { FinalRequiredData } from "./data.js";
import { currentBranchOptions, gtLogSOptions, mockFinalRequiredData } from "./data.js";

interface PaneProps {
	isSelected: boolean;
	data: FinalRequiredData;
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

export function Stack({ cursorBranch, data, isSelected }: StackProps) {
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
		>
			<Box flexDirection="column">
				<Text color={isSelected ? "cyan" : "white"} bold={isSelected}>
					[1] Stack {isSelected && "← selected"}
				</Text>
				<Box marginTop={1} flexDirection="column">
					{branches.map((branch) => renderBranchLine(branch))}
				</Box>
			</Box>
		</Box>
	);
}

export function Commits({ cursorCommit, data, isSelected }: CommitsProps) {
	const currentBranchInfo = data.branchMap.get(data.currentBranch);
	
	// Generate some colors for commit hashes (similar to lazygit)
	const hashColors = ["yellow", "green", "blue", "magenta", "cyan", "red"];
	
	return (
		<Box 
			flexGrow={1} 
			borderStyle="round" 
			borderColor={isSelected ? "cyan" : "gray"}
			marginRight={1}
			paddingX={1}
		>
			<Box flexDirection="column">
				<Text color={isSelected ? "cyan" : "white"} bold={isSelected}>
					[2] Commits {isSelected && "← selected"}
				</Text>
				<Box marginTop={1}>
					{currentBranchInfo ? (
						<Box flexDirection="column">
							{currentBranchInfo.commits.map((commit) => {
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

export function Viewer({ cursorBranch, cursorCommit, data, isSelected, showAsciiArt }: ViewerProps) {
	const currentBranchInfo = data.branchMap.get(data.currentBranch);
	const selectedCommit = currentBranchInfo?.commits.find(commit => commit.hash === cursorCommit);
	const selectedBranchInfo = cursorBranch ? data.branchMap.get(cursorBranch) : undefined;
	
	return (
		<Box 
			flexGrow={1} 
			borderStyle="round" 
			borderColor={isSelected ? "cyan" : "gray"}
			marginBottom={1}
			paddingX={1}
		>
			<Box flexDirection="column">
				<Text color={isSelected ? "cyan" : "white"} bold={isSelected}>
					[3] Viewer {isSelected && "← selected"}
				</Text>
				<Box marginTop={1}>
					{showAsciiArt ? (
						<Box flexDirection="column" alignItems="center" justifyContent="center">
							<Text color="cyan" bold>
								 {" "}██████╗ ████████╗██╗   ██╗██╗
							</Text>
							<Text color="cyan" bold>
								██╔════╝ ╚══██╔══╝██║   ██║██║
							</Text>
							<Text color="cyan" bold>
								██║  ███╗   ██║   ██║   ██║██║
							</Text>
							<Text color="cyan" bold>
								██║   ██║   ██║   ██║   ██║██║
							</Text>
							<Text color="cyan" bold>
								╚██████╔╝   ██║   ╚██████╔╝██║
							</Text>
							<Text color="cyan" bold>
								 {" "}╚═════╝    ╚═╝    ╚═════╝ ╚═╝
							</Text>
							<Box marginTop={2}>
								<Text color="gray">Graphite Terminal User Interface</Text>
							</Box>
						</Box>
					) : selectedBranchInfo ? (
						<Box flexDirection="column">
							{selectedBranchInfo.gtLogS.split('\n').map((line, index) => (
								<Text key={`${index}-${line}`} color="gray">{line}</Text>
							))}
						</Box>
					) : selectedCommit ? (
						<Box flexDirection="column">
							{selectedCommit.patch.split('\n').map((line, index) => (
								<Text key={`${index}-${line}`} color="gray">{line}</Text>
							))}
						</Box>
					) : (
						<Text color="gray">Select a branch or commit to view details</Text>
					)}
				</Box>
			</Box>
		</Box>
	);
}

export function CommandLog({ isSelected }: { isSelected: boolean }) {
	return (
		<Box 
			flexGrow={1} 
			borderStyle="round" 
			borderColor={isSelected ? "cyan" : "gray"}
			paddingX={1}
		>
			<Box flexDirection="column">
				<Text color={isSelected ? "cyan" : "white"} bold={isSelected}>
					[4] Command Log {isSelected && "← selected"}
				</Text>
				<Box marginTop={1}>
					<Text color="gray">$ gt status</Text>
					<Text color="green">✓ On branch: {mockFinalRequiredData.currentBranch}</Text>
					<Text color="gray">$ gt log --oneline</Text>
					<Text color="white">abc1234 feat: add login validation</Text>
					<Text color="gray">$ gt checkout feature/auth-login</Text>
					<Text color="green">✓ Switched to branch 'feature/auth-login'</Text>
				</Box>
			</Box>
		</Box>
	);
}
