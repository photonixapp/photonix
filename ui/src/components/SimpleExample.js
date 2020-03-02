import React from 'react'
// import ScrollArea from 'react-scrollbar'
import ScrollArea from '../reactScrollbar/ScrollArea'

import '../static/css/SimpleExample.css'


class SimpleExample extends React.Component{
    constructor(props){
        super(props);

        this.state = {
            itemsCount : 40
        };
    }

    render() {
        var itemElements = [];

        for( var i = 0; i< this.state.itemsCount; i++){
            itemElements.push(<div className="item" key={i}>item {i}</div>);
        }

        let scrollbarStyles = {borderRadius: 10};
        let containerStyles = {background: 'none'};

        return (
            <div id="SimpleExample">
                <ScrollArea
                  className="area"
                  contentClassName="content"
                  verticalScrollbarStyle={scrollbarStyles}
                  verticalContainerStyle={containerStyles}
                  horizontalScrollbarStyle={scrollbarStyles}
                  horizontalContainerStyle={containerStyles}
                  smoothScrolling= {true}
                  minScrollSize={40}
                  horizontal={true}
                  vertical={true}
                  scrollbarPaddingLeft={10}
                  scrollbarPaddingRight={10}
                  scrollbarPaddingTop={10}
                  scrollbarPaddingBottom={10}
                >

                  {itemElements}

                </ScrollArea>

            </div>
        );
    }
}

export default SimpleExample;
