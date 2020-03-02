import React from 'react'
import PropTypes from 'prop-types';
import ScrollArea from './ScrollArea'

class ChangingChildren extends React.Component{
    constructor(props){
        super(props);

        this.state = {
            itemsCount : 24
        };
    }

    render() {
        return (
            <div>
                <ScrollArea className="area" contentClassName="content">

                    <Content itemsCount={this.state.itemsCount} />

                </ScrollArea>
            </div>
        );
    }
}

class Content extends React.Component {
    constructor(props){
        super(props);

        this.state = {
            itemsCount : props.itemsCount
        };
    }

    render(){
        var itemElements = [];

        for( var i = 0; i< this.state.itemsCount; i++){
            itemElements.push(<div className="item" key={i}>Item {i}</div>);
        }

        return (
            <div>
                <div>
                    <button onClick={this.handleScrollBottomButtonClick.bind(this)} > Scroll Bottom </button>
                    <button onClick={this.handleScroll100ButtonClick.bind(this)} > Scroll X  100 </button>
                    <button onClick={this.handleScrollRightButtonClick.bind(this)} > Scroll Right </button>
                    <button onClick={this.handleScrollLeftButtonClick.bind(this)} > Scroll Left </button>
                    <button onClick={this.handleScrollY40ButtonClick.bind(this)} > Scroll Y 40 </button>
                </div>
                {itemElements}
                <button onClick={this.handleAddButtonClick.bind(this)} >Add 10</button>
                <button onClick={this.handleRemoveButtonClick.bind(this)} >Remove 10</button>
                <button onClick={this.handleScrollTopButtonClick.bind(this)} > Scroll Top </button>

            </div>
        );
    }

    handleScrollTopButtonClick() {
        this.context.scrollArea.scrollTop();
    }

    handleScrollBottomButtonClick() {
        this.context.scrollArea.scrollBottom();
    }

    handleScroll100ButtonClick() {
        this.context.scrollArea.scrollXTo(100);
    }

    handleScrollLeftButtonClick() {
        this.context.scrollArea.scrollLeft();
    }

    handleScrollRightButtonClick() {
        this.context.scrollArea.scrollRight();
    }

    handleScrollY40ButtonClick() {
        this.context.scrollArea.scrollYTo(40);
    }

    handleAddButtonClick(){
        this.setState({itemsCount: this.state.itemsCount + 10}, this.context.scrollArea.refresh);
    }

    handleRemoveButtonClick(){
        this.setState({itemsCount: this.state.itemsCount - 10}, this.context.scrollArea.refresh);
    }
}

Content.contextTypes = {
    scrollArea: PropTypes.object,
};

export default ChangingChildren;
