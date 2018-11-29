import React from 'react'
import '../static/css/Spinner.css'
import spinner from '../static/images/spinner.svg'

const Spinner = ({ active }) => (
  <span className="Spinner">
    <img src={spinner} alt="spinner" />
  </span>
)

export default Spinner
