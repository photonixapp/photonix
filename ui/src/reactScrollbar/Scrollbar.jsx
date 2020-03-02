import React from 'react';
import PropTypes from 'prop-types';
import { Motion, spring } from 'react-motion';
import { modifyObjValues } from './utils';

class ScrollBar extends React.Component {
    constructor(props){
        super(props);
        let newState = this.calculateState(props);
        this.state = {
            position: newState.position,
            scrollSize: newState.scrollSize,
            isDragging: false,
            lastClientPosition: 0
        };

        if(props.type === 'vertical'){
            this.bindedHandleMouseMove = this.handleMouseMoveForVertical.bind(this);
        } else {
            this.bindedHandleMouseMove = this.handleMouseMoveForHorizontal.bind(this);
        }

        this.bindedHandleMouseUp = this.handleMouseUp.bind(this);
    }

    componentDidMount(){
        if (this.props.ownerDocument) {
            this.props.ownerDocument.addEventListener("mousemove", this.bindedHandleMouseMove);
            this.props.ownerDocument.addEventListener("mouseup", this.bindedHandleMouseUp);
        }
    }

    UNSAFE_componentWillReceiveProps(nextProps){
        this.setState(this.calculateState(nextProps));
    }

    componentWillUnmount(){
        if (this.props.ownerDocument) {
            this.props.ownerDocument.removeEventListener("mousemove", this.bindedHandleMouseMove);
            this.props.ownerDocument.removeEventListener("mouseup", this.bindedHandleMouseUp);
        }
    }

    calculateFractionalPosition(realContentSize, containerSize, contentPosition){
        let relativeSize = realContentSize - containerSize;

        return 1 - ((relativeSize - contentPosition) / relativeSize);
    }

    calculateState(props){
        let scrollContainerSize = props.containerSize - (this.props.paddingStart + this.props.paddingEnd)
        let fractionalPosition = this.calculateFractionalPosition(props.realSize, props.containerSize, props.position);
        let proportionalToPageScrollSize = scrollContainerSize * props.containerSize / props.realSize;
        let scrollSize = proportionalToPageScrollSize < props.minScrollSize ? props.minScrollSize : proportionalToPageScrollSize;
        let scrollPosition = ((scrollContainerSize - scrollSize) * fractionalPosition) + this.props.paddingStart;
        return {
            scrollSize: scrollSize,
            position: Math.round(scrollPosition)
        };
    }

    render(){
        let {smoothScrolling, isDragging, type, scrollbarStyle, containerStyle} = this.props;
        let isVoriziontal = type === 'horizontal';
        let isVertical = type === 'vertical';
        let scrollStyles = this.createScrollStyles();
        let springifiedScrollStyles = smoothScrolling ? modifyObjValues(scrollStyles, x => spring(x)) : scrollStyles;

        let scrollbarClasses = `scrollbar-container ${isDragging ? 'active' : ''} ${isVoriziontal ? 'horizontal' : ''} ${isVertical ? 'vertical' : ''}`;

        return (
            <Motion style={springifiedScrollStyles}>
                { style =>
                    <div
                        className={scrollbarClasses}
                        style={containerStyle}
                        onMouseDown={this.handleScrollBarContainerClick.bind(this)}
                        ref={ x => this.scrollbarContainer = x }
                    >
                        <div
                            className="scrollbar"
                            style={{ ...scrollbarStyle, ...style }}
                            onMouseDown={this.handleMouseDown.bind(this)}
                        />
                    </div>
                }
            </Motion>
        );
    }

    handleScrollBarContainerClick(e) {
        e.preventDefault();
        let multiplier = this.computeMultiplier();
        let clientPosition = this.isVertical() ? e.clientY : e.clientX;
        let { top, left } = this.scrollbarContainer.getBoundingClientRect();
        let clientScrollPosition = this.isVertical() ? top : left;

        let position = clientPosition - clientScrollPosition;
        let proportionalToPageScrollSize = this.props.containerSize * this.props.containerSize / this.props.realSize;

        this.setState({isDragging: true, lastClientPosition: clientPosition });
        this.props.onPositionChange((position - proportionalToPageScrollSize / 2) / multiplier);
    }

    handleMouseMoveForHorizontal(e){
        if(this.state.isDragging){
            let multiplier = this.computeMultiplier();
            e.preventDefault();
            let deltaX = this.state.lastClientPosition - e.clientX;
            this.setState({ lastClientPosition: e.clientX });
            this.props.onMove(0, deltaX / multiplier);
        }
    }

    handleMouseMoveForVertical(e){
        if(this.state.isDragging){
            let multiplier = this.computeMultiplier();
            e.preventDefault();
            let deltaY = this.state.lastClientPosition - e.clientY;
            this.setState({ lastClientPosition: e.clientY });
            this.props.onMove(deltaY / multiplier, 0);
        }
    }

    handleMouseDown(e){
        e.preventDefault();
        e.stopPropagation();
        let lastClientPosition = this.isVertical() ? e.clientY: e.clientX;
        this.setState({isDragging: true, lastClientPosition: lastClientPosition });

        this.props.onFocus();
    }

    handleMouseUp(e){
        if (this.state.isDragging) {
            e.preventDefault();
            this.setState({isDragging: false });
        }
    }

    createScrollStyles(){
        if(this.props.type === 'vertical'){
            return {
                height: this.state.scrollSize,
                marginTop: this.state.position
            };
        } else {
            return {
                width: this.state.scrollSize,
                marginLeft: this.state.position
            };
        }
    }

    computeMultiplier(){
        return ((this.props.containerSize - this.props.paddingStart - this.props.paddingEnd) - this.state.scrollSize) / (this.props.realSize - this.props.containerSize)
    }

    isVertical(){
       return this.props.type === 'vertical';
    }
}

ScrollBar.propTypes = {
    onMove: PropTypes.func,
    onPositionChange: PropTypes.func,
    onFocus: PropTypes.func,
    realSize: PropTypes.number,
    containerSize: PropTypes.number,
    position: PropTypes.number,
    containerStyle: PropTypes.object,
    scrollbarStyle: PropTypes.object,
    type: PropTypes.oneOf(['vertical', 'horizontal']),
    ownerDocument: PropTypes.any,
    smoothScrolling: PropTypes.bool,
    minScrollSize: PropTypes.number
};

ScrollBar.defaultProps = {
    type : 'vertical',
    smoothScrolling: false,
};

export default ScrollBar;
