import React, { PropTypes } from 'react'
import '../../static/css/Tags.css'

const Tags = ({ data }) => (
  <div>
    {
      data.map((group) => (
        <div>
          <h2>{group.name}</h2>
          <ul className="Tags">
            {
              group.items.map((item) => (
                <li key={item.id}>{item.name}</li>
              ))
            }
          </ul>
        </div>
      ))
    }
  </div>
)

Tags.propTypes = {
  tags: PropTypes.array,
}

export default Tags
