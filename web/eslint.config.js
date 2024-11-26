import globals from 'globals'
import pluginJs from '@eslint/js'


export default [
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        JAY: 'writeable'
      }
    }
  },
  pluginJs.configs.recommended,
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
