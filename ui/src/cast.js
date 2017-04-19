/* global chrome */
/* global cast */

import scriptjs from 'scriptjs'
import {getThumbnail} from './utils/thumbnails'

let castEnabled = false

export const initializeCastApi = () => {
  cast.framework.CastContext.getInstance().setOptions({
    receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
    autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
  })
  castEnabled = true
}

export const castImage = (photoId) => {
  if (castEnabled) {
    let url = window.location.origin + getThumbnail(photoId, 1)
    console.log('Casting image ' + url)
    let castSession = cast.framework.CastContext.getInstance().getCurrentSession()
    let mediaInfo = new chrome.cast.media.MediaInfo(url, 'image/jpeg')
    let request = new chrome.cast.media.LoadRequest(mediaInfo)
    castSession.loadMedia(request).then(
      function() { console.log('Load succeed') },
      function(errorCode) { console.log('Error code: ' + errorCode) })
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
