import React from 'react'
import history from '../history'
import { Tabs } from '../components/Tabs'

export default {
  title: 'Photonix/Tabs',
  component: Tabs,
}

const Template = (args) => <Tabs {...args} />

const redirect = (linkTo) => {
  history.push(linkTo)
  for (var tabId in DefaultTabs.args.tabs) {
    DefaultTabs.args.tabs[tabId].selected = DefaultTabs.args.tabs[tabId].linkTo == linkTo ? true : false
  }
}

export const DefaultTabs = Template.bind({})
DefaultTabs.args = {
  tabs: [
    {
      label: 'Timeline',
      selected: false,
      redirectTo: redirect,
      linkTo: '?mode=timeline',
    },
    {
      label: 'Albums',
      selected: false,
      redirectTo: redirect,
      linkTo: '#',
    },
    {
      label: 'Map',
      selected: false,
      redirectTo: redirect,
      linkTo: '?mode=map',
    },
  ],
}
