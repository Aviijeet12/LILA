import {
  GlobalStats,
  Manifest,
  MatchSummary,
  PlayerSummary,
  DiscreteEvent,
  MapMetadata,
  Journey,
  MapHeatmaps,
  MapId
} from "../types/telemetry";

const BASE_URL = "/data/processed";

class DataService {
  private cache: Map<string, any> = new Map();

  private async fetchJson<T>(endpoint: string): Promise<T> {
    if (this.cache.has(endpoint)) {
      return this.cache.get(endpoint) as T;
    }

    const url = `${BASE_URL}/${endpoint}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: Failed to fetch ${url}`);
      }
      const data = await response.json();
      this.cache.set(endpoint, data);
      return data as T;
    } catch (err) {
      console.error(`[DataService] Error loading ${endpoint}:`, err);
      throw err;
    }
  }

  public async getManifest(): Promise<Manifest> {
    return this.fetchJson<Manifest>("manifest.json");
  }

  public async getGlobalStats(): Promise<GlobalStats> {
    return this.fetchJson<GlobalStats>("global_stats.json");
  }

  public async getMatches(): Promise<MatchSummary[]> {
    const data = await this.fetchJson<{ total_matches: number; matches: MatchSummary[] }>("matches/matches.json");
    return data.matches;
  }

  public async getMatchById(matchId: string): Promise<MatchSummary | undefined> {
    const matches = await this.getMatches();
    return matches.find((m) => m.match_id === matchId);
  }

  public async getPlayers(): Promise<PlayerSummary[]> {
    const data = await this.fetchJson<{ total_players: number; players: PlayerSummary[] }>("players/players.json");
    return data.players;
  }

  public async getPlayerById(userId: string): Promise<PlayerSummary | undefined> {
    const players = await this.getPlayers();
    return players.find((p) => p.user_id === userId);
  }

  public async getEvents(): Promise<DiscreteEvent[]> {
    const data = await this.fetchJson<{ total_discrete_events: number; events: DiscreteEvent[] }>("events/events.json");
    return data.events;
  }

  public async getMapMetadata(mapId: MapId): Promise<MapMetadata> {
    return this.fetchJson<MapMetadata>(`maps/${mapId}/metadata.json`);
  }

  public async getMapJourneys(mapId: MapId): Promise<Journey[]> {
    const data = await this.fetchJson<{ map_id: MapId; total_journeys: number; journeys: Journey[] }>(
      `maps/${mapId}/journeys.json`
    );
    return data.journeys;
  }

  public async getMapHeatmaps(mapId: MapId): Promise<MapHeatmaps> {
    return this.fetchJson<MapHeatmaps>(`maps/${mapId}/heatmaps.json`);
  }

  public getMinimapUrl(mapId: MapId): string {
    return `${BASE_URL}/minimaps/${mapId}_Minimap.webp`;
  }

  public clearCache(): void {
    this.cache.clear();
  }
}

export const dataService = new DataService();
