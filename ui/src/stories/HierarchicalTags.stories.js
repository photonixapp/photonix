import React from 'react'
import { MemoryRouter } from 'react-router'

import HierarchicalTags from '../components/HierarchicalTags'

export default {
  title: 'Photonix/Search/Heirarchical Tags',
  component: HierarchicalTags,
  argTypes: { onStarRatingChange: { action: 'onStarRatingChange' } },
}

const Template = (args) => (
  <MemoryRouter>
    <HierarchicalTags {...args} />
  </MemoryRouter>
)

export const DefaultHierarchicalTags = Template.bind({})
DefaultHierarchicalTags.args = {
  tags: [
    {
      id: 'tag:e4b6d5d9-07fb-4e71-bfaf-948737ae2bc0',
      name: 'Iceland',
      parent: null,
      children: [
        {
          id: 'tag:01b9911d-8824-4189-8f9e-be349bec6974',
          name: 'Reykjavík',
          parent: 'tag:e4b6d5d9-07fb-4e71-bfaf-948737ae2bc0',
          children: [],
        },
        {
          id: 'tag:803acea8-a837-4384-ac20-47f56e35a488',
          name: 'Siglufjörður',
          parent: 'tag:e4b6d5d9-07fb-4e71-bfaf-948737ae2bc0',
          children: [],
        },
      ],
      expandable: true,
    },
  ],
}
