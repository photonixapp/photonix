import React from 'react'

import Init from '../src/components/Init'

import 'normalize.css'
import 'react-router-modal/css/react-router-modal.css'
import '../src/static/css/App.css'
import '../src/static/css/typography.css'
import '../src/static/css/storybook.css'

// import '../styles/globals.css'

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
}

export const decorators = [
  (Story) => {
    return (
      <Init>
        <Story />
      </Init>
    )
  },
]
