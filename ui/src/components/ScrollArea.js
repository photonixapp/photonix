import React from 'react'

export default class ScrollArea extends React.Component {
  constructor(props) {
    super(props)

    this.padding = 20
    this.scrollbarHandleWidth = 200

    this.containerRef = React.createRef()
    this.scrollbarHandleRef = React.createRef()
    this.initialised = false

    this.mouseDownStart = 0
    this.dragOffset = 0
    this.scrollbarWidth = 0
    this.contentWidth = 0
    this.contentScrollRange = 0
    this.contentOffset = 0
    this.scrollProgress = 0
    this.contentLeft = 0
    this.contentViewLeft = 0
    this.scrollbarLeft = 0
    this.displayScrollbar = false

    this.state = {
      displayScrollbar: this.displayScrollbar,
    }
  }

  componentDidMount = () => {
    this.init()
    window.addEventListener('resize', this.onWindowResize)
  }
  componentWillUnmount = () => {
    window.removeEventListener('resize', this.onWindowResize)
  }

  componentDidUpdate = () => {
    this.init()

    if (
      !this.initialised &&
      this.containerRef.current &&
      this.scrollbarHandleRef.current
    ) {
      this.forceUpdate(this.init())
    } else if (!this.initialised) {
      // Occasionally we get refs before the painting has completed so we have to force an update
      setTimeout(() => {
        this.forceUpdate()
      }, 100)
    }
  }

  init = () => {
    this.calculateSizes()
    this.positionScrollbar()
  }

  calculateSizes = () => {
    this.padding = 20
    this.scrollbarHandleWidth = 200
    if (window.innerWidth < 700) {
      this.scrollbarHandleWidth = 100
    }

    if (this.containerRef.current) {
      this.contentWidth =
        this.containerRef.current.firstChild.clientWidth + this.padding
      this.contentViewWidth =
        this.containerRef.current.clientWidth + 2 * this.padding
      this.contentScrollRange =
        this.contentWidth - this.contentViewWidth + 2 * this.padding
      this.scrollbarWidth =
        this.containerRef.current.parentElement.clientWidth - 2 * this.padding
      this.scrollbarScrollRange =
        this.scrollbarWidth - this.scrollbarHandleWidth
    }
  }

  positionScrollbar = () => {
    if (this.containerRef.current) {
      this.contentOffset = this.containerRef.current.scrollLeft
      this.scrollProgress = this.contentOffset / this.contentScrollRange
      this.scrollbarLeft = parseInt(
        this.padding + this.scrollProgress * this.scrollbarScrollRange,
        10
      )
      this.scrollbarHandleRef.current.style.left = this.scrollbarLeft + 'px'
      this.scrollbarHandleRef.current.style.width =
        this.scrollbarHandleWidth + 'px'
      this.initialised = true
    }
  }

  positionViewport = () => {
    this.scrollProgress = this.dragOffset / this.scrollbarScrollRange
    this.contentLeft = parseInt(
      this.scrollProgress * this.contentScrollRange,
      10
    )
    this.containerRef.current.scrollLeft = this.contentLeft
    this.positionScrollbar()
  }

  onScroll = () => {
    this.positionScrollbar()
  }

  onMouseDown = (e) => {
    e.preventDefault()
    this.mouseDownStart = e.clientX
    this.scrollbarStart = this.scrollbarHandleRef.current.offsetLeft | 0
    document.onmouseup = this.scrollbarRelease
    document.onmousemove = this.scrollbarDrag
    if (!this.state.displayScrollbar) {
      this.setState({ displayScrollbar: true })
    }
  }

  onTouchStart = (e) => {
    this.mouseDownStart = e.touches[0].clientX
    this.scrollbarStart = this.scrollbarHandleRef.current.offsetLeft | 0
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
    this.setState({ displayScrollbar: false })
  }

  scrollbarDrag = (e) => {
    e.preventDefault()
    this.dragOffset =
      e.clientX - (this.mouseDownStart - this.scrollbarStart) - this.padding
    this.positionViewport()
  }

  scrollbarDragTouch = (e) => {
    this.dragOffset =
      e.touches[0].clientX -
      (this.mouseDownStart - this.scrollbarStart) -
      this.padding
    this.positionViewport()
  }

  // To stop auto scroll animation after one time.
  stopScrollAnimation = (e) => {
    localStorage.setItem('filtersPeeked', true)
  }

  render = () => (
    <>
      <section
        className="Filters"
        onScroll={this.onScroll}
        ref={this.containerRef}
        onAnimationEnd={this.stopScrollAnimation}
      >
        {this.props.children}
        <div
          className="scrollbar"
          ref={this.scrollbarHandleRef}
          style={{ opacity: this.displayScrollbar ? 1 : null }}
          onMouseDown={this.onMouseDown}
          onTouchStart={this.onTouchStart}
        ></div>
      </section>
    </>
  )
}
