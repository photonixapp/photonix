import React from 'react'

import Spinner from '../components/Spinner'

export default {
  title: 'Photonix/Misc/Spinner',
  component: Spinner,
}

const Template = (args) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      position: 'absolute',
      top: 0,
      left: 0,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    }}
  >
    <Spinner {...args} />
  </div>
)

export const DefaultSpinner = Template.bind({})
