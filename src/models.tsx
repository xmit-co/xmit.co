import Sockette from "sockette";

export interface Node {
  value?: any;
  children?: Map<any, Node>;
}

export interface State {
  ready: boolean;
  root: Node;
  errors: string[];
  updates: [any, any][] | null;
  sock?: Sockette;
}

export interface SiteSettings {
  publishInstantly: boolean | undefined;
  password: string | undefined;
}

export interface CertStatus {
  failures: number | undefined;
  lastFail: number | undefined;
  lastErr: string | undefined;
  paused: boolean | undefined;
}

export interface Site {
  id: number | undefined;
  teamID: number | undefined;
  name: string | undefined;
  settings: SiteSettings | undefined;
  domains: Map<string, undefined> | undefined;
  uploads: Map<number, undefined> | undefined;
  launches: Map<number, undefined> | undefined;
}

export interface CredInfo {
  name: string | undefined;
  createdAt: number | undefined;
  createdBy: number | undefined;
}

export interface AnalyticsView {
  name: string | undefined;
  range: string | undefined;
  granularity: string | undefined;
  groupBy: string[] | undefined;
  filters: string | undefined;
  limit: number | undefined;
  stacked: boolean | undefined;
  sortByCount: boolean | undefined;
}

export interface User {
  id: number | undefined;
  name: string | undefined;
  teams: Map<number, undefined> | undefined;
  apiKeys: Map<Uint8Array, CredInfo> | undefined;
  webKeys: Map<string, CredInfo> | undefined;
  phone: string | undefined;
  email: string | undefined;
}

export interface UserSettings {
  analyticsViews: Map<string, AnalyticsView> | undefined;
}

export interface Team {
  id: number | undefined;
  name: string | undefined;
  sites: Map<number, undefined> | undefined;
  users: Map<number, undefined> | undefined;
  invites: Map<string, undefined> | undefined;
  apiKeys: Map<Uint8Array, CredInfo> | undefined;
  defaultSettings: SiteSettings | undefined;
}

export function teamLabelPrefix(id: number): string {
  return `Team #${id}: `;
}

export function teamLabelText(id: number, name?: string): string {
  return teamLabelPrefix(id) + (name || "unnamed");
}

export function TeamLabel({ id, name }: { id: number; name?: string }) {
  return (
    <>
      {teamLabelPrefix(id)}
      {name || <em>unnamed</em>}
    </>
  );
}

export interface Invite {
  id: string;
  teamID: number | undefined;
  createdAt: number | undefined;
  creatingUserID: number | undefined;
}

export interface Upload {
  id: number | undefined;
  bundle: Uint8Array | undefined;
  at: number | undefined;
  by: number | undefined;
  siteID: number | undefined;
}

export interface Launch {
  id: number | undefined;
  uploadID: number | undefined;
  at: number | undefined;
  by: number | undefined;
  siteID: number | undefined;
}

export interface KeyRequest {
  id: string | undefined;
  createdAt: number | undefined;
  key: string | undefined;
  name: string | undefined;
}
