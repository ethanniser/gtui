import { Text, Box, useInput, useApp, useStdout } from "ink";
import { useAppStore } from "./state.js";
import { Stack, Commits, Viewer, CommandLog } from "./ui.js";
import { mockFinalRequiredData } from "./data.js";

export default function App() {
	const { exit } = useApp();
	const { stdout } = useStdout();
	const pane = useAppStore((state) => state.pane);
	const setPane = useAppStore((state) => state.setPane);
	const commandLog = useAppStore((state) => state.commandLog);
	const cursorBranch = useAppStore((state) => state.cursorBranch);
	const cursorCommit = useAppStore((state) => state.cursorCommit);
	const setCursorBranch = useAppStore((state) => state.setCursorBranch);
	const setCursorCommit = useAppStore((state) => state.setCursorCommit);

	// Get full terminal dimensions
	const terminalWidth = stdout.columns || 80;
	const terminalHeight = stdout.rows || 24;

	// Helper to build branch list for navigation
	const buildBranchList = () => {
		const branches: Array<string> = [];
		const addBranch = (branchName: string) => {
			const branch = mockFinalRequiredData.branchMap.get(branchName);
			if (!branch) return;
			
			branches.push(branchName);
			
			// Find children
			const children = Array.from(mockFinalRequiredData.branchMap.values())
				.filter(b => b.parent === branchName)
				.map(b => b.name);
			
			for (const child of children) {
				addBranch(child);
			}
		};
		
		addBranch(mockFinalRequiredData.trunkName);
		return branches;
	};

	const branches = buildBranchList();

	useInput((input, key) => {
		if (input === "q" ) {
			exit();
		}

		// Navigate between panes
		if (input === "0") {
			setPane("header");
		}
		if (input === "1") {
			setPane("stack");
		}
		if (input === "2") {
			setPane("commits");
		}
		if (input === "3") {
			setPane("viewer");
		}
		if (input === "4") {
			setPane("log");
		}

		// Handle navigation within panes
		if (pane === "stack") {
			const currentIndex = cursorBranch ? branches.indexOf(cursorBranch) : 0;
			
			if (key.upArrow || input === "k") {
				const newIndex = Math.max(0, currentIndex - 1);
				setCursorBranch(branches[newIndex]);
			}
			if (key.downArrow || input === "j") {
				const newIndex = Math.min(branches.length - 1, currentIndex + 1);
				setCursorBranch(branches[newIndex]);
			}
			if (input === " ") {
				// Space to checkout - just log for now
				console.log(`Would checkout branch: ${cursorBranch}`);
			}
		}

		if (pane === "commits") {
			const currentBranchInfo = mockFinalRequiredData.branchMap.get(mockFinalRequiredData.currentBranch);
			if (currentBranchInfo) {
				const commits = currentBranchInfo.commits;
				const currentIndex = cursorCommit ? commits.findIndex(c => c.hash === cursorCommit) : 0;
				
				if (key.upArrow || input === "k") {
					const newIndex = Math.max(0, currentIndex - 1);
					setCursorCommit(commits[newIndex].hash);
				}
				if (key.downArrow || input === "j") {
					const newIndex = Math.min(commits.length - 1, currentIndex + 1);
					setCursorCommit(commits[newIndex].hash);
				}
			}
		}
	});

	return (
		<Box flexDirection="column" height={terminalHeight} width={terminalWidth}>
			{/* Header */}
			<Box 
				borderStyle="round" 
				borderColor={pane === "header" ? "cyan" : "blue"} 
				paddingX={1}
			>
				<Text color={pane === "header" ? "cyan" : "blue"} bold={pane === "header"}>
					[0] GTUI - Graphite TUI {pane === "header" && "← selected"}
				</Text>
				<Box marginLeft={4}>
					<Text color="gray">Press 0/1/2/3/4 to switch panes, 'q' to quit</Text>
				</Box>
			</Box>

			{/* Main content area */}
			<Box flexDirection="row" flexGrow={1} marginTop={1}>
				{/* Left column */}
				<Box flexDirection="column" width="50%">
					{/* Stack pane (top left) */}
					<Stack 
						isSelected={pane === "stack"} 
						data={mockFinalRequiredData} 
						cursorBranch={cursorBranch}
					/>

					{/* Commits pane (bottom left) */}
					<Commits 
						isSelected={pane === "commits"} 
						data={mockFinalRequiredData} 
						cursorCommit={cursorCommit}
					/>
				</Box>

				{/* Right column */}
				<Box flexDirection="column" width="50%">
					{/* Viewer pane (top right) */}
					<Viewer 
						isSelected={pane === "viewer"} 
						data={mockFinalRequiredData} 
						cursorCommit={cursorCommit}
						cursorBranch={cursorBranch}
						showAsciiArt={pane === "header"}
					/>

					{/* Command log pane (bottom right) */}
					<CommandLog isSelected={pane === "log"} />
				</Box>
			</Box>
		</Box>
	);
}
