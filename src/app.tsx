import { Text, Box, useInput, useApp, useStdout } from "ink";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface Branch {
	name: string;
	current: boolean;
	timeAgo?: string;
	commit?: string;
	message?: string;
	parent?: string;
}

export default function App() {
	const { exit } = useApp();
	const { stdout } = useStdout();
	const [branches, setBranches] = useState<Array<Branch>>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [viewMode, setViewMode] = useState<'default' | 'stack' | 'all'>('default');

	// Get terminal size
	const terminalWidth = stdout.columns || 80;
	const terminalHeight = stdout.rows || 24;

	useInput((input, key) => {
		if (input === "q" || key.escape) {
			exit();
		}

		if (key.upArrow || input === "k") {
			setSelectedIndex(Math.max(0, selectedIndex - 1));
		}

		if (key.downArrow || input === "j") {
			setSelectedIndex(Math.min(branches.length - 1, selectedIndex + 1));
		}

		if (key.return || input === " ") {
			// Checkout selected branch
			if (branches[selectedIndex]) {
				checkoutBranch(branches[selectedIndex].name);
			}
		}

		if (input === "r") {
			// Refresh
			loadBranches();
		}

		if (input === "s") {
			// Show current stack only
			loadCurrentStack();
		}

		if (input === "a") {
			// Show all branches
			loadAllBranches();
		}
	});

	const loadBranches = async () => {
		setLoading(true);
		setError(null);
		try {
			// Use gt log short for cleaner, more reliable parsing
			const { stdout } = await execAsync("gt log short");
			const parsedBranches = parseGtLogShortOutput(stdout);
			setBranches(parsedBranches);
			setViewMode('default');
			
			// Set selected index to current branch
			const currentIndex = parsedBranches.findIndex(b => b.current);
			if (currentIndex !== -1) {
				setSelectedIndex(currentIndex);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load branches");
		} finally {
			setLoading(false);
		}
	};

	const checkoutBranch = async (branchName: string) => {
		try {
			await execAsync(`gt checkout ${branchName}`);
			loadBranches(); // Refresh after checkout
		} catch (err) {
			setError(`Failed to checkout ${branchName}: ${err instanceof Error ? err.message : 'Unknown error'}`);
		}
	};

	const loadCurrentStack = async () => {
		setLoading(true);
		setError(null);
		try {
			// Use --stack flag to show only current stack
			const { stdout } = await execAsync("gt log short --stack");
			const parsedBranches = parseGtLogShortOutput(stdout);
			setBranches(parsedBranches);
			setViewMode('stack');
			
			// Set selected index to current branch
			const currentIndex = parsedBranches.findIndex(b => b.current);
			if (currentIndex !== -1) {
				setSelectedIndex(currentIndex);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load current stack");
		} finally {
			setLoading(false);
		}
	};

	const loadAllBranches = async () => {
		setLoading(true);
		setError(null);
		try {
			// Use --all flag to show branches across all trunks
			const { stdout } = await execAsync("gt log short --all");
			const parsedBranches = parseGtLogShortOutput(stdout);
			setBranches(parsedBranches);
			setViewMode('all');
			
			// Set selected index to current branch
			const currentIndex = parsedBranches.findIndex(b => b.current);
			if (currentIndex !== -1) {
				setSelectedIndex(currentIndex);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load all branches");
		} finally {
			setLoading(false);
		}
	};

	const parseGtLogShortOutput = (output: string): Array<Branch> => {
		const lines = output.split('\n').filter(line => line.trim());
		const branches: Array<Branch> = [];
		
		for (const line of lines) {
			// gt log short format: "◉  branch-name" or "◯  branch-name"
			const match = line.match(/^([◉◯])\s+(.+)$/);
			if (match) {
				const [, symbol, branchName] = match;
				const isCurrent = symbol === '◉';
				
				branches.push({
					name: branchName.trim(),
					current: isCurrent,
					// We'll fetch additional details on demand if needed
				});
			}
		}
		
		return branches;
	};

	useEffect(() => {
		loadBranches();
	}, []);

	if (loading) {
		return (
			<Box flexDirection="column" height={terminalHeight} width={terminalWidth}>
				<Box justifyContent="center" alignItems="center" height={terminalHeight}>
					<Text color="cyan">Loading Graphite stacks...</Text>
				</Box>
			</Box>
		);
	}

	if (error) {
		return (
			<Box flexDirection="column" height={terminalHeight} width={terminalWidth}>
				<Box borderStyle="round" borderColor="red" padding={1}>
					<Text color="red">Error: {error}</Text>
				</Box>
				<Box marginTop={1}>
					<Text color="gray">Press 'r' to retry, 'q' to quit</Text>
				</Box>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" height={terminalHeight} width={terminalWidth}>
			{/* Header */}
			<Box borderStyle="round" borderColor="blue" paddingX={1}>
				<Text color="blue" bold>
					GTUI - Graphite TUI
				</Text>
				<Box marginLeft={4}>
					<Text color="gray">Use ↑/↓ to navigate, Enter to checkout, 'r' to refresh, 's' to show current stack, 'a' to show all branches, 'q' to quit</Text>
				</Box>
			</Box>

			{/* Branch list */}
			<Box flexDirection="column" flexGrow={1} marginTop={1}>
				{branches.length === 0 ? (
					<Box justifyContent="center" alignItems="center" flexGrow={1}>
						<Text color="yellow">No branches found. Make sure you're in a Graphite repository.</Text>
					</Box>
				) : (
					branches.map((branch, index) => (
						<Box
							key={branch.name}
							flexDirection="row"
							paddingX={1}
						>
							<Box width={4}>
								<Text 
									color={branch.current ? "green" : (index === selectedIndex ? "cyan" : "gray")} 
									bold={branch.current || index === selectedIndex}
								>
									{branch.current ? "◉" : "◯"}
								</Text>
							</Box>
							<Box flexGrow={1}>
								<Text 
									color={branch.current ? "green" : (index === selectedIndex ? "cyan" : "white")} 
									bold={branch.current || index === selectedIndex}
									inverse={index === selectedIndex}
								>
									{branch.name}
									{branch.current ? " (current)" : ""}
								</Text>
							</Box>
							{index === selectedIndex && (
								<Box marginLeft={2}>
									<Text color="gray" dimColor>← selected</Text>
								</Box>
							)}
						</Box>
					))
				)}
			</Box>

			{/* Footer */}
			<Box borderStyle="round" borderColor="gray" paddingX={1} marginTop={1}>
				<Text color="gray">
					{branches.length} branches • Selected: {branches[selectedIndex]?.name || 'none'} • View: {viewMode}
				</Text>
			</Box>
		</Box>
	);
}
