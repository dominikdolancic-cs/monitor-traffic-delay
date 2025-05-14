export type TrafficDataResponse = {
  status: string;
  historicalDuration: number;
  liveDuration: number;
};

export interface NotificationStatus {
  sent: boolean;
}

export type GeneratedMessage = string | undefined | null;
