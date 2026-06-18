export interface Team {
  id: string;
  name: string;
  displayName: string;
  abbreviation: string;
  logo: string;
}

export interface Competitor {
  id: string;
  homeAway: 'home' | 'away';
  winner?: boolean;
  score: string;
  team: Team;
}

export interface MatchDetail {
  type: { id: string; text: string; };
  clock: { value: number; displayValue: string; };
  team: { id: string; };
  scoreValue: number;
  scoringPlay: boolean;
  redCard: boolean;
  yellowCard: boolean;
  penaltyKick: boolean;
  ownGoal: boolean;
  athletesInvolved?: Array<{
    id: string;
    displayName: string;
    shortName: string;
  }>;
}

export interface MatchStatus {
  clock: number;
  displayClock: string;
  period: number;
  type: {
    id: string;
    name: string;
    state: 'pre' | 'in' | 'post';
    completed: boolean;
    description: string;
    detail: string;
    shortDetail: string;
  };
}

export interface MatchEvent {
  id: string;
  date: string;
  name: string;
  shortName: string;
  season: {
    slug: 'group-stage' | 'round-of-32' | 'round-of-16' | 'quarterfinals' | 'semifinals' | '3rd-place-match' | 'final';
  };
  status: MatchStatus;
  competitions: Array<{
    competitors: Competitor[];
    details?: MatchDetail[];
    venue?: {
      fullName: string;
      address?: { city: string; };
    };
  }>;
}

export interface StandingEntry {
  team: {
    id: string;
    displayName: string;
    abbreviation: string;
    logos?: Array<{ href: string }>;
  };
  stats: Array<{
    name: string;
    value: number;
    displayValue: string;
    summary?: string;
    type?: string;
  }>;
}

export interface GroupStanding {
  name: string;
  abbreviation: string;
  entries: StandingEntry[];
}
