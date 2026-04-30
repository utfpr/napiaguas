module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'jsx-a11y'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:react/jsx-runtime',
    'prettier',
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  ignorePatterns: ['dist', 'node_modules'],
  overrides: [
    {
      files: ['apps/web/**/*.{ts,tsx}'],
      parserOptions: {
        project: './apps/web/tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    {
      files: ['apps/api/**/*.ts'],
      parserOptions: {
        project: './apps/api/tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    {
      files: ['packages/shared/**/*.ts'],
      parserOptions: {
        project: './packages/shared/tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    {
      files: ['packages/ui/**/*.{ts,tsx}'],
      parserOptions: {
        project: './packages/ui/tsconfig.json',
        tsconfigRootDir: __dirname,
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  ],
}
