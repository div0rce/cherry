class MockResponse extends Response {
  static json(body, init = {}) {
    return new Response(JSON.stringify(body), {
      status: init.status ?? 200,
      headers: { 'content-type': 'application/json' },
    });
  }
}

module.exports = {
  NextResponse: MockResponse,
  NextRequest: class extends Request {},
};
