import React from 'react'
import SimpleExample from './simple';
import ChangingChildren from './changing-children';

class App extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            selected: 'basic'
        };
    }

    switchExample(event) {
        this.setState({selected: event.target.value});
    }

    render() {
        return (
            <div>
                <div className="example-selector">
                    <div>Example:</div>
                    <select value={this.state.selected} onChange={this.switchExample.bind(this)}>
                        <option value="basic">Basic</option>
                        <option value="changing-children">Changing Children</option>
                    </select>
                </div>
                {(() => {
                    if (this.state.selected === 'changing-children') {
                        return <ChangingChildren/>;
                    } else {
                        return <SimpleExample/>;
                    }
                })()}
            </div>
        );
    }
}

export default App;
