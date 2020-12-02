import React from 'react'
import { Link } from 'react-router-dom'
import styled from '@emotion/styled'

const Container = styled('li')`
  width: 128px;
  height: 128px;
  border: 1px solid #888;
  list-style: none;
  margin: 0 20px 20px 0;
  display: inline-block;
  box-shadow: 0 2px 6px 1px rgba(0,0,0,.5);
  background: #292929;
  overflow: hidden;
  cursor: pointer;
  div {
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
  }
  @media all and (max-width: 700px) {
    width: 96px;
    height: 96px;
  }
`
const Image = styled('div')`
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
`

const Thumbnail = ({id, imageUrl}) => (
  <Link to={`/photo/${id}`} key={id}>
    <Container>
      <Image style={{backgroundImage: 'url(' + imageUrl + ')'}} />
    </Container>
  </Link>
)

export default Thumbnail
