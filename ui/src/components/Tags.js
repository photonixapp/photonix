import React, { PropTypes } from 'react'
import '../../static/css/Tags.css'

const Tags = ({ tags }) => (
  <ul className="Tags">
    <li>car</li>
    <li>tree</li>
    <li>Iceland</li>
    <li>travel</li>
  </ul>
)

Tags.propTypes = {
  tags: PropTypes.array,
}

export default Tags
