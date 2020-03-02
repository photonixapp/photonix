import React from 'react'
// import ScrollArea from 'react-scrollbar';
import ScrollArea from './ScrollArea'

class SimpleExample extends React.Component{
    constructor(props){
        super(props);

        this.state = {
            itemsCount : 40
        };
    }

    handleScroll(scrollData){
      console.log(scrollData);
    }

    render() {
        var itemElements = [];

        for( var i = 0; i< this.state.itemsCount; i++){
            itemElements.push(<div className="item" key={i}>item {i}</div>);
        }

        let scrollbarStyles = {borderRadius: 5};

        return (
            <div>
                <ScrollArea
                  className="area"
                  contentClassName="content"
                  verticalScrollbarStyle={scrollbarStyles}
                  verticalContainerStyle={scrollbarStyles}
                  horizontalScrollbarStyle={scrollbarStyles}
                  horizontalContainerStyle={scrollbarStyles}
                  smoothScrolling= {true}
                  minScrollSize={40}
                  onScroll={this.handleScroll}
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
