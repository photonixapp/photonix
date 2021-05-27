import React, { useEffect } from 'react'
import { useSelector } from 'react-redux'
import PropTypes from 'prop-types'
import styled from '@emotion/styled'

import history from '../history'
import { getSafeArea } from '../stores/layout/selector'
import { ReactComponent as CloseIcon } from '../static/images/close.svg'

const ESCAPE_KEY = 27

const Container = styled('div')`
  background: #1d1d1d;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  position: relative;
  cursor: auto;

  @media all and (max-width: 700px) {
    width: 100vw;
    height: 100vh;
    padding: 0;
    .buttonBar {
      margin: 40px 0 20px;
    }
  }
`
const Accent = styled('div')`
  height: 3px;
  display: flex;
  flex-direction: row;
  div {
    height: 100%;
    flex: 1;
  }
}
`
const CloseIconContainer = styled('span')`
  filter: invert(0.9);
  cursor: pointer;
  float: right;
  padding: 10px;
`
const Body = styled('div')`
  padding: 40px;
  height: 100%;
  min-height: 100%;
  overflow: auto;

  color: h1 {
    margin: 0 0 40px;
  }
  h1 {
    margin: 0 0 40px;
  }
  .buttonBar {
    margin: 40px 0 0;
  }
  @media all and (max-width: 700px) {
    padding: 20px 20px 0 20px;
  }
`

const Modal = ({
  children,
  topAccent,
  allowClose,
  width,
  height,
  className,
  onClose,
}) => {
  const safeArea = useSelector(getSafeArea)
  useEffect(() => {
    const handleKeyDown = (event) => {
      switch (event.keyCode) {
        case ESCAPE_KEY:
          onClose()
          break
        default:
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <Container
      style={window.innerWidth > 700 ? { width: width, height: height } : {}}
      className={className}
    >
      {topAccent && (
        <Accent>
          <div style={{ background: '#005461' }}></div>
          <div style={{ background: '#00A8A1' }}></div>
          <div style={{ background: '#F5A51E' }}></div>
          <div style={{ background: '#F5791E' }}></div>
          <div style={{ background: '#F54820' }}></div>
        </Accent>
      )}
      {allowClose && (
        <CloseIconContainer
          onClick={onClose}
          style={{ marginTop: safeArea.top }}
        >
          <CloseIcon className="closeIcon" alt="Close" />
        </CloseIconContainer>
      )}
      <Body style={{ marginTop: safeArea.top }}>{children}</Body>
    </Container>
  )
}

Modal.propTypes = {
  children: PropTypes.element,
  topAccent: PropTypes.bool,
  allowClose: PropTypes.bool,
  width: PropTypes.bool,
  height: PropTypes.bool,
  className: PropTypes.string,
  onClose: PropTypes.func,
}

Modal.defaultProps = {
  children: null,
  topAccent: false,
  allowClose: true,
  width: 600,
  height: null,
  className: '',
  onClose: history.goBack,
}

export default Modal
