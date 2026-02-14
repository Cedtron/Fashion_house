import type { Plugin } from 'vite';

export function disableHMRInProduction(): Plugin {
  return {
    name: 'disable-hmr-production',
    apply: 'build',
    generateBundle(options, bundle) {
      // Remove HMR related code from production builds
      Object.keys(bundle).forEach(fileName => {
        const chunk = bundle[fileName];
        if (chunk.type === 'chunk' && chunk.code) {
          // Remove HMR client code
          chunk.code = chunk.code.replace(
            /import\.meta\.hot/g,
            'false'
          );
          // Remove WebSocket connections to Vite dev server
          chunk.code = chunk.code.replace(
            /new WebSocket\([^)]*vite[^)]*\)/g,
            'null'
          );
        }
      });
    },
  };
}