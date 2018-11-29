import React  from 'react'
import { Query } from "react-apollo"
import gql from "graphql-tag"
import PhotoList from '../components/PhotoList'
import Spinner from '../components/Spinner'


const GET_PHOTOS = gql`
  query Photos($tagId: UUID) {
    allPhotos(photoTags_Tag_Id: $tagId) {
      edges {
        node {
          id
        }
      }
    }
  }
`

const PhotoListContainer = ({ selectedFilters }) => (
  <div>
    <Query query={GET_PHOTOS} variables={{tagId: selectedFilters[0]}}>
      {({ loading, error, data }) => {
        if (loading) return <Spinner />
        if (error) return <p>Error :(</p>

        let photos = data.allPhotos.edges.map((photo) => (
          {
            id: photo.node.id,
            thumbnail: `/thumbnails/256x256_cover_q50/${photo.node.id}.jpg`,
          }
        ))

        return <PhotoList photos={photos} />
      }}
    </Query>
  </div>
)

export default PhotoListContainer
