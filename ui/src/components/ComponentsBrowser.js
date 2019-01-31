import React from 'react'

import FiltersContainer from '../containers/FiltersContainer'
import MapViewContainer from '../containers/MapViewContainer'
import PhotoListContainer from '../containers/PhotoListContainer'
import '../static/css/ComponentsBrowser.css'


const ComponentsBrowser = () => {
  let photos = []
  for (var i=0; i < 100; i++) {
    photos.push(
      {
        id: "fcad168b-c8d7-4ad6-b59e-293b1c462c28",
        location: ["64.039132", "-16.173093"],
        thumbnail: "/thumbnails/256x256_cover_q50/fcad168b-c8d7-4ad6-b59e-293b1c462c28.jpg"
      },
      {
        id: "d62d8ce4-005a-4606-b58a-704467c582a5",
        location: ["64.150117", "-21.933912"],
        thumbnail: "/thumbnails/256x256_cover_q50/d62d8ce4-005a-4606-b58a-704467c582a5.jpg"
      }
    )
  }

  let filters = {
    allObjectTags: [
      {id: "7d72cdd9-4d14-49a5-b1a9-5f778dede472", name: "Cat", __typename: "ObjectTagType"},
      {id: "3c9acab6-6832-48ad-b729-dc0b5080b5cb", name: "Tree", __typename: "ObjectTagType"},
      {id: "5bec3d91-8ef6-40ca-956f-f6b214f66abd", name: "Van", __typename: "ObjectTagType"}
    ]
  }

  return (
    <div className="ComponentsBrowser">
      <div className="preview PhotoListContainerPreview">
        <h2>PhotoListContainer</h2>
        <div width="100" height="100">
          <PhotoListContainer photos={photos} />
        </div>
      </div>

      <div className="preview FiltersContainerPreview">
        <h2>FiltersContainer</h2>
        <div width="100" height="100">
          <FiltersContainer />
        </div>
      </div>

      <div className="preview MapViewContainerPreview">
        <h2>MapViewContainer</h2>
        <div width="100" height="100">
          <MapViewContainer photos={photos} />
        </div>
      </div>
    </div>
  )
}

export default ComponentsBrowser