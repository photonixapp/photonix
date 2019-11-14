import React  from 'react'
import PhotoList from '../components/PhotoList'


export default class PhotoListContainer extends React.Component {
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
    this.contentOffset = -1
    this.scrollProgress = 0
    this.selectedSection = 0
    this.contentTop = 0
    this.contentViewTop = 0
    this.scrollbarTop = 0
    this.displayScrollbar = false

    this.state = {
      displayScrollbar: this.displayScrollbar,
      selectedSection: null,
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
    let newOffset = this.containerRef.current.scrollTop
    if (newOffset !== this.contentOffset) {
      this.contentOffset = this.containerRef.current.scrollTop
      this.scrollProgress = this.contentOffset / this.contentScrollRange
      this.scrollbarTop = parseInt(this.scrollbarPadding + (this.scrollProgress * this.scrollbarScrollRange), 10)
      this.scrollbarHandleRef.current.style.top = this.scrollbarTop + 'px'
      this.scrollbarHandleRef.current.style.height = this.scrollbarHandleHeight + 'px'
    }
    this.initialised = true
  }

  positionViewportFromScrollbar = () => {
    let sectionScrollbarJump = this.scrollbarScrollRange / this.props.photoSections.length
    this.scrollProgress = this.dragOffset / this.scrollbarScrollRange
    this.selectedSection = Math.floor(this.dragOffset / sectionScrollbarJump)
    this.selectedSection = Math.max(this.selectedSection, 0)
    this.selectedSection = Math.min(this.selectedSection, this.props.photoSections.length - 1)
    this.positionViewportToSection()
  }

  positionViewportToSection = () => {
    let sectionEl = this.containerRef.current.getElementsByClassName('section')[this.selectedSection]
    if (sectionEl) {
      this.contentTop = sectionEl.offsetTop
      this.containerRef.current.scrollTop = this.contentTop - 20
      this.positionScrollbar()
    }
  }

  detectSectionScrolledTo = () => {
    let sectionEls = this.containerRef.current.getElementsByClassName('section')
    let selectedSection = null
    for (let sectionIndex in sectionEls) {
      let el = sectionEls[sectionIndex]
      if (this.containerRef.current.scrollTop + 20 >= el.offsetTop) {
        selectedSection = sectionIndex
      }
      else {
        break
      }
    }

    if (this.selectedSection !== selectedSection) {
      this.selectedSection = parseInt(selectedSection, 10)
      this.setState({selectedSection: this.selectedSection})
    }
  }

  onHistogramClick = (index) => {
    if (index !== this.state.selectedSection) {
      this.selectedSection = index
      this.setState({selectedSection: index})
      this.positionViewportToSection()
    }
  }

  onScroll = () => {
    this.positionScrollbar()
    this.detectSectionScrolledTo()
  }

  onMouseDown = (e) => {
    e.preventDefault()
    this.mouseDownStart = e.clientY
    this.scrollbarStart = this.scrollbarHandleRef.current.offsetTop | 0
    document.onmouseup = this.scrollbarRelease
    document.onmousemove = this.scrollbarDrag
    this.setState({displayScrollbar: true})
  }

  onTouchStart = (e) => {
    this.mouseDownStart = e.touches[0].clientY
    this.scrollbarStart = this.scrollbarHandleRef.current.offsetTop | 0
    document.ontouchend = this.scrollbarRelease
    document.ontouchmove = this.scrollbarDragTouch
  }

  onWindowResize = () => {
    this.calculateSizes()
    this.positionScrollbar()
  }

  scrollbarRelease = () => {
    document.onmouseup = null
    document.onmousemove = null
    document.ontouchend = null
    document.ontouchmove = null
    this.setState({displayScrollbar: false})
  }

  scrollbarDrag = (e) => {
    e.preventDefault()
    this.dragOffset = e.clientY - (this.mouseDownStart - this.scrollbarStart) - this.scrollbarPadding
    this.positionViewportFromScrollbar()
  }

  scrollbarDragTouch = (e) => {
    this.dragOffset = e.touches[0].clientY - (this.mouseDownStart - this.scrollbarStart) - this.scrollbarPadding
    this.positionViewportFromScrollbar()
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
    return <PhotoList photoSections={this.props.photoSections}
      onToggle={this.props.onToggle}
      onScroll={this.onScroll}
      onMouseDown={this.onMouseDown}
      onTouchStart={this.onTouchStart}
      onHistogramClick={this.onHistogramClick}
      containerRef={this.containerRef}
      scrollbarHandleRef={this.scrollbarHandleRef}
      displayScrollbar={this.state.displayScrollbar}
      selectedSection={this.state.selectedSection} />
  }
}
