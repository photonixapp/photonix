/* global chrome */
/* global cast */

import scriptjs from 'scriptjs'
import {getThumbnail} from './utils/thumbnails'

let chromeCastEnabled = false

export const initializeCastApi = () => {
  cast.framework.CastContext.getInstance().setOptions({
    receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
    autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
  })
  chromeCastEnabled = true
}

export const castImage = (photoId) => {
  let path = getThumbnail(photoId, 1)
  if (chromeCastEnabled) {
    console.log('Casting image ' + path)
    var castSession = cast.framework.CastContext.getInstance().getCurrentSession();
    var mediaInfo = new chrome.cast.media.MediaInfo(window.location.origin + path, 'image/jpeg');
    var request = new chrome.cast.media.LoadRequest(mediaInfo);
    castSession.loadMedia(request).then(
      function() { console.log('Load succeed'); },
      function(errorCode) { console.log('Error code: ' + errorCode); });
  }
}

window['__onGCastApiAvailable'] = function(isAvailable) {
  if (isAvailable) {
    console.log(isAvailable)
    initializeCastApi()
  }
}

scriptjs("https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1")
