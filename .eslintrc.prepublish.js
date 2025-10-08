module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['n8n-nodes-base'],
  extends: ['plugin:n8n-nodes-base/community'],
  rules: {
    'n8n-nodes-base/node-param-display-name-miscased': 'error',
    'n8n-nodes-base/node-param-description-missing-final-period': 'error',
    // 'n8n-nodes-base/node-param-description-miscased': 'error', // Rule not found in current plugin version
    'n8n-nodes-base/node-param-operation-option-action-miscased': 'error',
    'n8n-nodes-base/node-param-option-name-wrong-for-get-many': 'error',
    'n8n-nodes-base/node-param-placeholder-miscased-id': 'error',
    'n8n-nodes-base/node-param-resource-without-no-data-expression': 'error',
  },
};

