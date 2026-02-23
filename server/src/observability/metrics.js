export class Metrics {
  constructor() {
    this.counters = {
      tool_calls: 0,
      events_inserted: 0,
      events_deduped: 0,
      ingestion_failures: 0,
    };
  }

  increment(name, by = 1) {
    if (!(name in this.counters)) this.counters[name] = 0;
    this.counters[name] += by;
  }

  snapshot() {
    return { ...this.counters };
  }
}

export const metrics = new Metrics();
