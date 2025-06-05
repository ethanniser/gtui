import { Text, Box } from "ink";
import { useQuery } from "@tanstack/react-query";
import type { FinalRequiredData } from "./data.js";
import { currentBranchOptions, gtLogSOptions, mockFinalRequiredData } from "./data.js";

interface PaneProps {
	isSelected: boolean;
	data: FinalRequiredData;
}

interface CommitsProps extends PaneProps {
	selectedCommitIndex: number;
}

export function Stack({ data, isSelected }: PaneProps) {
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
					[1] Stack (gt ls) {isSelected && "← selected"}
				</Text>
				<Box marginTop={1}>
					<Text color="gray">Trunk: {data.trunkName}</Text>
					<Text color="gray">Current: {data.currentBranch}</Text>
					<Text color="gray">Total branches: {data.branchMap.size}</Text>
					<Text color="gray"> </Text>
					<Text color="gray">Keybinds:</Text>
					<Text color="gray">arrow keys → navigate</Text>
					<Text color="gray">space → checkout</Text>
					<Text color="gray">b → bottom</Text>
					<Text color="gray">t → top</Text>
					<Text color="gray">d → delete</Text>
					<Text color="gray">r → rename</Text>
					<Text color="gray">squash?</Text>
					<Text color="gray">split?</Text>
				</Box>
			</Box>
		</Box>
	);
}

export function Commits({ data, isSelected, selectedCommitIndex }: CommitsProps) {
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
						<>
							<Text color="gray">Branch: {currentBranchInfo.name}</Text>
							<Text color="gray">Commits: {currentBranchInfo.commits.length}</Text>
							<Text color="gray"> </Text>
							<Box flexDirection="column">
								{currentBranchInfo.commits.map((commit, index) => {
									const isSelectedCommit = isSelected && index === selectedCommitIndex;
									
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
							{isSelected && (
								<>
									<Text color="gray"> </Text>
									<Text color="gray">Use ↑/↓ or j/k to navigate</Text>
								</>
							)}
						</>
					) : (
						<Text color="gray">No commits found for current branch</Text>
					)}
				</Box>
			</Box>
		</Box>
	);
}

export function Viewer({ data, isSelected }: PaneProps) {
	const currentBranchInfo = data.branchMap.get(data.currentBranch);
	
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
					<Text color="gray">stack tab → gt log -s</Text>
					<Text color="gray">commit tab → patch of commit</Text>
					<Text color="gray"> </Text>
					{currentBranchInfo && currentBranchInfo.commits.length > 0 ? (
						<>
							<Text color="yellow">Latest commit:</Text>
							<Text color="white">{currentBranchInfo.commits[0].message}</Text>
							<Text color="gray"> </Text>
							<Text color="cyan">Patch preview:</Text>
							<Text color="gray">{currentBranchInfo.commits[0].patch.split('\n').slice(0, 5).join('\n')}...</Text>
						</>
					) : (
						<Text color="gray">Select a commit to view patch</Text>
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
