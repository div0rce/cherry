import ts from 'typescript';

export function readTsConfig(configPath: string): ts.ParsedCommandLine {
  const result = ts.readConfigFile(configPath, ts.sys.readFile);
  if (result.error) {
    throw new Error(ts.flattenDiagnosticMessageText(result.error.messageText, '\n'));
  }

  const parsed = ts.parseJsonConfigFileContent(result.config, ts.sys, process.cwd());
  if (parsed.errors.length > 0) {
    throw new Error(
      parsed.errors
        .map((error) => ts.flattenDiagnosticMessageText(error.messageText, '\n'))
        .join('\n')
    );
  }

  return parsed;
}
