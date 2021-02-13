import React from 'react'

import SearchInput from '../components/SearchInput'

export default {
  title: 'Photonix/Search/SearchInput',
  component: SearchInput,
}

const Template = (args) => <SearchInput {...args} />

export const DefaultSearchInput = Template.bind({})
DefaultSearchInput.args = {
  selectedFilters: [
    {
      id: 'tag:1',
      name: 'Snowy',
      group: 'Generic Tags',
    },
    {
      id: 'tag:2',
      name: 'White',
      group: 'Colors',
    },
  ],
}
