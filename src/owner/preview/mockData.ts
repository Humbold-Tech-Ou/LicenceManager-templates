// Preview-only mock data — injected via installPreviewClient in PreviewProvider
import type {
  Reseller, Package, Line, Server, Stream, VodItem,
} from "@/types/owner-panel";

const now = new Date();
const iso = (offsetDays: number) =>
  new Date(now.getTime() + offsetDays * 86400_000).toISOString();

export const mockReseller: Reseller = {
  id: "demo-owner-1",
  parent_id: null,
  role: "owner",
  name: "Demo Owner",
  email: "demo@preview.local",
  credits_total: 5000,
  credits_used: 1240,
  demos_this_month: 7,
  demos_limit: 50,
  max_depth: null,
  status: "active",
  created_at: iso(-180),
  updated_at: iso(-2),
  credits_available: 3760,
};

export const mockResellers: Reseller[] = [
  mockReseller,
  { id: "r-2", parent_id: "demo-owner-1", role: "reseller", name: "Carlos M.",
    email: "carlos@example.com", credits_total: 800, credits_used: 320,
    demos_this_month: 3, demos_limit: 30, max_depth: 1, status: "active",
    created_at: iso(-90), updated_at: iso(-5) },
  { id: "r-3", parent_id: "demo-owner-1", role: "reseller", name: "María G.",
    email: "maria@example.com", credits_total: 500, credits_used: 410,
    demos_this_month: 8, demos_limit: 30, max_depth: 1, status: "active",
    created_at: iso(-60), updated_at: iso(-1) },
  { id: "r-4", parent_id: "r-2", role: "sub", name: "Pedro L.",
    email: "pedro@example.com", credits_total: 200, credits_used: 90,
    demos_this_month: 1, demos_limit: 10, max_depth: 0, status: "suspended",
    created_at: iso(-30), updated_at: iso(-10) },
];

export const mockPackages: Package[] = [
  { id: "p-demo", name: "Demo 24h", duration_hours: 24,   credits_cost: 0, max_connections: 1, is_demo: true,  active: true, bouquet_id: null, output_formats: ["m3u8","ts"], created_at: iso(-120) },
  { id: "p-1m",   name: "1 mes",    duration_hours: 720,  credits_cost: 1, max_connections: 1, is_demo: false, active: true, bouquet_id: null, output_formats: ["m3u8","ts"], created_at: iso(-120) },
  { id: "p-3m",   name: "3 meses",  duration_hours: 2160, credits_cost: 3, max_connections: 2, is_demo: false, active: true, bouquet_id: null, output_formats: ["m3u8","ts","rtmp"], created_at: iso(-120) },
  { id: "p-6m",   name: "6 meses",  duration_hours: 4320, credits_cost: 5, max_connections: 2, is_demo: false, active: true, bouquet_id: null, output_formats: ["m3u8","ts","rtmp"], created_at: iso(-120) },
  { id: "p-12m",  name: "12 meses", duration_hours: 8760, credits_cost: 9, max_connections: 3, is_demo: false, active: true, bouquet_id: null, output_formats: ["m3u8","ts","rtmp"], created_at: iso(-120) },
];

export const mockStreams: Stream[] = [
  { id: "st-1", server_id: "s-1", name: "CNN International",   category: "Noticias",  stream_url: "http://185.243.10.20:8080/live/cnn/index.m3u8",       stream_type: "hls",  epg_id: "CNN.us",      logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/CNN.svg/320px-CNN.svg.png",                    active: true,  sort_order: 1,  created_at: iso(-100) },
  { id: "st-2", server_id: "s-1", name: "ESPN",                category: "Deportes",  stream_url: "http://185.243.10.20:8080/live/espn/index.m3u8",       stream_type: "hls",  epg_id: "ESPN.us",     logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/320px-ESPN_wordmark.svg.png", active: true,  sort_order: 2,  created_at: iso(-100) },
  { id: "st-3", server_id: "s-1", name: "Fox Sports",          category: "Deportes",  stream_url: "rtmp://185.243.10.20/live/foxsports",                  stream_type: "rtmp", epg_id: "FoxSports.us", logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Fox_Sports_logo.svg/320px-Fox_Sports_logo.svg.png", active: true,  sort_order: 3,  created_at: iso(-90) },
  { id: "st-4", server_id: "s-1", name: "National Geographic", category: "Documentales", stream_url: "http://185.243.10.20:8080/live/natgeo/stream.ts",   stream_type: "ts",   epg_id: "NatGeo.us",   logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/National_Geographic_logo.svg/220px-National_Geographic_logo.svg.png", active: true, sort_order: 4, created_at: iso(-80) },
  { id: "st-5", server_id: "s-1", name: "HBO",                 category: "Premium",   stream_url: "http://185.243.10.20:8080/live/hbo/index.m3u8",        stream_type: "hls",  epg_id: "HBO.us",      logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/HBO_logo.svg/320px-HBO_logo.svg.png",            active: true,  sort_order: 5,  created_at: iso(-70) },
  { id: "st-6", server_id: "s-1", name: "Canal de Prueba",     category: "Test",      stream_url: "http://185.243.10.20:8080/live/test/index.m3u8",       stream_type: "hls",  epg_id: null,          logo_url: null,                                                                                                       active: false, sort_order: 99, created_at: iso(-10) },
];

export const mockServers: Server[] = [
  { id: "s-1", name: "Servidor Principal", ip: "185.243.10.20", port: 8080, protocol: "http",  type: "hybrid", status: "active",   geo_countries: ["VE","CO","MX"], isp_whitelist: null, ssh_username: null, ssh_auth_method: null, ssh_secret_id: null, created_at: iso(-200) },
  { id: "s-2", name: "Servidor VOD",       ip: "185.243.10.21", port: 80,   protocol: "https", type: "vod",    status: "active",   geo_countries: null, isp_whitelist: null, ssh_username: null, ssh_auth_method: null, ssh_secret_id: null, created_at: iso(-200) },
  { id: "s-3", name: "Servidor Backup",    ip: "185.243.10.22", port: 8080, protocol: "http",  type: "live",   status: "inactive", geo_countries: null, isp_whitelist: ["CANTV"], ssh_username: null, ssh_auth_method: null, ssh_secret_id: null, created_at: iso(-100) },
];

const mkLine = (i: number, status: Line["status"], pkgId: string, resellerId: string | null, days: number): Line => {
  const pkg = mockPackages.find(p => p.id === pkgId);
  return {
    id: "l-" + i,
    reseller_id: resellerId,
    package_id: pkgId,
    username: "user_" + (1000 + i).toString(36),
    password: Math.random().toString(36).slice(2, 12),
    is_demo: pkgId === "p-demo",
    status,
    expires_at: iso(days),
    max_connections: 1,
    notes: null,
    reseller_notes: null,
    allowed_outputs: ["m3u8", "ts"],
    created_at: iso(-Math.abs(days) - 5),
    reseller: resellerId ? { id: resellerId, name: mockResellers.find(r=>r.id===resellerId)?.name ?? "—" } : undefined,
    package: { id: pkgId, name: pkg?.name ?? "—", duration_hours: pkg?.duration_hours ?? 0 },
  };
};

export const mockLines: Line[] = [
  mkLine(1,  "active",    "p-1m",   "demo-owner-1", 22),
  mkLine(2,  "active",    "p-3m",   "demo-owner-1", 65),
  mkLine(3,  "active",    "p-12m",  "r-2",          330),
  mkLine(4,  "active",    "p-6m",   "r-2",          150),
  mkLine(5,  "active",    "p-1m",   "r-3",          12),
  mkLine(6,  "expired",   "p-1m",   "r-3",          -3),
  mkLine(7,  "suspended", "p-3m",   "r-4",          40),
  mkLine(8,  "active",    "p-demo", "demo-owner-1", 1),
  mkLine(9,  "active",    "p-demo", "r-2",          1),
  mkLine(10, "active",    "p-12m",  "demo-owner-1", 350),
  mkLine(11, "expired",   "p-1m",   "r-2",          -10),
  mkLine(12, "active",    "p-6m",   "r-3",          175),
];

export const mockVod: VodItem[] = [
  {
    id: "v-1", server_id: "s-2", tmdb_id: 603, type: "movie", title: "The Matrix",
    overview: "A computer hacker learns about the true nature of reality.",
    poster_url: "https://image.tmdb.org/t/p/w300/p96dm7sCMn4VYAStA6siNz30G1r.jpg",
    backdrop_url: null, rating: 8.7, genres: ["Action", "Sci-Fi"], cast_list: ["Keanu Reeves"],
    trailer_url: null, file_path: "/mnt/movies/the-matrix-1999.mkv", year: 1999,
    seasons: null, stream_url: null, active: true, created_at: iso(-30),
  },
  {
    id: "v-2", server_id: "s-2", tmdb_id: 1399, type: "series", title: "Game of Thrones",
    overview: "Nine noble families fight for control over the lands of Westeros.",
    poster_url: "https://image.tmdb.org/t/p/w300/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg",
    backdrop_url: null, rating: 8.4, genres: ["Drama", "Fantasy"], cast_list: ["Sean Bean"],
    trailer_url: null, file_path: null, year: 2011,
    seasons: [
      {
        number: 1,
        episodes: [
          { number: 1, title: "Winter Is Coming", file_path: "/mnt/series/got/s01e01.mkv", stream_url: null, duration_min: 62 },
          { number: 2, title: "The Kingsroad",    file_path: "/mnt/series/got/s01e02.mkv", stream_url: null, duration_min: 56 },
        ],
      },
      {
        number: 2,
        episodes: [
          { number: 1, title: "The North Remembers", file_path: "/mnt/series/got/s02e01.mkv", stream_url: null, duration_min: 58 },
        ],
      },
    ],
    stream_url: null, active: true, created_at: iso(-25),
  },
  {
    id: "v-3", server_id: "s-2", tmdb_id: 680, type: "movie", title: "Pulp Fiction",
    overview: "The lives of two mob hitmen, a boxer, a gangster's wife intertwine.",
    poster_url: "https://image.tmdb.org/t/p/w300/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
    backdrop_url: null, rating: 8.5, genres: ["Crime", "Drama"], cast_list: ["John Travolta"],
    trailer_url: null, file_path: "/mnt/movies/pulp-fiction-1994.mkv", year: 1994,
    seasons: null, stream_url: null, active: true, created_at: iso(-20),
  },
  {
    id: "v-4", server_id: "s-2", tmdb_id: 1396, type: "series", title: "Breaking Bad",
    overview: "A high school chemistry teacher turned methamphetamine producer.",
    poster_url: "https://image.tmdb.org/t/p/w300/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
    backdrop_url: null, rating: 8.9, genres: ["Drama", "Crime"], cast_list: ["Bryan Cranston"],
    trailer_url: null, file_path: null, year: 2008,
    seasons: [
      {
        number: 1,
        episodes: [
          { number: 1, title: "Pilot",              file_path: "/mnt/series/bb/s01e01.mkv", stream_url: null, duration_min: 58 },
          { number: 2, title: "Cat's in the Bag",   file_path: "/mnt/series/bb/s01e02.mkv", stream_url: null, duration_min: 48 },
          { number: 3, title: "...And the Bag's in the River", file_path: "/mnt/series/bb/s01e03.mkv", stream_url: null, duration_min: 48 },
        ],
      },
    ],
    stream_url: null, active: true, created_at: iso(-15),
  },
  {
    id: "v-5", server_id: "s-2", tmdb_id: 550, type: "movie", title: "Fight Club",
    overview: "An insomniac office worker forms an underground fight club.",
    poster_url: "https://image.tmdb.org/t/p/w300/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    backdrop_url: null, rating: 8.4, genres: ["Drama", "Thriller"], cast_list: ["Brad Pitt"],
    trailer_url: null, file_path: "/mnt/movies/fight-club-1999.mkv", year: 1999,
    seasons: null, stream_url: null, active: false, created_at: iso(-10),
  },
];

export const mockPanelConfig: { key: string; value: unknown }[] = [
  { key: "branding",      value: { name: "Mi Panel IPTV (Demo)", primary_color: "#7C3AED" } },
  { key: "demo_policy",   value: { global_monthly_limit: 50 } },
  { key: "network_depth", value: { max_levels: 3 } },
  { key: "features",      value: { vod: true, streams: true, demos: true, resellers: true, custom_packages: true } },
];

export const mockActiveConnections = [
  { id: "c-1", line_id: "l-1", ip: "190.12.4.55",  user_agent: "Smart TV", connected_at: new Date().toISOString() },
  { id: "c-2", line_id: "l-3", ip: "200.10.50.11", user_agent: "Android",  connected_at: new Date().toISOString() },
];
