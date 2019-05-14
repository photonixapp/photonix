import React from 'react'

import '../static/css/HierarchicalTags.css'


function displayChildren(items) {
  return items.map((item) => {
    let mainEl = <li key={item.id} title={item.name} onClick={item.onClick}>{item.name}</li>
    let childrenEl = <ul></ul>

    if (item.children) {
      childrenEl = (
        <ul>
          {displayChildren(item.children)}
        </ul>
      )
    }

    return (
      <>
        {mainEl}
        {childrenEl}
      </>
    )
  })
}


const HierarchicalTags = ({ tags }) => {
  return (
    <ul className="HeirarchicalTags">
      {displayChildren(tags)}
    </ul>
  )
}

export default HierarchicalTags
