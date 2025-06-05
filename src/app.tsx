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
	const selectedCommitIndex = useAppStore((state) => state.selectedCommitIndex);
	const setSelectedCommitIndex = useAppStore((state) => state.setSelectedCommitIndex);

	// Get full terminal dimensions
	const terminalWidth = stdout.columns || 80;
	const terminalHeight = stdout.rows || 24;

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
		if (pane === "commits") {
			const currentBranchInfo = mockFinalRequiredData.branchMap.get(mockFinalRequiredData.currentBranch);
			const maxCommits = currentBranchInfo?.commits.length || 0;
			
			if (key.upArrow || input === "k") {
				setSelectedCommitIndex(Math.max(0, selectedCommitIndex - 1));
			}
			if (key.downArrow || input === "j") {
				setSelectedCommitIndex(Math.min(maxCommits - 1, selectedCommitIndex + 1));
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
					<Stack isSelected={pane === "stack"} data={mockFinalRequiredData} />

					{/* Commits pane (bottom left) */}
					<Commits 
						isSelected={pane === "commits"} 
						data={mockFinalRequiredData} 
						selectedCommitIndex={selectedCommitIndex}
					/>
				</Box>

				{/* Right column */}
				<Box flexDirection="column" width="50%">
					{/* Viewer pane (top right) */}
					<Viewer 
						isSelected={pane === "viewer"} 
						data={mockFinalRequiredData} 
						selectedCommitIndex={selectedCommitIndex}
						showAsciiArt={pane === "header"}
					/>

					{/* Command log pane (bottom right) */}
					<CommandLog isSelected={pane === "log"} />
				</Box>
			</Box>
		</Box>
	);
}
