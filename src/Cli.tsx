import { Command } from "@effect/cli";
import { render } from "ink";
import App from "./app.js";
import { Effect } from "effect";


const command = Command.make("gtui", {}, (props) =>
	Effect.acquireUseRelease(
		Effect.sync(() => {
			// Enable alternative screen buffer and hide cursor for full-screen TUI
			process.stdout.write('\x1b[?1049h'); // Enable alternative screen
			process.stdout.write('\x1b[?25l');   // Hide cursor
			
			return render(<App {...props} />, {
				// exitOnCtrlC: false // Let our app handle exit
			});
		}),
		(instance) => Effect.promise(() => instance.waitUntilExit()),
		(instance) => Effect.sync(() => {
			// Restore normal screen buffer and show cursor
			process.stdout.write('\x1b[?25h');   // Show cursor
			process.stdout.write('\x1b[?1049l'); // Disable alternative screen
			
			instance.unmount();
		}),
	),
);

export const run = Command.run(command, {
	name: "GTUI - Graphite TUI",
	version: "0.0.1",
});
