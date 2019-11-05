import React  from 'react'

import HierarchicalTags from '../components/HierarchicalTags'


export default class HierarchicalTagsContainer extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hierarchicalTags: [],
      expandedTags: [],
    }
  }
  
  onToggleExpand = (e, id) => {
    let expandedTags = this.state.expandedTags
    let foundIndex = expandedTags.indexOf(id)
    if (foundIndex > -1) {
      expandedTags.splice(foundIndex, 1)
    }
    else {
      expandedTags.push(id)
    }

    this.setState({
      expandedTags: expandedTags,
    })

    e.preventDefault()
    e.stopPropagation()
  }
  
  componentDidMount = () => {
    this.generateTags()
  }

  componentDidUpdate = (prevProps) => {
    if (this.props.tags !== prevProps.tags) {
      this.generateTags()
    }
  }

  buildTree = (tree, item) => {
    if (item) {
      // Current item has a parent
      for (let i = 0; i < tree.length; i++) {  // Traverse the entire tree in to find the parent
        if (tree[i].id === item.parent) {
          tree[i].children.push(item)  // add the child to his parent
          tree[i].expandable = true

          break
        }
        else {
          // if item doesn't match but tree have children then parses children again to find item parent
          this.buildTree(tree[i].children, item)
        }
      }
    }
    else {
      // We're at a root item
      let i = 0
      while (i < tree.length) {
        if (tree[i].parent) {
          // if have parent then remove it from the array and move it to the right place
          this.buildTree(tree, tree.splice(i, 1)[0])
        }
        else {
          i++
        }
      }
    }
  }

  generateTags = () => {
    let hierarchicalTags = this.props.tags
    for (var i = 0; i < hierarchicalTags.length; i++) {
      hierarchicalTags[i].children = []
    }

    this.buildTree(hierarchicalTags)
    this.setState({hierarchicalTags: hierarchicalTags})
  }

  render = () => {
    return (
      <>
        <div>{this.selectedTagId}</div>
        <HierarchicalTags tags={this.state.hierarchicalTags} expandedTags={this.state.expandedTags} onToggleExpand={this.onToggleExpand} expandAll={this.props.expandAll} />
      </>
    )
  }
}
