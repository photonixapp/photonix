import React, { PropTypes } from 'react'

const Footer = ({ config, progress, onFooterClick }) => (
  <footer>
    <h3>Footer {progress}</h3>
    <p>photo_dirs_scanning: {config ? config.photo_dirs_scanning.toString() : 'null'}</p>
    <button onClick={() => onFooterClick()}>Button</button>
  </footer>
)

Footer.propTypes = {
  // onClick: PropTypes.func.isRequired,
  // completed: PropTypes.bool.isRequired,
  // text: PropTypes.string.isRequired
}

export default Footer
