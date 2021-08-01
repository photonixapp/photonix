import React from 'react'
import styled from '@emotion/styled'

export const TagLi = styled('li')`
  background: #444;
  color: #ddd;
  display: inline-block;
  margin: 0 10px 10px 0;
  padding: 6px 10px 4px;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
`

const Tag = ({ itemId, itemName, groupName, onToggle }) => (
  <TagLi key={itemId} onClick={() => onToggle(itemId, groupName, itemName)}>
    {itemName}
  </TagLi>
)

export default Tag
