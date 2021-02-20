import React from 'react'
import { MemoryRouter } from 'react-router'

import Thumbnails from '../components/Thumbnails'

export default {
  title: 'Photonix/Photo List/Thumbnails',
  component: Thumbnails,
}

const generateId = () => Math.floor(Math.random() * 100000)

const randomImage = () => {
  let images = [
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVQI12NgsHAAAAC0AHndd8rGAAAAAElFTkSuQmCC',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVQI12NgiIoGAAETALbyWPclAAAAAElFTkSuQmCC',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVQI12NgKM4EAAFTAN0PY9XYAAAAAElFTkSuQmCC',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVQI12Ng6CkCAAGOAP81qg7sAAAAAElFTkSuQmCC',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVQI12NgWlYGAAHMAR/qx7d1AAAAAElFTkSuQmCC',
  ]
  return images[Math.floor(Math.random() * images.length)]
}

const randomLocation = () => {
  let locations = [
    ['64.039132', '-16.173093'],
    ['64.150117', '-21.933912'],
  ]
  return locations[Math.floor(Math.random() * locations.length)]
}

let photos = []
for (var i = 0; i < 100; i++) {
  photos.push({
    id: generateId(),
    location: randomLocation(),
    thumbnail: randomImage(),
  })
}

let photoSections = []

let months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]
let years = ['2017', '2018']
years.reverse()
months.reverse()

for (let year of years) {
  for (let month of months) {
    let id = 'month:' + year + ':' + month
    let monthPhotos = []
    for (let i = 0; i < Math.floor(Math.random() * 150); i++) {
      let id = generateId()
      let photo = {
        id: id,
        location: [null, null],
        thumbnail: randomImage(),
      }
      monthPhotos.push(photo)
    }
    let section = {
      id: id,
      title: month + ' ' + year,
      segments: [
        {
          numPhotos: monthPhotos.length,
          photos: monthPhotos,
        },
      ],
    }
    photoSections.push(section)
  }
}

const Template = (args) => (
  <MemoryRouter>
    <Thumbnails {...args} />
  </MemoryRouter>
)

export const DefaultThumbnails = Template.bind({})

DefaultThumbnails.args = {
  photoSections: photoSections,
}
