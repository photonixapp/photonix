import React, { useState, useEffect } from 'react'
import styled from '@emotion/styled'
import PropTypes from 'prop-types'

const Container = styled('div')`
  position: fixed;
  right: 0;
  bottom: 20px;
  left: 0;
  width: auto;
  margin: 0 20px;
  text-align: center;
  background: rgba(50, 50, 50, 0.9);
  padding: 0;
  border-radius: 20px;
  box-shadow: 0 4px 8px 1px rgba(0, 0, 0, 0.3);
  z-index: 10;

  .backgroundObround {
    height: 100%;
    position: absolute;
    padding: 5px;
    transition: left 200ms ease-in-out;
    div {
      background: #ddd;
      height: 100%;
      border-radius: 50px;
    }
  }

  .tabs {
    padding: 0;
    margin: 0;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: #ddd;
    text-decoration: none;
    li {
      display: inline-block;
      list-style: none;
      font-weight: 400;
      padding: 10px 20px;
      flex: 1;
      border-radius: 20px;
      background: transparent;
      cursor: pointer;
      z-index: 20;
      &.active {
        color: #1d1d1d;
      }
    }
  }

  @media all and (min-width: 500px) {
    width: 75%;
    margin: 0 auto;
  }
  @media all and (min-width: 700px) {
    width: 50%;
  }
`

const Tabs = ({ tabs, initiallySelectedIndex }) => {
  const [selectedIndex, setSelectedIndex] = useState(initiallySelectedIndex)

  useEffect(() => {
    setSelectedIndex(initiallySelectedIndex)
  }, [initiallySelectedIndex])

  return (
    <Container>
      <div
        className="backgroundObround"
        style={{
          width: 100 / tabs.length + '%',
          left: (100 / tabs.length) * selectedIndex + '%',
        }}
      >
        <div />
      </div>
      <ul className="tabs">
        {tabs.map((tab, index) => {
          return (
            <li
              className={index === selectedIndex ? 'active' : ''}
              onClick={() => {
                setSelectedIndex(index)
                tab.onClick()
              }}
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

Tabs.propTypes = {
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      onClick: PropTypes.function,
    })
  ),
  initiallySelectedIndex: PropTypes.number,
}

Tabs.defaultProps = {
  tabs: [],
  initiallySelectedIndex: 0,
}

export default Tabs
