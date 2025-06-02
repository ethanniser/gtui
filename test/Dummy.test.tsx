import { describe, expect, it } from "@effect/vitest";
import { render } from "ink-testing-library";
import App from "@template/cli/app";
import chalk from "chalk";

describe("Dummy", () => {
	it("should pass", () => {
		const { lastFrame } = render(<App />);

		expect(lastFrame()).toEqual(`Hello, ${chalk.green("Stranger")}`);
	});
});
