export type RelayResult = {
  processed: number;
  delivered: number;
  retried: number;
  deadLettered: number;
};

export type CleanupResult = {
  deleted: number;
};
