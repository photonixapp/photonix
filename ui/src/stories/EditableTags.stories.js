import React from 'react'

import EditableTags from '../components/EditableTags'

export default {
  title: 'Photonix/Photo Detail/EditableTags',
  component: EditableTags,
  argTypes: { refetch: { action: 'refetch' } },
}

const Template = (args) => <EditableTags {...args} />

export const DefaultEditableTags = Template.bind({})
DefaultEditableTags.args = {
  tags: [
    {
      id: '1',
      tag: {
        id: '1',
        name: 'Snowy',
      },
    },
    {
      id: '2',
      tag: {
        id: '2',
        name: 'Windy',
      },
    },
    {
      id: '3',
      tag: {
        id: '3',
        name: 'Cold',
      },
    },
  ],
  editorMode: true,
  photoId: '1',
  refetch: null,
}
