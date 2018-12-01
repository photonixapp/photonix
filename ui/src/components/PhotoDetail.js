import React from 'react'
import '../static/css/PhotoDetail.css'
import createHistory from 'history/createBrowserHistory'

const history = createHistory()

const PhotoDetail = ({ path }) => (
  <div className="PhotoDetail" style={{backgroundImage: 'url(' + path + ')'}} onClick={history.goBack}></div>
)

export default PhotoDetail
