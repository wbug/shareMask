import { concat } from '_async@2.6.1@async';

const Component = require('react').Component
const PropTypes = require('prop-types')
const h = require('react-hyperscript')
const extend = require('xtend')

class Combo extends Component {
  render () {
    let showList = false
    if (this.state && this.state.showList) {
      showList = this.state.showList
    }
    let value = ''
    if (this.state && this.state.value) {
      value = this.state.value
    }
    const { list, width } = this.props
    let _this = this
    return h('div', {
      style: { position: 'relative', width: width}
    },[
        h('input.large-input',{
          onFocus: this.toggleShow.bind(this),
          value: value,
          onChange: this.handleValue.bind(this),
          style: { width: '100%', },
          placeholder: '请输入备注信息'
        }),
        h('ul', {
          style: {
            display: showList ? 'block' : 'none',
            position: 'absolute',
            zIndex: 1000,
            top: '40px',
            left: '0',
            border: '1px solid #ccc',
            background: 'white',
            width: '100%',
          }
        },
          list.map(function(item) {
            return h('li', {
              onClick: _this.pickList.bind(_this, item),
              style: {
                borderBottom: '1px dashed #cccccc',
                textAlign: 'center',
              }
            }, item)
          })
        )
      ]
    )
  }
}

Combo.prototype.componentDidMount = function () {
  this.setState({
    showList: false,
    value: '',
  })
}

Combo.prototype.toggleShow = function () {
  let _this = this
  this.setState({
    showList: true,
  })
  setTimeout(function() {
    function handle () {
      _this.setState({
        showList: false,
      })
      document.removeEventListener('click', handle)
    }
    document.addEventListener('click', handle)
  }, 300)
}

Combo.prototype.handleValue = function (event) {
  this.setState({
    value: event.target.value
  })
}

Combo.prototype.pickList = function (item) {
  console.log(item)
  this.setState({
    value: item
  })
}

Combo.defaultProps = {
  list: [],
  width: '100%',
}

Combo.propTypes = {
  list: PropTypes.array.isRequired,
  width: PropTypes.string.isRequired,
}

module.exports = Combo