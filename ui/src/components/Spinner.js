import React, { PropTypes } from 'react'
import '../../static/css/Spinner.css'
import spinner from '../../static/images/spinner.gif'

const Spinner = ({ active }) => (
  <span className="Spinner">
    <img src={active ? spinner : null} alt="spinner" />
  </span>
)

Spinner.propTypes = {
  active: PropTypes.bool.isRequired,
}

export default Spinner
