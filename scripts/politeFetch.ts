import { limitConcurrency } from "../src/data/limitConcurrency";

const USER_AGENT = "StillRoaming/1.0 (https://github.com/seanmburns00/StillRoaming)";
const MAX_CONCURRENT_REQUESTS = 4;
const RATE_LIMIT_RETRIES = 3;
const RATE_LIMIT_PAUSE_MS = 10_000;

const nodeFetch = globalThis.fetch;
const limit = limitConcurrency(MAX_CONCURRENT_REQUESTS);

globalThis.fetch = (input, init) =>
  limit(async () => {
    const headers = new Headers(init?.headers);
    headers.set("User-Agent", USER_AGENT);
    for (let attempt = 0; ; attempt += 1) {
      const response = await nodeFetch(input, { ...init, headers });
      if (response.status !== 429 || attempt === RATE_LIMIT_RETRIES) return response;
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_PAUSE_MS));
    }
  });
