import React  from 'react'
import { Query } from "react-apollo";
import gql from "graphql-tag";
import Tags from '../components/Tags'


const TagsContainer = () => (
  <div>
    <Query
      query={gql`
        {
          allCameras {
            id
            make
            model
          }
          allLenses {
            id
            name
          }
        }
      `}
    >
      {({ loading, error, data }) => {
        if (loading) return <p>Loading...</p>;
        if (error) return <p>Error :(</p>;

        let tagData = [
          {
            name: 'Cameras',
            items: data.allCameras.map((camera) => (
              {id: camera.id, name: `${camera.make} ${camera.model}`}
            )),
          },
          {
            name: 'Lenses',
            items: data.allLenses.map((lens) => (
              {id: lens.id, name: lens.name}
            )),
          },
        ]

        return <Tags data={tagData} />
      }}
    </Query>
  </div>
)

export default TagsContainer
