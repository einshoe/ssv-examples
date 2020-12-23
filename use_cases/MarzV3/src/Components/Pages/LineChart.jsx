import React, { Component, PropTypes } from 'react';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import vg from 'vega';

class LineChart extends Component {
  constructor(props) {
    super(props);
    this.state = {
      vis: null
    };

    // use PureRenderMixin to limit updates when they are not necessary
    this.shouldComponentUpdate = PureRenderMixin.shouldComponentUpdate.bind(this);
  }

  // On initial load, generate the initial vis and attach signal listeners
  componentDidMount() {
    const { data } = this.props;
    const spec = this._spec();

    // parse the vega spec and create the vis
    vg.parse.spec(spec, chart => {
      const vis = chart({ el: this.refs.chartContainer });

      // set the initial data
      vis.data('points').insert(data);

      // render the vis
      vis.update();

      // store the vis object in state to be used on later updates
      this.setState({ vis });
    });
  }

  // updates mean that the data changed
  componentDidUpdate() {
    const { vis } = this.state;
    const { data } = this.props;

    if (vis) {
      // update data in case it changed
      vis.data('points').remove(() => true).insert(data);

      vis.update();
    }
  }

  // dummy render method that creates the container vega draws inside
  render() {
    return (
      <div ref='chartContainer' />
    );
  }


  // the vega spec for the chart
  _spec() {
    return {
      'width': 400,
      'height': 400,
      'padding': { 'top': 10, 'left': 50, 'bottom': 50, right: 10 },
      'data': [{ 'name': 'points' }],
      'scales': [
        {
          'name': 'x',
          'type': 'linear',
          'domain': { 'data': 'points', 'field': 'distance' },
          'range': 'width'
        },
        {
          'name': 'y',
          'type': 'linear',
          'domain': { 'data': 'points', 'field': 'value' },
          'range': 'height',
          'nice': true
        }
      ],
      'axes': [
        {
          'type': 'x',
          'scale': 'x',
          'offset': 5,
          'ticks': 5,
          'title': 'Distance',
          'layer': 'back'
        },
        {
          'type': 'y',
          'scale': 'y',
          'offset': 5,
          'ticks': 5,
          'title': 'Value',
          'layer': 'back'
        }
      ],
      'marks': [
        {
          'type': 'line',
          'from': { 'data': 'points' },
          'properties': {
            'enter': {
              'x': { 'scale': 'x', 'field': 'distance' },
              'y': { 'scale': 'y', 'field': 'value' },
              'stroke': { 'value': '#5357a1' },
              'strokeWidth': { 'value': 2 }
            }
          }
        }
      ]
    };
  }
}

LineChart.propTypes = {
  data: PropTypes.array.isRequired
};

export default LineChart;