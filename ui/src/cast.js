/* global chrome */
/* global cast */

import scriptjs from 'scriptjs'
import {getThumbnail} from './utils/thumbnails'

var applicationID = '2DD2F655'
var namespace = 'urn:x-cast:uk.co.epixstudios.photomanager'
var session = null

function sessionListener(e) {
  console.log('New session ID:' + e.sessionId)
  session = e
  session.addUpdateListener(sessionUpdateListener)
  session.addMessageListener(namespace, receiverMessage)
}

function sessionUpdateListener(isAlive) {
  var message = isAlive ? 'Session Updated' : 'Session Removed'
  message += ': ' + session.sessionId
  console.log(message)
  if (!isAlive) {
    session = null
  }
}

function receiverMessage(namespace, message) {
  console.log('receiverMessage: ' + namespace + ', ' + message)
}

function receiverListener(e) {
  console.log(e)
  if(e === 'available') {
    console.log('receiver found')
  }
  else {
    console.log('receiver list empty')
  }
}

export const initializeCastApi = () => {
  var sessionRequest = new chrome.cast.SessionRequest(applicationID)
  var apiConfig = new chrome.cast.ApiConfig(sessionRequest,
    sessionListener,
    receiverListener)

  chrome.cast.initialize(apiConfig)
}

export const castImage = (photoId) => {
  if (session != null) {
    let url = window.location.origin + getThumbnail(photoId, 1)
    session.sendMessage(namespace, url)
  }
}

if (typeof chrome !== 'undefined') {
  window['__onGCastApiAvailable'] = function(isAvailable) {
    if (isAvailable) {
      initializeCastApi()
    }
    else {
      debugger
    }
  }

  scriptjs('https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1')
}
