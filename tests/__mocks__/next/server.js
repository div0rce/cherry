class MockResponse extends Response {
  static json(body, init = {}) {
    return new Response(JSON.stringify(body), {
      status: init.status ?? 200,
      headers: { 'content-type': 'application/json' },
    });
  }
}

export const NextResponse = MockResponse;
export class NextRequest extends Request {}
