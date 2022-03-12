import React from 'react'
import Tabs from '../components/Tabs'

export default {
  title: 'Photonix/Photo List/Tabs',
  component: Tabs,
}

const Template = (args) => <Tabs {...args} />

export const DefaultTabs = Template.bind({})
DefaultTabs.args = {
  tabs: [
    {
      label: 'Timeline',
      onClick: () => {
        console.log('Timeline')
      },
    },
    {
      label: 'Albums',
      onClick: () => {
        console.log('Albums')
      },
    },
    {
      label: 'Map',
      onClick: () => {
        console.log('Map')
      },
    },
  ],
  initiallySelectedIndex: 0,
}
