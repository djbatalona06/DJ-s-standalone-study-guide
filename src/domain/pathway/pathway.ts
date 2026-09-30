import { STAGES, type Stage } from '../../art/sprites';
import type { TrackId } from '../../content/types';

export type NodeType = 'role' | 'cert' | 'skill' | 'project';
export type NodeStatus = 'locked' | 'available' | 'in-progress' | 'done';
/** What the learner has told the app. Everything else is derived from it. */
export type Mark = 'started' | 'done';

/**
 * A pay figure is only ever shown with where it came from and when it was
 * fetched. It is data about an occupation, not a promise about a job.
 */
export interface Pay {
  median: number;
  /** When the source measured it, as the source words it: "May 2025". */
  dataYear: string;
  source: string;
  sourceName: string;
  /** The day it was fetched, YYYY-MM-DD. */
  retrievedOn: string;
  outlook?: { percent: number; years: string };
  openingsPerYear?: number;
}

export interface PathNode {
  /** Stable forever, like a card id. Progress keys on it. */
  id: string;
  stage: Stage;
  type: NodeType;
  title: string;
  summary: string;
  /** A rough estimate for someone studying alongside other things, not a measurement. */
  hours: number;
  /** Every one of these must be done before this is open. */
  requires: string[];
  /** The study track that prepares for this, so the node can link to it. */
  trackId?: TrackId;
  /** Reaching this (done) is what moves the character to that stage. */
  grants?: Stage;
  /** The certifier's own page, a link only. */
  officialUrl?: string;
  pay?: Pay;
}

const stageIndex = (stage: Stage) => STAGES.indexOf(stage);
const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Everything that must be true of the pathway before it ships, as a list of
 * problems. Runs in the tests, so a cycle or an unsourced figure fails the build.
 */
export function validatePathway(nodes: readonly PathNode[]): string[] {
  const problems: string[] = [];
  const byId = new Map<string, PathNode>();

  for (const node of nodes) {
    if (byId.has(node.id)) problems.push(`duplicate node id: ${node.id}`);
    byId.set(node.id, node);
    if (!SLUG.test(node.id)) problems.push(`node ${node.id} is not a stable slug`);
    if (!STAGES.includes(node.stage)) problems.push(`node ${node.id} has an unknown stage`);
    if (!node.title.trim() || !node.summary.trim()) problems.push(`node ${node.id} has no title or summary`);
    if (!Number.isInteger(node.hours) || node.hours <= 0) problems.push(`node ${node.id} needs a positive whole number of hours`);
    if (node.grants && node.type !== 'role' && node.type !== 'cert') problems.push(`node ${node.id} grants a stage but is not a role or cert`);
    if (node.officialUrl && !node.officialUrl.startsWith('https://')) problems.push(`node ${node.id} links to something that is not https`);
    if (node.pay) {
      const p = node.pay;
      if (!(p.median > 0)) problems.push(`node ${node.id} has a pay figure without an amount`);
      if (!p.source?.startsWith('https://') || !p.sourceName?.trim()) problems.push(`node ${node.id} has a pay figure with no source`);
      if (!DAY.test(p.retrievedOn ?? '')) problems.push(`node ${node.id} has a pay figure with no retrieval date`);
      if (!p.dataYear?.trim()) problems.push(`node ${node.id} has a pay figure with no data year`);
    }
  }

  for (const node of nodes) {
    for (const req of node.requires) {
      const target = byId.get(req);
      if (!target) problems.push(`node ${node.id} requires a missing node ${req}`);
      else if (req === node.id) problems.push(`node ${node.id} requires itself`);
      else if (stageIndex(target.stage) > stageIndex(node.stage)) problems.push(`node ${node.id} requires ${req}, which is in a later stage`);
    }
  }

  // A cycle would lock every node in it forever.
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (id: string, trail: string[]) => {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'visiting') {
      problems.push(`cycle: ${[...trail.slice(trail.indexOf(id)), id].join(' -> ')}`);
      return;
    }
    state.set(id, 'visiting');
    for (const req of byId.get(id)?.requires ?? []) if (byId.has(req)) visit(req, [...trail, id]);
    state.set(id, 'done');
  };
  for (const node of nodes) visit(node.id, []);

  for (const stage of STAGES) {
    if (!nodes.some((n) => n.stage === stage)) problems.push(`stage ${stage} has no nodes`);
  }
  return problems;
}

/**
 * done wins, then anything the learner started, then whether the prerequisites
 * are done. A started node stays in progress even if a prerequisite is later
 * reopened: the app records what you did, it does not argue with it.
 */
export function statuses(nodes: readonly PathNode[], marks: ReadonlyMap<string, Mark>): Map<string, NodeStatus> {
  const out = new Map<string, NodeStatus>();
  for (const node of nodes) {
    const mark = marks.get(node.id);
    if (mark === 'done') out.set(node.id, 'done');
    else if (mark === 'started') out.set(node.id, 'in-progress');
    else out.set(node.id, node.requires.every((r) => marks.get(r) === 'done') ? 'available' : 'locked');
  }
  return out;
}

export function unmet(node: PathNode, marks: ReadonlyMap<string, Mark>): string[] {
  return node.requires.filter((r) => marks.get(r) !== 'done');
}

/** What to do next: things in progress first, then things that are open, in path order. */
export function nextActions(nodes: readonly PathNode[], status: ReadonlyMap<string, NodeStatus>, limit = 3): PathNode[] {
  const order = (n: PathNode) => stageIndex(n.stage);
  const pick = (wanted: NodeStatus) =>
    nodes.filter((n) => status.get(n.id) === wanted).sort((a, b) => order(a) - order(b));
  return [...pick('in-progress'), ...pick('available')].slice(0, limit);
}

/** The furthest stage a done node grants, or Foundations. */
export function stageOf(nodes: readonly PathNode[], status: ReadonlyMap<string, NodeStatus>): Stage {
  let best = 0;
  for (const node of nodes) {
    if (node.grants && status.get(node.id) === 'done') best = Math.max(best, stageIndex(node.grants));
  }
  return STAGES[best];
}

/** The stage's position, 1-based, for "Lvl 3". */
export const levelOf = (stage: Stage): number => stageIndex(stage) + 1;
