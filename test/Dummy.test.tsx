import { describe, expect, it } from "@effect/vitest";
import { render } from "ink-testing-library";
import App from "../src/app.js";

describe("Dummy", () => {
	it("should pass", () => {
		const { lastFrame } = render(<App />);

		expect(lastFrame()).not.toBeNull();
	});
});
