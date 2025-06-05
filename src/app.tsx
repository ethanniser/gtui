import { Text, Box, useInput, useApp, useStdout } from "ink";
import { useAppStore } from "./state.js";
import { Stack, Commits, Viewer, CommandLog } from "./ui.js";
import { useGraphiteData } from "./data.js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";

const queryClient = new QueryClient();

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
	useInput((input, key) => {
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
		<QueryClientProvider client={queryClient}>
			<ErrorBoundary 
				FallbackComponent={ErrorFallback}
				onError={(error, errorInfo) => {
					console.error("Error caught by boundary:", error, errorInfo);
				}}
			>
				{children}
			</ErrorBoundary>
		</QueryClientProvider>
	);
}

export default function App() {
	return (
		<Providers>
			<AppInner />
		</Providers>
	);
}

export function AppInner() {
	const { exit } = useApp();
	const { stdout } = useStdout();
	const pane = useAppStore((state) => state.pane);
	const setPane = useAppStore((state) => state.setPane);
	const commandLog = useAppStore((state) => state.commandLog);
	const cursorBranch = useAppStore((state) => state.cursorBranch);
	const cursorCommit = useAppStore((state) => state.cursorCommit);
	const setCursorBranch = useAppStore((state) => state.setCursorBranch);
	const setCursorCommit = useAppStore((state) => state.setCursorCommit);

	// Get real graphite data
	const { data, error, isLoading } = useGraphiteData();

	// Get full terminal dimensions
	const terminalWidth = stdout.columns || 80;
	const terminalHeight = stdout.rows || 24;

	// Handle loading and error states
	if (isLoading) {
		return (
			<Box flexDirection="column" alignItems="center" justifyContent="center" height={terminalHeight}>
				<Text color="cyan">Loading graphite data...</Text>
			</Box>
		);
	}

	if (error || !data) {
		return (
			<Box flexDirection="column" alignItems="center" justifyContent="center" height={terminalHeight}>
				<Text color="red">Error loading graphite data: {error?.message || "Unknown error"}</Text>
				<Text color="gray">Press 'q' to quit</Text>
			</Box>
		);
	}

	// Helper to build branch list for navigation
	const buildBranchList = () => {
		const branches: Array<string> = [];
		const addBranch = (branchName: string) => {
			const branch = data.branchMap.get(branchName);
			if (!branch) return;
			
			branches.push(branchName);
			
			// Find children
			const children = Array.from(data.branchMap.values())
				.filter(b => b.parent === branchName)
				.map(b => b.name);
			
			for (const child of children) {
				addBranch(child);
			}
		};
		
		addBranch(data.trunkName);
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
			const currentBranchInfo = data.branchMap.get(data.currentBranch);
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
						data={data} 
						cursorBranch={cursorBranch}
					/>

					{/* Commits pane (bottom left) */}
					<Commits 
						isSelected={pane === "commits"} 
						data={data} 
						cursorCommit={cursorCommit}
					/>
				</Box>

				{/* Right column */}
				<Box flexDirection="column" width="50%">
					{/* Viewer pane (top right) */}
					<Viewer 
						isSelected={pane === "viewer"} 
						data={data} 
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
