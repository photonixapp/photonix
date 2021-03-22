import React from 'react'

import ZoomableImage from '../components/ZoomableImage'

export default {
  title: 'Photonix/Photo Detail/Zoomable Image',
  component: ZoomableImage,
}

const Template = (args) => (
  <div style={{ position: 'absolute', top: 0, left: 0 }}>
    <ZoomableImage {...args} />
  </div>
)

export const DefaultZoomableImage = Template.bind({})
DefaultZoomableImage.args = {
  // https://unsplash.com/photos/SS-Okn2A3C8 - Niilo Isotalo
  url:
    'https://images.unsplash.com/photo-1503058695716-c5f66a905312?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=1301&q=80',
}

export const BoundingBoxesZoomableImage = Template.bind({})
BoundingBoxesZoomableImage.args = {
  url:
    'https://images.unsplash.com/photo-1503058695716-c5f66a905312?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=1301&q=80',
  boxes: [
    {
      name: 'Trees',
      positionX: 0.5,
      positionY: 0.38,
      sizeX: 0.6,
      sizeY: 0.3,
    },
    { name: 'Water', positionX: 0.5, positionY: 0.73, sizeX: 1, sizeY: 0.45 },
  ],
}
