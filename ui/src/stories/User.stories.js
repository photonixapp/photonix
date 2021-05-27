import React from 'react'

import User from '../components/User'

export default {
  title: 'Photonix/Misc/User',
  component: User,
}

const Template = (args) => (
  <header style={{ float: 'right', position: 'absolute', top: 0, right: 0 }}>
    <User {...args} />
  </header>
)

export const DefaultUser = Template.bind({})
DefaultUser.args = {
  profile: {
    username: 'Larry',
    email: 'larry@example.com',
  },
  libraries: [
    {
      id: '1',
      name: 'Cat photos',
    },
    {
      id: '2',
      name: 'Dog photos',
    },
  ],
}
