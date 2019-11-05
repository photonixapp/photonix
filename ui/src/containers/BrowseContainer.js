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


export default class BrowseContainer extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      expanded: true,
    }
  }

  onExpandCollapse = () => {
    this.setState({expanded: !this.state.expanded})
  }

  render = () => {
    const params = new URLSearchParams(this.props.search)
    const mode = params.get('mode') ? params.get('mode').toUpperCase() : 'TIMELINE'
    const filtersStr = this.props.selectedFilters.map((filter) => (
      filter.id
    )).join(',')

    return (
      <Query query={GET_PHOTOS} variables={{filters: filtersStr}}>
        {({ loading, error, data }) => {
          let photoSections = []
          let photos = []
          if (!loading && !error) {
            photos = data.allPhotos.edges.map((photo) => (
              {
                id: photo.node.id,
                thumbnail: `/thumbnails/256x256_cover_q50/${photo.node.id}/`,
                location: photo.node.location ? [photo.node.location.split(',')[0], photo.node.location.split(',')[1]] : null,
              }
            ))
          }

          let section = {
            id: 12345,
            title: null,
            segments: [
              {
                numPhotos: photos.length,
                photos: photos,
              }
            ]
          }
          photoSections.push(section)

          return <Browse
            selectedFilters={this.props.selectedFilters}
            mode={mode}
            loading={loading}
            error={error}
            photoSections={photoSections}
            onFilterToggle={this.props.onFilterToggle}
            onClearFilters={this.props.onClearFilters}
            onExpandCollapse={this.onExpandCollapse}
            expanded={this.state.expanded} />
        }}
      </Query>
    )
  }
}
