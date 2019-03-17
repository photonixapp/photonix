import React from 'react'
import '../static/css/Settings.css'
import { ReactComponent as CloseIcon } from '../static/images/close.svg'

const Settings = ({ data, onHideModals }) => (
  <div className="Settings" onClick={onHideModals}>
    <div className="modal" onClick={(e) => {e.stopPropagation()}}>
      <span onClick={onHideModals}>
        <CloseIcon className="closeIcon" alt="Close" />
      </span>
      <h2>Settings</h2>
      <ul>
        {data.map((item, index) => {
          return <li key={item.key}>{item.name} &nbsp; {item.val}</li>
        })}
      </ul>
    </div>
  </div>
)

export default Settings
