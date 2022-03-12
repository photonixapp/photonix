import React from 'react'
import styled from '@emotion/styled'

import { ReactComponent as AddIcon } from '../static/images/add.svg'
import { ReactComponent as RemoveIcon } from '../static/images/remove.svg'

const Container = styled('ul')`
  li {
    background: #444;
    display: inline-block;
    margin: 0 10px 10px 0;
    padding: 5px 10px 4px;
    font-size: 12px;
    border-radius: 4px;
    &.expandable {
      padding-left: 3px;
    }
    &.newline {
      display: block;
    }
    svg {
      filter: invert(0.9);
      height: 24px;
      width: 24px;
      margin: -6px 0px -6px -3px;
      vertical-align: -2px;
      padding: 6px;
    }
  }
  .children {
    margin-left: 20px;
  }
`

function displayChildren(items, expandedTags, onToggleExpand) {
  return items.map((item) => {
    let foundIndex = -1
    if (expandedTags) {
      foundIndex = expandedTags.indexOf(item.id)
    }

    let mainEl = (
      <li key={item.id} title={item.name} onClick={item.onClick}>
        {item.name}
      </li>
    )
    if (item.expandable) {
      let icon = (
        <AddIcon alt="Expand" onClick={(e) => onToggleExpand(e, item.id)} />
      )
      let classes = 'expandable'
      if (foundIndex > -1) {
        icon = (
          <RemoveIcon
            alt="Expand"
            onClick={(e) => onToggleExpand(e, item.id)}
          />
        )
        classes += ' newline'
      }
      mainEl = (
        <li
          key={item.id}
          title={item.name}
          onClick={item.onClick}
          className={classes}
        >
          {icon}
          {item.name}
        </li>
      )
    }
    let childrenEl = null

    if (item.children && foundIndex > -1) {
      childrenEl = (
        <ul className="children">{displayChildren(item.children)}</ul>
      )
    }

    return (
      <span key={item.id}>
        {mainEl}
        {childrenEl}
      </span>
    )
  })
}

const HierarchicalTags = ({ tags, expandedTags, onToggleExpand }) => (
  <Container>{displayChildren(tags, expandedTags, onToggleExpand)}</Container>
)

export default HierarchicalTags
