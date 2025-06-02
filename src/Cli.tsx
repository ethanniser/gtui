import { Command } from "@effect/cli";
import { render } from "ink";
import App from "./app.js";
import { Effect } from "effect";

const command = Command.make("hello", {}, (props) =>
	Effect.acquireUseRelease(
		Effect.sync(() => render(<App {...props} />)),
		(instance) => Effect.promise(() => instance.waitUntilExit()),
		(instance) => Effect.sync(() => instance.unmount()),
	),
);

export const run = Command.run(command, {
	name: "Hello World",
	version: "0.0.0",
});
