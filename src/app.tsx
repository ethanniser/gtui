import { Text, Box, useInput, useApp, useStdout } from "ink";
import { useEffect } from "react";
import { Stack, Commits, Viewer, CommandLog } from "./ui.js";
import { ErrorBoundary } from "react-error-boundary";
import { Result, useRx, useRxValue } from "@effect-rx/rx-react";
import { cursorBranchRx, cursorCommitRx, paneRx, scrollPositionRx, useSetScroll } from "./state.js";
import { graphiteDataRx } from "./data.js";
import { Cause } from "effect";


function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
	useInput((input) => {
		if (input === "r") {
			resetErrorBoundary();
		}
	});

	return (
		<Box flexDirection="column" padding={2} height="100%" width="100%">
			<Box borderStyle="round" borderColor="red" padding={1} marginBottom={1}>
				<Text color="red" bold>
					💥 Application Error
				</Text>
			</Box>
			
			<Box flexDirection="column" paddingX={1}>
				<Text color="white" bold>
					Error: {error.name || "Unknown Error"}
				</Text>
				<Text color="gray" wrap="wrap">
					{error.message || "An unexpected error occurred"}
				</Text>
				
				{error.stack && (
					<Box flexDirection="column" marginTop={1}>
						<Text color="yellow" bold>Stack Trace:</Text>
						<Box paddingLeft={2} flexDirection="column">
							{error.stack.split('\n').slice(0, 8).map((line, index) => (
								<Text key={`stack-${index}-${line.slice(0, 20)}`} color="gray" dimColor>
									{line}
								</Text>
							))}
						</Box>
					</Box>
				)}
			</Box>
			
			<Box marginTop={2} paddingX={1} flexDirection="column">
				<Text color="cyan">
					Press 'r' to retry or Ctrl+C to exit
				</Text>
			</Box>
		</Box>
	);
}

function Providers({ children }: { children: React.ReactNode }) {
	return (
		<ErrorBoundary 
			FallbackComponent={ErrorFallback}
			onError={(error, errorInfo) => {
				console.error("Error caught by boundary:", error, errorInfo);
			}}
		>
			{children}
		</ErrorBoundary>
	);
}

export default function App() {
	return (
		<Providers>
			<AppInner />
		</Providers>
	);
}

function AppInner() {
	const { exit } = useApp();
	const { stdout } = useStdout();
	const [pane, setPane] = useRx(paneRx);
	const [cursorBranch, setCursorBranch] = useRx(cursorBranchRx)
	const [cursorCommit, setCursorCommit] = useRx(cursorCommitRx)
	const scrollPositions = useRxValue(scrollPositionRx)
	const setScrollPosition = useSetScroll()

	// Get real graphite data
	const data = useRxValue(graphiteDataRx)

	// Get full terminal dimensions
	const terminalWidth = stdout.columns || 80;
	const terminalHeight = stdout.rows || 24;
	
	// Calculate pane heights (roughly 1/4 each, accounting for header and borders)
	const headerHeight = 3; // Header box with borders
	const availableHeight = terminalHeight - headerHeight - 2; // -2 for margins
	const paneHeight = Math.floor(availableHeight / 2); // Two rows of panes

	// Helper to build branch list for navigation
	const buildBranchList = () => {
		if (!Result.isSuccess(data)) return [];
		const branches: Array<string> = [];
		const addBranch = (branchName: string) => {
			const branch = data.value.branchMap.get(branchName);
			if (!branch) return;
			
			branches.push(branchName);
			
			// Find children
			const children = Array.from(data.value.branchMap.values())
				.filter(b => b.parent === branchName)
				.map(b => b.name);
			
			for (const child of children) {
				addBranch(child);
			}
		};
		
		addBranch(data.value.trunkName);
		return branches;
	};

	const branches = buildBranchList();

	// Initialize cursor to current branch when data loads
	useEffect(() => {
		if (Result.isSuccess(data) && !cursorBranch) {
			setCursorBranch(data.value.currentBranch);
		}
	}, [data, cursorBranch, setCursorBranch]);

	// Move useInput hook to the top to maintain consistent hook call order
	useInput((input, key) => {
		if (input === "q" ) {
			exit();
		}

		// Only handle navigation if data is loaded
		if (!Result.isSuccess(data)) return;

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
				
				// Auto-scroll to keep cursor visible
				if (newIndex < scrollPositions.stack) {
					setScrollPosition("stack", newIndex);
				}
			}
			if (key.downArrow || input === "j") {
				const newIndex = Math.min(branches.length - 1, currentIndex + 1);
				setCursorBranch(branches[newIndex]);
				
				// Auto-scroll to keep cursor visible
				const visibleLines = paneHeight - 4;
				if (newIndex >= scrollPositions.stack + visibleLines) {
					setScrollPosition("stack", Math.max(0, newIndex - visibleLines + 1));
				}
			}
			if (input === " ") {
				// Space to checkout - just log for now
				console.log(`Would checkout branch: ${cursorBranch}`);
			}
		}

		if (pane === "commits") {
			const currentBranchInfo = data.value.branchMap.get(data.value.currentBranch);
			if (currentBranchInfo) {
				const commits = currentBranchInfo.commits;
				const currentIndex = cursorCommit ? commits.findIndex(c => c.hash === cursorCommit) : 0;
				
				if (key.upArrow || input === "k") {
					const newIndex = Math.max(0, currentIndex - 1);
					setCursorCommit(commits[newIndex].hash);
					
					// Auto-scroll to keep cursor visible
					if (newIndex < scrollPositions.commits) {
						setScrollPosition("commits", newIndex);
					}
				}
				if (key.downArrow || input === "j") {
					const newIndex = Math.min(commits.length - 1, currentIndex + 1);
					setCursorCommit(commits[newIndex].hash);
					
					// Auto-scroll to keep cursor visible
					const visibleLines = paneHeight - 4;
					if (newIndex >= scrollPositions.commits + visibleLines) {
						setScrollPosition("commits", Math.max(0, newIndex - visibleLines + 1));
					}
				}
			}
		}

		// Handle scrolling in viewer and log panes (without cursor navigation)
		if (pane === "viewer") {
			if (key.upArrow || input === "k") {
				setScrollPosition("viewer", Math.max(0, scrollPositions.viewer - 1));
			}
			if (key.downArrow || input === "j") {
				// Estimate max content - this will be bounded by the component
				setScrollPosition("viewer", scrollPositions.viewer + 1);
			}
		}

		if (pane === "log") {
			const maxLogLines = 12; // Approximate based on mock data
			if (key.upArrow || input === "k") {
				setScrollPosition("log", Math.max(0, scrollPositions.log - 1));
			}
			if (key.downArrow || input === "j") {
				const maxScroll = Math.max(0, maxLogLines - (paneHeight - 4));
				setScrollPosition("log", Math.min(maxScroll, scrollPositions.log + 1));
			}
		}
	});

	return Result.match(data, {
		onInitial: () => (
			<Box flexDirection="column" alignItems="center" justifyContent="center" height={terminalHeight}>
				<Text color="cyan">Loading graphite data...</Text>
			</Box>
		),
		onFailure: ({ cause }) => (
			<Box flexDirection="column" alignItems="center" justifyContent="center" height={terminalHeight}>
				<Text color="red">Error loading graphite data: {Cause.pretty(cause)}</Text>
				<Text color="gray">Press 'q' to quit</Text>
			</Box>
		),
		onSuccess: ({ value }) => (
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
							data={value} 
							cursorBranch={cursorBranch}
							height={paneHeight}
							scrollPosition={scrollPositions.stack}
						/>

						{/* Commits pane (bottom left) */}
						<Commits 
							isSelected={pane === "commits"} 
							data={value} 
							cursorCommit={cursorCommit}
							height={paneHeight}
							scrollPosition={scrollPositions.commits}
						/>
					</Box>

					{/* Right column */}
					<Box flexDirection="column" width="50%">
						{/* Viewer pane (top right) */}
						<Viewer 
							isSelected={pane === "viewer"} 
							data={value} 
							cursorCommit={cursorCommit}
							cursorBranch={cursorBranch}
							showAsciiArt={pane === "header"}
							height={paneHeight}
							scrollPosition={scrollPositions.viewer}
						/>

						{/* Command log pane (bottom right) */}
						<CommandLog 
							isSelected={pane === "log"}
							height={paneHeight}
							scrollPosition={scrollPositions.log}
						/>
					</Box>
				</Box>
			</Box>
		)
	})
}
