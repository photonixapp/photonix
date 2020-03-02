import React from 'react';

const react13 = isReact13(React);
var didWarnAboutChild = false;

export function findDOMNode(component){
    if(!react13){
        return component;
    }else{
        return React.findDOMNode(component);
    }
}

export function warnAboutFunctionChild() {
    if (didWarnAboutChild || react13) {
      return;
    }

    didWarnAboutChild = true;
    console.error('With React 0.14 and later versions, you no longer need to wrap <ScrollArea> child into a function.');
  }

export function warnAboutElementChild() {
    if (didWarnAboutChild || !react13) {
          return;
    }

    didWarnAboutChild = true;
    console.error( 'With React 0.13, you need to wrap <ScrollArea> child into a function.' );
  }

export function positiveOrZero(number){
    return number < 0 ? 0 : number;
}

export function modifyObjValues (obj, modifier = x => x){
    let modifiedObj = {};
    for(let key in obj){
        if(obj.hasOwnProperty(key)) modifiedObj[key] = modifier(obj[key]);
    }
    
    return modifiedObj;
}

export function isReact13(React) {
    const { version } = React;
    if (typeof version !== 'string') {
        return true;
    }

    const parts = version.split('.');
    const major = parseInt(parts[0], 10);
    const minor = parseInt(parts[1], 10);

    return major === 0 && minor === 13;
}
