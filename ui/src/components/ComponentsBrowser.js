import React from 'react'

import MapViewContainer from '../containers/MapViewContainer'
import PhotoListContainer from '../containers/PhotoListContainer'
import '../static/css/ComponentsBrowser.css'


const ComponentsBrowser = () => {
  const photos = [
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
  ]
  return (
    <div className="ComponentsBrowser">
      <h2>PhotoListContainer</h2>
      <div className="preview" width="100" height="100">
        <PhotoListContainer photos={photos} />
      </div>
      <h2>MapViewContainer</h2>
      <div className="preview" width="100" height="100">
        <MapViewContainer photos={photos} />
      </div>
    </div>
  )
}

export default ComponentsBrowser