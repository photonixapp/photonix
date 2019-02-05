import React  from 'react'
import PhotoList2 from '../components/PhotoList2'


export default class PhotoListContainer2 extends React.Component {
  constructor(props) {
    super(props)

    this.padding = 0
    this.scrollbarPadding = 10
    this.scrollbarHandleHeight = 0

    this.containerRef = React.createRef()
    this.scrollbarHandleRef = React.createRef()
    this.initialised = false

    this.mouseDownStart = 0
    this.dragOffset = 0
    this.scrollbarHeight = 0
    this.contentHeight = 0
    this.contentScrollRange = 0
    this.contentOffset = 0
    this.scrollProgress = 0
    this.contentTop = 0
    this.contentViewTop = 0
    this.scrollbarTop = 0
    this.displayScrollbar = false

    this.state = {
      displayScrollbar: this.displayScrollbar,
    }
  }

  componentDidMount = () => {
    window.addEventListener('resize', this.onWindowResize)
    setTimeout(() => {this.forceUpdate()}, 100)
  }
  componentWillUnmount = () => {
    window.removeEventListener('resize', this.onWindowResize)
  }

  componentDidUpdate = () => {
    if (!this.initialised && this.containerRef.current && this.scrollbarHandleRef.current) {
      this.forceUpdate(this.init())
    }
    else if (!this.initialised) {
      // Occasionally we get refs before the painting has completed so we have to force an update
      setTimeout(() => {this.forceUpdate()}, 100)
    }
  }

  init = () => {
    this.calculateSizes()
    this.positionScrollbar()
  }

  calculateSizes = () => {
    this.padding = 40
    this.scrollbarHandleHeight = 150
    if (window.innerWeight < 700) {
      this.padding = 20
      this.scrollbarHandleHeight = 100
    }

    this.contentHeight = this.containerRef.current.firstChild.clientHeight
    this.contentViewHeight = this.containerRef.current.clientHeight
    this.contentScrollRange = this.contentHeight - this.contentViewHeight + (2 * this.padding)
    this.scrollbarHeight = this.containerRef.current.parentElement.clientHeight
    this.scrollbarScrollRange = this.scrollbarHeight - this.scrollbarHandleHeight - (2 * this.scrollbarPadding)
  }

  positionScrollbar = () => {
    this.contentOffset = this.containerRef.current.scrollTop
    this.scrollProgress = this.contentOffset / this.contentScrollRange
    this.scrollbarTop = parseInt(this.scrollbarPadding + (this.scrollProgress * this.scrollbarScrollRange), 10)
    this.scrollbarHandleRef.current.style.top = this.scrollbarTop + 'px'
    this.scrollbarHandleRef.current.style.height = this.scrollbarHandleHeight + 'px'
    this.initialised = true
  }

  positionViewport = () => {
    let sectionScrollbarJump = this.scrollbarScrollRange / this.props.photoSections.length
    this.scrollProgress = this.dragOffset / this.scrollbarScrollRange
    let sectionNum = Math.floor(this.dragOffset / sectionScrollbarJump)
    let sectionEl = this.containerRef.current.getElementsByClassName('section')[sectionNum]
    if (sectionEl) {
      this.contentTop = sectionEl.offsetTop
      this.containerRef.current.scrollTop = this.contentTop - 20
      this.positionScrollbar()
    }
  }

  onScroll = () => {
    this.positionScrollbar()
  }

  onMouseDown = (e) => {
    e.preventDefault()
    this.mouseDownStart = e.clientY
    this.scrollbarStart = this.scrollbarHandleRef.current.offsetTop | 0
    document.onmouseup = this.scrollbarRelease
    document.onmousemove = this.scrollbarDrag
    this.setState({displayScrollbar: true})
  }

  onWindowResize = () => {
    this.calculateSizes()
    this.positionScrollbar()
  }

  scrollbarRelease = () => {
    document.onmouseup = null
    document.onmousemove = null
    this.setState({displayScrollbar: false})
  }

  scrollbarDrag = (e) => {
    e.preventDefault()
    this.dragOffset = e.clientY - (this.mouseDownStart - this.scrollbarStart) - this.scrollbarPadding
    this.positionViewport()
  }

  createFilterSelection = (sectionName, data, prefix='tag') => {
    return {
      name: sectionName,
      items: data.map((tag) => {
        if (tag.toString() === '[object Object]') {
          return {id: prefix + ':' + tag.id, name: tag.name}
        }
        return {id: prefix + ':' + tag, name: tag}
      }),
    }
  }

  render = () => {
    return <PhotoList2 photoSections={this.props.photoSections}
      onToggle={this.props.onToggle}
      onScroll={this.onScroll}
      onMouseDown={this.onMouseDown}
      containerRef={this.containerRef}
      scrollbarHandleRef={this.scrollbarHandleRef}
      displayScrollbar={this.state.displayScrollbar} />
  }
}
