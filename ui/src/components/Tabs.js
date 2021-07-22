import React from 'react'
import styled from '@emotion/styled'

const Container = styled('div')`
.tabs {
  position: fixed;
  right: 0;
  bottom: 25px;
  left: 0;
  margin: 0 auto;
  text-align: center;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  padding: 0;
  width: 50%;
  align-items: center;
  justify-content: space-between;
  border-radius: 20px;
  padding: 3px;
  z-index:99;
}
.tabs li {
  display: inline-block;
  list-style: none;
  padding: 5px 20px;
  flex-grow:1;
  font-weight: 600;
  border-radius: 20px;
  transition: all .5s; 
  background:transparent;
  cursor: pointer;
}
.tabs li.active {
  background: #fff;
}
.tabs li.active {
  color: #1d1d1d;
}
.tabs button {
  width: 32px;
}
.tabs {
  color: #ddd;
  text-decoration: none;
}
`

export function Tabs({ tabs }) {
  return (
    <Container>
      <ul className="tabs">
        {tabs.map((tab) => {
          return (
            <li
              className={tab.selected ? 'active' : ''}
              onClick={() => tab.redirectTo(tab.linkTo)}
              key={tab.label}
            >
              {tab.label}
            </li>
          )
        })}
      </ul>
    </Container>
  )
}