import React from 'react'

import '../static/css/ColorTags.css'

const ColorTags = ({ tags }) => {
  return (
    <ul className="ColorTags">
      {tags.map((tag, index) => {
        let className = `Color ${tag.name.replace(/ /g, '')}`
        let title = tag.significance
          ? `${tag.name} (${Math.round(tag.significance * 1000) / 1000})`
          : tag.name
        return (
          <li
            key={index}
            className={className}
            title={title}
            onClick={tag.onClick}
          >
            {tag.name}
          </li>
        )
      })}
    </ul>
  )
}

export default ColorTags
