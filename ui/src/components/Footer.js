import React, { PropTypes } from 'react'
import Spinner from './Spinner'
import '../../static/css/Footer.css'

const Footer = ({ status, jobsRunning, onFooterClick }) => (
  <footer className="Footer">
    <p>
      {/* <button onClick={() => onFooterClick()}>Button</button>&nbsp; */}
      {status}
      <Spinner active={jobsRunning} />
    </p>
  </footer>
)

// Footer.propTypes = {
  // onClick: PropTypes.func.isRequired,
  // completed: PropTypes.bool.isRequired,
  // text: PropTypes.string.isRequired
// }

export default Footer
