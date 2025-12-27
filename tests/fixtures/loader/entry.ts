const okModule = await import('cherry-loader-test://ok');
if (okModule.ok !== true) {
  throw new Error('Expected ok sentinel export');
}

const fallbackModule = await import('cherry-loader-test://undefined-source');
if (fallbackModule.ok !== 'fallback') {
  throw new Error('Expected fallback sentinel export');
}

process.stdout.write('loader-sentinel-ok\n');
