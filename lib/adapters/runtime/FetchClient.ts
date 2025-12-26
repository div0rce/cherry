import type { Fetcher } from '../contracts/Fetch.js';

export class FetchClient implements Fetcher {
  async fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    return fetch(input, init);
  }
}
