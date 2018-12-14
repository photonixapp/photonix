import React  from 'react'
import { Query } from "react-apollo"
import gql from "graphql-tag"
import Browse from '../components/Browse'


const GET_PHOTOS = gql`
  query Photos($filters: String) {
    allPhotos(multiFilter: $filters) {
      edges {
        node {
          id
          location
        }
      }
    }
  }
`


const BrowseContainer = ({ selectedFilters, search, onToggle }) => {
  const params = new URLSearchParams(search)
  const mode = params.get('mode') ? params.get('mode').toUpperCase() : 'TIMELINE'

  return (
    <Query query={GET_PHOTOS} variables={{filters: selectedFilters.join(',')}}>
      {({ loading, error, data }) => {
        let photos = []
        if (!loading && !error) {
          photos = data.allPhotos.edges.map((photo) => (
          {
            id: photo.node.id,
            thumbnail: `/thumbnails/256x256_cover_q50/${photo.node.id}.jpg`,
            location: photo.node.location ? [photo.node.location.split(',')[0], photo.node.location.split(',')[1]] : null,
          }
          ))
        }

        return <Browse selectedFilters={selectedFilters} mode={mode} loading={loading} error={error} photos={photos} onToggle={onToggle} />
      }}
    </Query>
  )
}

export default BrowseContainer