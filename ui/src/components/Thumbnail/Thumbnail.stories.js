import React from 'react';
import { MemoryRouter } from 'react-router'

import Thumbnail from './Thumbnail';

export default {
  title: 'Photonix/Photo List/Thumbnail',
  component: Thumbnail,
  argTypes: { onStarRatingChange: { action: 'onStarRatingChange' } },
};

const Template = (args) => (
  <MemoryRouter>
    <Thumbnail {...args} />
  </MemoryRouter>
);

export const DefaultThumbnail = Template.bind({});
DefaultThumbnail.args = {
  id: 1,
  imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVQI12NgWlYGAAHMAR/qx7d1AAAAAElFTkSuQmCC',
};

export const StarRatedThumbnail = Template.bind({});
StarRatedThumbnail.args = {
  id: 1,
  imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVQI12NgWlYGAAHMAR/qx7d1AAAAAElFTkSuQmCC',
  starRating: 3,
};
