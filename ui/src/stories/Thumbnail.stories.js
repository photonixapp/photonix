import React from 'react'

import Thumbnail from '../components/Thumbnail'

export default {
  title: 'Photonix/Photo List/Thumbnail',
  component: Thumbnail,
  argTypes: { onStarRatingChange: { action: 'onStarRatingChange' } },
}

const Template = (args) => <Thumbnail {...args} />

export const DefaultThumbnail = Template.bind({})
DefaultThumbnail.args = {
  id: 1,
  imageUrl:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVQI12NgWlYGAAHMAR/qx7d1AAAAAElFTkSuQmCC',
}

export const StarRatedThumbnail = Template.bind({})
StarRatedThumbnail.args = {
  id: 1,
  imageUrl:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVQI12NgWlYGAAHMAR/qx7d1AAAAAElFTkSuQmCC',
  starRating: 3,
}
