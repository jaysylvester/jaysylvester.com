import globals from 'globals'
import pluginJs from '@eslint/js'


export default [
  {
    languageOptions: {
      globals: {
        ...globals.node,
        app: 'writeable'
      }
    }
  },
  pluginJs.configs.recommended,
  {
    ignores: ['util/templates/']
  },
  {
    rules: {
      'linebreak-style': [
        'error',
        'unix'
      ],
      quotes: [
        'error',
        'single'
      ],
      semi: [
        'error',
        'never'
      ],
      'no-console': 0,
      'no-debugger': 0
    }
  }
]
