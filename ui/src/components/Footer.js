import React, { PropTypes } from 'react'
import Spinner from './Spinner'
import '../../static/css/Footer.css'

const Footer = ({ config, progress, backgroundRunning, onFooterClick }) => (
  <footer className="Footer">
    <p>
      <button onClick={() => onFooterClick()}>Button</button>&nbsp;
      photo_dirs_scanning: {config ? config.photo_dirs_scanning.toString() : 'null'}
      <Spinner active={backgroundRunning} />
    </p>
  </footer>
)

// Footer.propTypes = {
  // onClick: PropTypes.func.isRequired,
  // completed: PropTypes.bool.isRequired,
  // text: PropTypes.string.isRequired
// }

export default Footer
