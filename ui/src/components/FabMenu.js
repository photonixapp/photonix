import React, { useState } from 'react'
import PropTypes from 'prop-types'
import styled from '@emotion/styled'
import classNames from 'classnames/bind'
import { ReactComponent as AddIcon } from '../static/images/add.svg'

const MENU_WIDTH = 400
const PADDING_ANGLE = 15

const Container = styled('div')`
  svg {
    filter: invert(0.9);
  }
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
  .menuOptions {
    background: rgba(0, 84, 97, 0.95);
    width: 0;
    height: 0;
    left: 0;
    top: 0;
    position: relative;
    border-radius: 50%;
    transition: all 300ms ease-in-out;
    &.open {
      width: ${MENU_WIDTH}px;
      height: ${MENU_WIDTH}px;
      left: -${MENU_WIDTH / 2}px;
      top: -${MENU_WIDTH / 2}px;
      .option {
        opacity: 1;
        transition: opacity 300ms ease-in-out 300ms;
      }
    }
    .option {
      width: 80px;
      text-align: center;
      padding: 10px;
      cursor: pointer;
      position: absolute;
      opacity: 0;
      transition: none;
      text-decoration: none;
      svg {
        display: block;
        margin: 0 auto 5px;
      }
    }
    .option .optionsLink {
      text-decoration: none;
      color: #fff;
    }
  }
  .position {
    width: 48px;
    height: 48px;
    position: fixed;
    background: #00a8a1;
    padding: 24px;
    border-radius: 50%;
    bottom: 72px;
    right: 24px;
    box-shadow: 0 4px 8px 1px rgba(0, 0, 0, 0.3);
    z-index: 10;
    .button {
      cursor: pointer;
      position: absolute;
      top: 0;
      left: 0;
      padding: 12px;
      line-height: 0;
      transition: all 300ms;
      transition-timing-function: ease-in-out;
      svg {
      }
    }
  }
  @media all and (min-width: 700px) {
    .position {
      bottom: 24px;
      right: 24px;
    }
  }
`

const FabMenu = ({ options, photoIds, onSuccess }) => {
  const [open, setOpen] = useState(false)

  const deg2rad = (degrees) => {
    return degrees / (180 / Math.PI)
  }

  const optionPosition = (angle, distance) => {
    let c = distance
    let a = deg2rad(angle)
    let y = c * Math.cos(a)
    let x = c * Math.sin(a)
    return [x, y]
  }

  return (
    <Container>
      <div className="position">
        {open && <div className="overlay" onClick={() => setOpen(false)}></div>}
        <div className={classNames('menuOptions', { open: open })}>
          {options.map((option, index) => {
            const angle =
              ((90 - PADDING_ANGLE * 2) / (options.length - 1)) * index +
              PADDING_ANGLE
            const pos = optionPosition(angle, MENU_WIDTH / 2)
            return (
              <div
                className="option"
                style={{
                  left: MENU_WIDTH / 2 + pos[0] * -1,
                  top: MENU_WIDTH / 2 + pos[1] * -1,
                }}
                key={index}
                title={option.description}
              >
                <div
                  onClick={() => {
                    option.onClick && option.onClick(photoIds)
                    onSuccess()
                  }}
                >
                  {option.icon}
                  {option.label}
                </div>
              </div>
            )
          })}
        </div>
        <div
          className="button"
          style={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}
          onClick={() => setOpen(!open)}
        >
          <AddIcon />
        </div>
      </div>
    </Container>
  )
}

FabMenu.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      description: PropTypes.string,
      icon: PropTypes.element,
      onClick: PropTypes.func,
    })
  ),
  photoIds: PropTypes.array,
  onSuccess: PropTypes.func, // Funciton to call after the onClick of the option - usually something to hide the FabMenu
}

FabMenu.defaultProps = {
  options: [],
  photoIds: [],
}

export default FabMenu
