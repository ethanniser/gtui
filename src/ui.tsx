import { useQuery } from "@tanstack/react-query";
import { currentBranchOptions, gtLogSOptions } from "./data.js";

export function App() {
	const currentBranch = useQuery(currentBranchOptions);
}
export function Stack() {}
export function Commits() {}
export function Viewer({ currentBranch }: { currentBranch: string }) {
	const gtLogSResult = useQuery(gtLogSOptions(currentBranch));
}
export function CommandLog() {}
