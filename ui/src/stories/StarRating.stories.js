import React from 'react'
import { MemoryRouter } from 'react-router'

import StarRating from '../components/StarRating'

export default {
  title: 'Photonix/Photo List/Star Rating',
  component: StarRating,
  argTypes: { onStarClick: { action: 'onStarClick' } },
}

const Template = (args) => (
  <MemoryRouter>
    <StarRating {...args} />
  </MemoryRouter>
)

export const DefaultStarRating = Template.bind({})
DefaultStarRating.args = {
  starRating: 3,
}

export const LargeStarRating = Template.bind({})
LargeStarRating.args = {
  starRating: 3,
  large: true,
}
export const NullStarRating = Template.bind({})
NullStarRating.args = {
  starRating: null,
}
