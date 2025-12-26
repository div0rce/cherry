export type HttpResponse = {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
};

export type HttpClient = {
  fetch: (input: string, init?: RequestInit) => Promise<HttpResponse>;
};
