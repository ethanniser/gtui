import { Text, Box, useInput, useApp, useStdout } from "ink";
import { useAppStore } from "./state.js";

export default function App() {
	const { exit } = useApp();
	const { stdout } = useStdout();
	const pane = useAppStore((state) => state.pane);
	const setPane = useAppStore((state) => state.setPane);
	const commandLog = useAppStore((state) => state.commandLog);

	// Get full terminal dimensions (leave space for potential terminal chrome)
	const terminalWidth = stdout.columns || 80;
	const terminalHeight = (stdout.rows || 24) - 1;

	useInput((input, key) => {
		if (input === "q" || key.escape) {
			exit();
		}

		// Navigate between panes
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
	});

	return (
		<Box flexDirection="column" height={terminalHeight} width={terminalWidth}>
			{/* Header */}
			<Box borderStyle="round" borderColor="blue" paddingX={1}>
				<Text color="blue" bold>
					GTUI - Graphite TUI
				</Text>
				<Box marginLeft={4}>
					<Text color="gray">Press 1/2/3/4 to switch panes, 'q' to quit</Text>
				</Box>
			</Box>

			{/* Main content area */}
			<Box flexDirection="row" flexGrow={1} marginTop={1}>
				{/* Left column */}
				<Box flexDirection="column" width="50%">
					{/* Stack pane (top left) */}
					<Box 
						flexGrow={1} 
						borderStyle="round" 
						borderColor={pane === "stack" ? "cyan" : "gray"}
						marginRight={1}
						marginBottom={1}
						paddingX={1}
					>
						<Box flexDirection="column">
							<Text color={pane === "stack" ? "cyan" : "white"} bold={pane === "stack"}>
								[1] Stack (gt ls) {pane === "stack" && "← selected"}
							</Text>
							<Box marginTop={1}>
								<Text color="gray">Stack content will go here...</Text>
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

					{/* Commits pane (bottom left) */}
					<Box 
						flexGrow={1} 
						borderStyle="round" 
						borderColor={pane === "commits" ? "cyan" : "gray"}
						marginRight={1}
						paddingX={1}
					>
						<Box flexDirection="column">
							<Text color={pane === "commits" ? "cyan" : "white"} bold={pane === "commits"}>
								[2] Commits {pane === "commits" && "← selected"}
							</Text>
							<Box marginTop={1}>
								<Text color="gray">Commits content will go here...</Text>
							</Box>
						</Box>
					</Box>
				</Box>

				{/* Right column */}
				<Box flexDirection="column" width="50%">
					{/* Viewer pane (top right) */}
					<Box 
						flexGrow={2} 
						borderStyle="round" 
						borderColor={pane === "viewer" ? "cyan" : "gray"}
						marginBottom={1}
						paddingX={1}
					>
						<Box flexDirection="column">
							<Text color={pane === "viewer" ? "cyan" : "white"} bold={pane === "viewer"}>
								[3] Viewer {pane === "viewer" && "← selected"}
							</Text>
							<Box marginTop={1}>
								<Text color="gray">stack tab → gt log -s</Text>
								<Text color="gray">commit tab → patch of commit</Text>
								<Text color="gray"> </Text>
								<Text color="gray">Viewer content will go here...</Text>
							</Box>
						</Box>
					</Box>

					{/* Command log pane (bottom right) */}
					<Box 
						flexGrow={1} 
						borderStyle="round" 
						borderColor={pane === "log" ? "cyan" : "gray"}
						paddingX={1}
					>
						<Box flexDirection="column">
							<Text color={pane === "log" ? "cyan" : "white"} bold={pane === "log"}>
								[4] Command Log {pane === "log" && "← selected"}
							</Text>
							<Box marginTop={1}>
								<Text color="gray">Command log will go here...</Text>
							</Box>
						</Box>
					</Box>
				</Box>
			</Box>

			{/* Footer */}
			<Box borderStyle="round" borderColor="gray" paddingX={1} marginTop={1}>
				<Text color="gray">
					Current pane: {pane} • Press 1 (stack), 2 (commits), 3 (viewer), 4 (log) to switch
				</Text>
			</Box>
		</Box>
	);
}
