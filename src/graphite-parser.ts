import { Effect, Schema } from "effect";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import type { 
  BranchName, 
  BranchInfo, 
  TreeNode, 
  Tree, 
  FinalRequiredData 
} from "./data.js";

const GraphiteRepoConfigSchema = Schema.Struct({
  trunk: Schema.String,
  trunks: Schema.Array(Schema.Struct({ name: Schema.String })),
  lastFetchedPRInfoMs: Schema.Number,
  lastFetchedFeatureFlagsInMs: Schema.Number,
});

const GraphiteSubmittedVersionSchema = Schema.Struct({
  headSha: Schema.String,
  baseSha: Schema.String,
  baseName: Schema.String,
});

const GraphiteBranchDataSchema = Schema.Struct({
  children: Schema.Array(Schema.String),
  branchRevision: Schema.String,
  validationResult: Schema.Literal("VALID", "TRUNK", "BAD_PARENT_NAME"),
  parentBranchName: Schema.optional(Schema.String),
  parentBranchRevision: Schema.optional(Schema.String),
  lastSubmittedVersion: Schema.optional(GraphiteSubmittedVersionSchema),
});

const GraphiteSnapshotSchema = Schema.Struct({
  branchesHash: Schema.String,
  branches: Schema.Array(Schema.Tuple(Schema.String, GraphiteBranchDataSchema)),
  currentBranchName: Schema.String,
});

const GraphitePRVersionSchema = Schema.Struct({
  headSha: Schema.String,
  baseSha: Schema.String,
  baseName: Schema.String,
  createdAt: Schema.String,
  authorGithubHandle: Schema.optional(Schema.String),
  isGraphiteGenerated: Schema.Boolean,
});

const GraphitePRSchema = Schema.Struct({
  prNumber: Schema.Number,
  title: Schema.String,
  state: Schema.Literal("OPEN", "CLOSED", "MERGED"),
  reviewDecision: Schema.Literal("APPROVED", "REVIEW_REQUIRED", "CHANGES_REQUESTED"),
  headRefName: Schema.String,
  baseRefName: Schema.String,
  isDraft: Schema.Boolean,
  dependentPrNumber: Schema.optional(Schema.Number),
  versions: Schema.Array(GraphitePRVersionSchema),
});

const GraphitePRInfoSchema = Schema.Struct({
  prInfos: Schema.Array(GraphitePRSchema),
});

type GraphiteRepoConfig = Schema.Schema.Type<typeof GraphiteRepoConfigSchema>;
type GraphiteSnapshot = Schema.Schema.Type<typeof GraphiteSnapshotSchema>;
type GraphiteBranchData = Schema.Schema.Type<typeof GraphiteBranchDataSchema>;
type GraphitePRInfo = Schema.Schema.Type<typeof GraphitePRInfoSchema>;


const readJsonFileWithSchema = <A, I, R>(
  filepath: string, 
  schema: Schema.Schema<A, I, R>
) => 
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const content = yield* fs.readFileString(filepath);
    const jsonData = yield* Effect.try({
      try: () => JSON.parse(content),
      catch: (error) => new Error(`Failed to parse JSON from ${filepath}: ${error}`)
    });
    return yield* Schema.decodeUnknown(schema)(jsonData);
  });

const readRepoConfig = (graphiteDir: string) =>
  readJsonFileWithSchema(
    `${graphiteDir}/.graphite_repo_config`,
    GraphiteRepoConfigSchema
  );

const readLatestSnapshot = (graphiteDir: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const snapshotsDir = `${graphiteDir}/.gt/snapshots`;
    
    const files = yield* fs.readDirectory(snapshotsDir);
    
    const snapshotFiles = files
      .filter((f) => f.endsWith(".snapshot"))
      .sort()
      .reverse();
    
    if (snapshotFiles.length === 0) {
      return yield* Effect.fail(new Error("No snapshot files found"));
    }
    
    const latestSnapshot = snapshotFiles[0];
    return yield* readJsonFileWithSchema(
      `${snapshotsDir}/${latestSnapshot}`,
      GraphiteSnapshotSchema
    );
  });

const readPRInfo = (graphiteDir: string) =>
  readJsonFileWithSchema(
    `${graphiteDir}/.graphite_pr_info`,
    GraphitePRInfoSchema
  );

const createCommitInfo = (hash: string, branchName: string) => ({
  hash: hash === "unknown" ? "unknown" : hash.length >= 8 ? hash.slice(0, 8) : hash,
  message: hash === "unknown" ? `Branch ${branchName}` : `Commit on ${branchName}`,
  patch: ""
});

const buildBranchMap = (
  snapshot: GraphiteSnapshot,
  prInfo: GraphitePRInfo
) => Effect.gen(function* () {
  const branchMap = new Map<BranchName, BranchInfo>();
  
  const prLookup = new Map<string, typeof prInfo.prInfos[0]>();
  for (const pr of prInfo.prInfos) {
    prLookup.set(pr.headRefName, pr);
  }
  
  const allBranchNames = new Set(snapshot.branches.map(([name]) => name));
  
  for (const [branchName, branchData] of snapshot.branches) {
    const pr = prLookup.get(branchName);
    
    const isBranchReference = allBranchNames.has(branchData.branchRevision) || 
                             branchData.branchRevision === branchData.parentBranchName;
    
    const commitHashes = branchData.lastSubmittedVersion 
      ? [branchData.lastSubmittedVersion.headSha]
      : [isBranchReference ? "HEAD" : branchData.branchRevision];
    
    const commits = [];
    for (const hash of commitHashes) {
      if (!allBranchNames.has(hash) && hash !== "HEAD" && hash !== branchData.parentBranchName) {
        commits.push(createCommitInfo(hash, branchName));
      }
    }
    
    if (commits.length === 0) {
      commits.push(createCommitInfo("unknown", branchName));
    }
    
    const branchInfo: BranchInfo = {
      name: branchName,
      parent: branchData.parentBranchName || "",
      commits,
      children: branchData.children.join(", "),
      prNumber: pr?.prNumber || 0,
      prStatus: pr?.state || "UNKNOWN",
      currentVersion: pr?.versions.length || 0,
      remoteVersion: pr?.versions.length || 0,
    };
    
    branchMap.set(branchName, branchInfo);
  }
  
  return branchMap;
});

const buildTree = (branchMap: Map<BranchName, BranchInfo>, trunkName: string) =>
  Effect.gen(function* () {
    const nodeMap = new Map<BranchName, TreeNode<BranchName>>();
    
    for (const [branchName] of branchMap) {
      nodeMap.set(branchName, {
        data: branchName,
        parent: null as unknown as TreeNode<BranchName>,
        children: []
      });
    }
    
    for (const [branchName, branchInfo] of branchMap) {
      const node = nodeMap.get(branchName);
      if (!node) {
        return yield* Effect.fail(new Error(`Node not found for branch: ${branchName}`));
      }
      
      if (branchInfo.parent && branchInfo.parent !== "") {
        const parentNode = nodeMap.get(branchInfo.parent);
        if (parentNode) {
          node.parent = parentNode;
          parentNode.children.push(node);
        } else {
          return yield* Effect.fail(new Error(`Parent branch "${branchInfo.parent}" not found for "${branchName}"`));
        }
      }
    }
    
    const rootNode = nodeMap.get(trunkName);
    if (!rootNode) {
      return yield* Effect.fail(new Error(`Trunk branch "${trunkName}" not found. Available branches: ${Array.from(branchMap.keys()).join(", ")}`));
    }
    
    return { root: rootNode } as Tree<BranchName>;
  });

export const parseGraphiteData = (graphiteDir: string) =>
  Effect.gen(function* () {
    const repoConfig = yield* readRepoConfig(graphiteDir);
    const snapshot = yield* readLatestSnapshot(graphiteDir);
    const prInfo = yield* readPRInfo(graphiteDir);
    
    const branchMap = yield* buildBranchMap(snapshot, prInfo);
    const tree = yield* buildTree(branchMap, repoConfig.trunk);
    
    const result: FinalRequiredData = {
      trunkName: repoConfig.trunk,
      currentBranch: snapshot.currentBranchName,
      branchMap,
      tree
    };
    
    return result;
  });

export const parseExtractedGraphiteData = (graphiteDir = "gt-extracted") =>
  parseGraphiteData(graphiteDir).pipe(
    Effect.provide(NodeFileSystem.layer)
  );
