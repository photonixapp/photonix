import React from 'react'
import '../static/css/Settings.css'
import { ReactComponent as CloseIcon } from '../static/images/close.svg'
import folder from '../static/images/folder.svg'

const Settings = ({ data, parentSettings, onSelectSourceDir, onHideModals }) => (
  <div className="Settings" onClick={onHideModals}>
    <div className="modal" onClick={(e) => {e.stopPropagation()}}>
      <span onClick={onHideModals}>
        <CloseIcon className="closeIcon" alt="Close" />
      </span>
      <h2>Settings</h2>
      <ul>
        {data.map((item, index) => {
          if (parentSettings) {
            let field = null
            let icon = null

            if (item.type === 'path') {
              field = <input type="text" value={parentSettings ? parentSettings[item.key] : 'empty'} />
              icon = <span onClick={onSelectSourceDir}><img src={folder} className="folder" alt="" /></span>
            }

            return (
              <li key={item.key}>
                <div>{item.name}</div>
                <div>{field}</div>
                {icon}
              </li>
            )
          }
        })}
      </ul>
    </div>
  </div>
)

export default Settings
