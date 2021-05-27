import React from 'react'

import MapView from '../components/MapView'

export default {
  title: 'Photonix/Photo List/Map',
  component: MapView,
}

const Template = (args) => (
  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}>
    <MapView {...args} />
  </div>
)

export const DefaultMap = Template.bind({})

DefaultMap.args = {
  location: [64.039132, -16.173093],
}
