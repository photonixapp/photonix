import React  from 'react'
import { Query } from "react-apollo"
import gql from "graphql-tag"
import PhotoList from '../components/PhotoList'


const PhotoListContainer = () => (
  <div>
    <Query
      query={gql`
        {
          allPhotos {
            id
            aperture
            exposure
            isoSpeed
          }
        }
      `}
    >
      {({ loading, error, data }) => {
        if (loading) return <p>Loading...</p>;
        if (error) return <p>Error :(</p>;

        let photos = data.allPhotos.map((photo) => (
          {
            id: photo.id,
            thumbnail: `/thumbnails/256x256_cover_q50/${photo.id}.jpg`,
          }
        ))
        console.log(photos)
        return <PhotoList photos={photos} />
      }}
    </Query>
  </div>
)

export default PhotoListContainer
