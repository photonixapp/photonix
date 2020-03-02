import React from 'react'

import FiltersContainer from '../containers/FiltersContainer'
import MapViewContainer from '../containers/MapViewContainer'
import PhotoListContainer from '../containers/PhotoListContainer'
import '../static/css/ComponentsBrowser.css'


const generateId = () => (
  Math.floor(Math.random() * 100000)
)

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
    ["64.039132", "-16.173093"],
    ["64.150117", "-21.933912"],
  ]
  return locations[Math.floor(Math.random() * locations.length)]
}


const ComponentsBrowser = () => {
  let photos = []
  for (var i=0; i < 100; i++) {
    photos.push(
      {
        id: generateId(),
        location: randomLocation(),
        thumbnail: randomImage()
      },
    )
  }

  let photoSections = []

  let months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
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
          thumbnail: randomImage()
        }
        monthPhotos.push(photo)
      }
      let section = {
        id: id,
        title: month + ' ' + year,
        segments: [
          {
            numPhotos: monthPhotos.length,
            photos: monthPhotos
          }
        ]
      }
      photoSections.push(section)
    }
  }

  // let filters = {
  //   allObjectTags: [
  //     {id: "7d72cdd9-4d14-49a5-b1a9-5f778dede472", name: "Cat"},
  //     {id: "3c9acab6-6832-48ad-b729-dc0b5080b5cb", name: "Tree"},
  //     {id: "5bec3d91-8ef6-40ca-956f-f6b214f66abd", name: "Van"}
  //   ]
  // }

  return (
    <div className="ComponentsBrowser">
      <div className="preview PhotoListContainerPreview">
        <h2>PhotoListContainer</h2>
        <div>
          <PhotoListContainer photoSections={photoSections} />
        </div>
      </div>

      <div className="preview FiltersContainerPreview">
        <h2>FiltersContainer</h2>
        <div>
          <FiltersContainer />
        </div>
      </div>

      <div className="preview MapViewContainerPreview">
        <h2>MapViewContainer</h2>
        <div>
          <MapViewContainer photos={photos} />
        </div>
      </div>
    </div>
  )
}

export default ComponentsBrowser
