import React from 'react'

import FabMenu from '../components/FabMenu'
import { ReactComponent as AlbumIcon } from '../static/images/album_outlined.svg'
import { ReactComponent as DeleteIcon } from '../static/images/delete_outlined.svg'
import { ReactComponent as TagIcon } from '../static/images/tag_outlined.svg'

export default {
  title: 'Photonix/Misc/FabMenu',
  component: FabMenu,
}

const Template = (args) => <FabMenu {...args} />

export const DefaultFabMenu = Template.bind({})
DefaultFabMenu.args = {
  options: [
    {
      label: 'Tag',
      icon: <TagIcon />,
      onClick: () => alert('"Tag" was clicked'),
    },
    {
      label: 'Add to album',
      icon: <AlbumIcon />,
    },
    {
      label: 'Delete',
      icon: <DeleteIcon />,
    },
  ],
}
