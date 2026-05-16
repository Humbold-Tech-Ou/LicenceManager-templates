export type ResellerRole = "owner" | "reseller" | "sub";
export type ResellerStatus = "active" | "suspended";
export type LineStatus = "active" | "expired" | "suspended";
export type ServerProtocol = "http" | "https" | "rtmp";
export type ServerType = "live" | "vod" | "hybrid";
export type VodType = "movie" | "series";

export interface Reseller {
  id: string;
  parent_id: string | null;
  role: ResellerRole;
  name: string;
  email: string;
  credits_total: number;
  credits_used: number;
  demos_this_month: number;
  demos_limit: number;
  max_depth: number | null;
  status: ResellerStatus;
  created_at: string;
  updated_at: string;
  // computed
  credits_available?: number;
}

export interface Package {
  id: string;
  name: string;
  duration_hours: number;
  credits_cost: number;
  max_connections: number;
  is_demo: boolean;
  active: boolean;
  created_at: string;
}

export interface Line {
  id: string;
  reseller_id: string | null;
  package_id: string | null;
  username: string;
  password: string;
  is_demo: boolean;
  status: LineStatus;
  expires_at: string;
  max_connections: number;
  notes: string | null;
  created_at: string;
  // joins
  reseller?: Pick<Reseller, "id" | "name">;
  package?: Pick<Package, "id" | "name" | "duration_hours">;
}

export interface Server {
  id: string;
  name: string;
  ip: string;
  port: number;
  protocol: ServerProtocol;
  type: ServerType;
  status: string;
  created_at: string;
}

export type StreamType = "hls" | "rtmp" | "ts";

export interface Stream {
  id: string;
  server_id: string | null;
  name: string;
  category: string | null;
  stream_url: string;
  stream_type: StreamType;
  epg_id: string | null;
  logo_url: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Episode {
  number: number;
  title: string;
  file_path: string | null;
  stream_url: string | null;
  duration_min: number | null;
}

export interface Season {
  number: number;
  title?: string;
  episodes: Episode[];
}

export interface VodItem {
  id: string;
  server_id: string | null;
  tmdb_id: number | null;
  type: VodType;
  title: string;
  overview: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  rating: number | null;
  genres: string[];
  cast_list: string[];
  trailer_url: string | null;
  /** Physical path on the VPS, e.g. /mnt/movies/film.mkv */
  file_path: string | null;
  /** Release year (TMDB or manually set) */
  year: number | null;
  seasons: Season[] | null;
  stream_url: string | null;
  active: boolean;
  created_at: string;
}

export interface PanelFeatures {
  vod: boolean;
  streams: boolean;
  demos: boolean;
  resellers: boolean;
  custom_packages: boolean;
}

export interface PanelConfig {
  branding: {
    name: string;
    primary_color: string;
    logo_url?: string;
    tmdb_api_key?: string;
  };
  demo_policy: { global_monthly_limit: number };
  network_depth: { max_levels: number | null };
  features: PanelFeatures;
}

export interface ActiveConnection {
  id: string;
  line_id: string;
  ip: string | null;
  user_agent: string | null;
  connected_at: string;
}
