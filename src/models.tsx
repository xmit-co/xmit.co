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
  publishInstantly: boolean;
  expireAfter: number;
  password: string;
}

export interface Site {
  id: number;
  teamID: number;
  name: string;
  settings: SiteSettings;
  domains: Map<string, undefined>;
}

export interface CredInfo {
  name: string;
  createdAt: number;
}

export interface User {
  id: number;
  name: string | undefined;
  teams: Map<number, undefined> | undefined;
  apiKeys: Map<Uint8Array, CredInfo> | undefined;
  webKeys: Map<string, CredInfo> | undefined;
  phone: string | undefined;
  email: string | undefined;
}

export interface Team {
  id: number;
  name: string | undefined;
  sites: Map<number, undefined> | undefined;
  users: Map<number, undefined> | undefined;
  invites: Map<string, undefined> | undefined;
  apiKeys: Map<Uint8Array, CredInfo> | undefined;
  defaultSettings: Record<string, any> | undefined;
}

export interface Invite {
  id: string;
  teamID: number;
  createdAt: number;
  creatingUserID: number;
}
