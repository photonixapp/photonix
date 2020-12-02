import React from 'react';
import { MemoryRouter } from 'react-router'

import Thumbnail from './index.js';

export default {
  title: 'Photonix/Photo List/Thumbnail',
  component: Thumbnail,
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
