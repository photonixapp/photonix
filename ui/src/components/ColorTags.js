import React from 'react'

import '../static/css/ColorTags.css'


const ColorTags = ({ tags }) => (
  <ul className="ColorTags">
    {
      tags.map((tag, index) => {
        let className = `Color ${tag.name.replace(/ /g, '')}`
        return <li key={index} className={className} title={tag.name} onClick={tag.onClick}>{tag.name}</li>
      })
    }
  </ul>
)

export default ColorTags
