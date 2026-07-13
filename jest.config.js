/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true, // Forces ts-jest to use ESM translation mechanics
        diagnostics: {
          ignoreCodes: [151002] // Gracefully bypasses hybrid warnings
        }
      },
    ],
  },
  moduleNameMapper: {
    // This tells Jest: "If you see an import ending in .js, look for the .ts file instead"
    '^(\\.\\.?\\/.+)\\.js$': '$1',
  },
};