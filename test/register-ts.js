const fs = require('node:fs');
const ts = require('typescript');

const compilerOptions = {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.CommonJS,
  jsx: ts.JsxEmit.React,
  esModuleInterop: true,
  isolatedModules: true,
  resolveJsonModule: true,
};

const compile = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions,
    fileName: filename,
    reportDiagnostics: false,
  });
  module._compile(outputText, filename);
};

require.extensions['.ts'] = compile;
require.extensions['.tsx'] = compile;
