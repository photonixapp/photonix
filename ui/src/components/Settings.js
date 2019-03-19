import React from 'react'
import '../static/css/Settings.css'
import { ReactComponent as CloseIcon } from '../static/images/close.svg'

const Settings = ({ data, parentSettings, onHideModals }) => (
  <div className="Settings" onClick={onHideModals}>
    <div className="modal" onClick={(e) => {e.stopPropagation()}}>
      <span onClick={onHideModals}>
        <CloseIcon className="closeIcon" alt="Close" />
      </span>
      <h2>Settings</h2>
      <ul>
        {data.map((item, index) => {
          if (parentSettings) {
            return <li key={item.key}>{item.name} &nbsp; {parentSettings ? parentSettings[item.key] : 'empty'}</li>
          }
        })}
      </ul>
    </div>
  </div>
)

export default Settings
