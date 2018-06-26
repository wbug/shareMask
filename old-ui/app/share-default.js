import { clearInterval, setInterval } from 'timers';

const inherits = require('util').inherits
const PersistentForm = require('../lib/persistent-form')
const h = require('react-hyperscript')
const connect = require('react-redux').connect
const Identicon = require('./components/identicon')
const actions = require('../../ui/app/actions')
const util = require('./util')
const numericBalance = require('./util').numericBalance
const addressSummary = require('./util').addressSummary
const isHex = require('./util').isHex
const EthBalance = require('./components/eth-balance')
const EnsInput = require('./components/ens-input')
const ethUtil = require('ethereumjs-util')
const Conbo = require('./components/conbo')
// cookie 插件
const CookieHelper = require('../lib/cookie_helpers')
// IM 通讯插件
const Strophe = require('../lib/strophe').Strophe
const $pres = require('../lib/strophe').$pres
const $iq = require('../lib/strophe').$iq
const mokeList = require('./mokeData')
// 合约数据的加密
const EthAbi = require('ethjs-abi') 
var imTryTime = 0;

module.exports = connect(mapStateToProps)(ShareDetailScreen)

function mapStateToProps (state) {
  var result = {
    address: state.metamask.selectedAddress,
    accounts: state.metamask.accounts,
    identities: state.metamask.identities,
    warning: state.appState.warning,
    network: state.metamask.network,
    addressBook: state.metamask.addressBook,
    conversionRate: state.metamask.conversionRate,
    currentCurrency: state.metamask.currentCurrency,
  }

  result.error = result.warning && result.warning.split('.')[0]

  result.account = result.accounts[result.address]
  result.identity = result.identities[result.address]
  result.balance = result.account ? numericBalance(result.account.balance) : null

  return result
}

inherits(ShareDetailScreen, PersistentForm)
function ShareDetailScreen () {
  PersistentForm.call(this)
}

ShareDetailScreen.prototype.render = function () {
  this.persistentFormParentId = 'send-tx-form'

  const props = this.props
  const {
    address,
    account,
    identity,
    network,
    identities,
    addressBook,
    conversionRate,
    currentCurrency,
  } = props
  let currentDomain = ''
  if (this.state && this.state.currentDomain) {
    currentDomain = this.state.currentDomain 
  }
  let accountList = []
  if (this.state && this.state.accountList) {
    accountList = this.state.accountList
  }
  let usedAccountList = []
  if (this.state && this.state.usedAccountList) {
    usedAccountList = this.state.usedAccountList
  }
  let shareAccountList = []
  if (this.state && this.state.shareAccountList) {
    shareAccountList = this.state.shareAccountList
  }
  let showShare = false
  if (this.state && this.state.showShare) {
    showShare = this.state.showShare
  }
  // 表单信息
  // 费用
  let cost = ''
  if (this.state && this.state.cost) {
    cost = this.state.cost
  }
  // 使用时长
  let useTime = ''
  if (this.state && this.state.useTime) {
    useTime = this.state.useTime
  }
  // 备注
  let shareMark = ''
  if (this.state && this.state.shareMark) {
    shareMark = this.state.shareMark
  }
  return (
    h('.account-detail-section full-flex-height', [

      //
      // 头部 简介信息
      //

      h('.account-data-subsection.flex-row.flex-grow', {
        style: {
          margin: '0 20px',
          position: 'relative'
        },
      }, [
        h('a',{
          href: 'home.html',
          target: '_blank'
        },[
          h('img',{
            src: 'images/popout.svg',
            style: {
              position: 'absolute',
              right: 0,
              top:0,
            }
          })
        ]),
        // header - identicon + nav
        h('.flex-row.flex-space-between', {
          style: {
            marginTop: '15px',
          },
        }, [
          // large identicon
          h('.identicon-wrapper.flex-column.flex-center.select-none', [
            h(Identicon, {
              diameter: 62,
              address: address,
            }),
          ]),

          // invisible place holder
          h('i.fa.fa-users.fa-lg.invisible', {
            style: {
              marginTop: '28px',
            },
          }),

        ]),

        // account label

        h('.flex-column', {
          style: {
            marginTop: '10px',
            alignItems: 'flex-start',
          },
        }, [
          h('h2.font-medium.color-forest.flex-center', {
            style: {
              paddingTop: '8px',
              marginBottom: '8px',
            },
          }, identity && identity.name),

          // address and getter actions
          h('.flex-row.flex-center', {
            style: {
              marginBottom: '8px',
            },
          }, [

            h('div', {
              style: {
                lineHeight: '16px',
              },
            }, addressSummary(address)),

          ]),

          // balance
          h('.flex-row.flex-center', [

            h(EthBalance, {
              value: account && account.balance,
              conversionRate,
              currentCurrency,
            }),

          ]),
        ]),
      ]),

      //
      // 中间内容区域
      //
      // 标题区域
      h('h3.flex-center.text-transform-uppercase', {
        style: {
          width: '100%',
          color: '#F7861C',
          background: '#EBEBEB',
          color: '#AEAEAE',
          marginTop: '15px',
          marginBottom: '10px',
          lineHeight: '32px',
          position: 'relative',
        },
      }, [
        !currentDomain || '当前网址为：', currentDomain || '当前网址无效',
        h('div', {
          onClick: this.changeShareShow.bind(this),
          style: {
            textTransform: 'uppercase',
            fontSize: '14px',
            lineHeight: '16px',
            padding: '5px',
            position: 'absolute',
            right: '10px'
          },
        }, [
          h('span',{
            style:{
              cursor: 'pointer',
              color: '#F7861C',
              display:'inline-block',
              verticalAlign: 'middle'
            }
          },'我要分享'),
          showShare ? h('i.fa.fa-sort-desc',{
            // ariaHidden: "true"
            style:{
              display:'inline-block',
              verticalAlign: 'middle',
              marginTop: '-8px',
              fontSize: '20px',
            }
          }) : h('i.fa.fa-sort-asc',{
            // ariaHidden: "true"
            style:{
              display:'inline-block',
              verticalAlign: 'middle',
              marginTop: '8px',
              fontSize: '20px',
            }
          })
        ]),
      ]),
      // 错误信息
      
      // 是否显示分享 区域，默认隐藏
      showShare ? h('section', {
        style: {
          width: '100%'
        }
      },[
        props.error && h('span.error.flex-center',{ style: { width: '100%' } }, '!!!' + props.error),
        h('section.flex-row.flex-center', [
          h('label.large-input', {
            style: {
              fontSize: '13px',
              width: '20%',
              textAlign: 'left'
            }
          }, '使用费用:'),
          h('select.large-input', {
            name: 'amount',
            placeholder: '使用费用',
            type: 'text',
            value: cost,
            onChange: this.handleCost.bind(this),
            style: {
              width: '25%',
            }
          }, [
            h('option', { value: -1 }, '请选择费用'),
            h('option', { value: 0 }, '使用使用'),
            h('option', { value: 0.1 }, '0.1 个币'),
            h('option', { value: 0.2 }, '0.2 个币'),
            h('option', { value: 0.5 }, '0.5 个币'),
            h('option', { value: 1 }, '1 个币'),
            h('option', { value: 2 }, '2 个币'),
            h('option', { value: 5 }, '5 个币'),
            h('option', { value: 10 }, '10 个币'),
            h('option', { value: 20 }, '20 个币'),
            h('option', { value: 50 }, '50 个币'),
          ]),
          h('label.large-input', {
            style: {
              fontSize: '13px',
              width: '20%',
              textAlign: 'center'
            }
          }, '使用时长:'),
          h('select.large-input', {
            name: 'amount',
            placeholder: '使用时长',
            type: 'text',
            value: useTime,
            onChange: this.handleUseTime.bind(this),
            style: {
              width: '25%',
            }
          }, [
            h('option', { value: -1 }, '请选择时间'),
            h('option', { value: 0.5 }, '30 分钟'),
            h('option', { value: 1 }, '1 小时'),
            h('option', { value: 2 }, '2 小时'),
            h('option', { value: 3 }, '3 小时'),
            h('option', { value: 6 }, '6 小时'),
            h('option', { value: 12 }, '12 小时'),
            h('option', { value: 24 }, '24 小时'),
          ]),
        ]),
        h('section.flex-row.flex-center', {
          style: {
            margin: '20px 20px 10px'
          }
        }, [
          h(Conbo, {
            ref: 'shareMark',
            list: ['没时间打理，如不能用，请提退币', '多人共享中，如你使用时被踢，请提退币', '好人模式，下个人使用前，你可一直使用'],
            width: '80%',
          }),
          h('button.primary', {
            onClick: this.onSubmit.bind(this),
            style: {
              width: '20%',
              textTransform: 'uppercase',
              fontSize: '14px',
            },
          }, '分享'),
        ]),
          /* 已经分享的列表 */
        h('h3.flex-center.text-transform-uppercase', {
          style: {
            width: '100%',
            color: '#F7861C',
            background: '#EBEBEB',
            color: '#AEAEAE',
            marginTop: '10px',
          },
        }, [
          '我的分享列表',
        ]),
        // 我的分享列表
        h('ul',{ style: { width: '100%', } }, [
          shareAccountList.length ? shareAccountList.map((item, index) => {
            return h('li',{
              style:{
                borderBottom: '1px solid #ccc',
                position: 'relative',
                padding: '10px',
              },
              key: index
            }, [
              // 1.分享人的账户地址，2.针对的域名，3.cookie，4.时间戳1，5.时间戳2 , 6.留言，7.使用费用 8. 使用时长
              h('div',  {style: { color: 'blue' }},[
                '当前的状态：', shareListShowStatus(item.status),
                h('span', { style: { color:'black',fontSize:'15px',fontWeight: '500',display:'inline-block',paddingLeft:'20px'}}, '操作:'),
                // 取消按钮
                (item.status == 1 || item.status == 4) ? h('span', { onClick: this.refund.bind(this, item), style: { color: 'rgb(247, 134, 28)',display: 'inline-block', padding:'0 0 0 20px',textDecoration:'underline',cursor:'pointer' } }, 
                '删除') : '',
                // 取消按钮
                item.status == 2 ? h('span', { onClick: this.refundBySharer.bind(this, item), style: { color: 'rgb(247, 134, 28)',display: 'inline-block', padding:'0 0 0 20px',textDecoration:'underline',cursor:'pointer' } }, 
                '取消') : '', // 弹框- 说明
                // 收钱
                item.status == 3 ? h('span', { onClick: this.withdraw.bind(this, item), style: { color: 'rgb(247, 134, 28)',display: 'inline-block', padding:'0 0 0 20px',textDecoration:'underline',cursor:'pointer' } }, 
                '提现') : '',
                // 同意退款
                item.status == 5 ? h('span', { onClick: this.agree.bind(this, item), style: { color: 'rgb(247, 134, 28)',display: 'inline-block', padding:'0 0 0 20px',textDecoration:'underline',cursor:'pointer' } }, 
                '同意') : '',
                ]),
              h('div', {},[
                '分享的网站：',item.domain,
                '时间：',showtime(item.sendTime*1000),
              ]),
              h('div', {},[ 
                '费用：', item.price/1000000000000000000, '使用时长：', showUseTime(item.useSeconds)
              ]),
              h('div', {},[ 
                '留言：', 
                item.desp 
              ]),
            ])
          }) : null
        ]),
      ]) : null,
      h('h3.flex-center.text-transform-uppercase', {  style: { width: '100%', color: '#F7861C', background: '#EBEBEB', color: '#AEAEAE', marginTop: '10px', }}, [
        '可用账号列表',
      ]),
      // 使用过的账号列表
      h('ul',{ style: { width: '100%', } }, [
        usedAccountList.length ? usedAccountList.map((item, index) => {
          return h('li',{
            style:{
              borderBottom: '1px solid #ccc',
              position: 'relative',
              padding: '10px',
            },
            key: index
          }, [
            // 1.分享人的账户地址，2.针对的域名，3.cookie，4.时间戳1，5.时间戳2 , 6.留言，7.使用费用 8. 使用时长
            h('div', {style: { color: 'blue' }},[
              '账号状态：', // this.getUseStatus(item.status),
              h('span', { style: { color:'black',fontSize:'15px',fontWeight: '500',display:'inline-block',paddingLeft:'20px'}}, '操作:'),
              // 取消按钮
              item.status == 2 ? h('span', { onClick: this.refund.bind(this, item), style: { color: 'rgb(247, 134, 28)',display: 'inline-block', padding:'0 0 0 20px',textDecoration:'underline',cursor:'pointer' } }, 
              '申请退款') : '', // 弹框 金额 + 说明
              // 取消按钮
              (item.status == 3 || item.status == 4) ? h('span', { onClick: this.retractItem.bind(this, item), style: { color: 'rgb(247, 134, 28)',display: 'inline-block', padding:'0 0 0 20px',textDecoration:'underline',cursor:'pointer' } }, 
              '删除') : '',
              // 同意退款
              item.status == 5 ? h('span', { onClick: this.refund.bind(this, item), style: { color: 'rgb(247, 134, 28)',display: 'inline-block', padding:'0 0 0 20px',textDecoration:'underline',cursor:'pointer' } }, 
              '修改退款') : '', // 弹框 金额 + 说明
            ]),
            h('div', {},[
              '开始时间:',showtime(item.startTime),
              '|剩余时间:',countDown(item.startTime, item.useSeconds)
            ]),
            h('div', {},[
              '分享时间：',showtime(item.sendTime*1000),
            ]),
            h('div', {},[ 
              '费用：', item.price/1000000000000000000, '使用时长：', showUseTime(item.useSeconds)
            ]),
            h('div', {},[ 
              '留言：', 
              item.desp 
            ]),
          ])
        }) : null
      ]),
      // 可用账号列表
      h('ul',{style:{width: '100%', minHeight: '400px'}}, [
        accountList.length ? accountList.map((item, index) => {
          return h('li',{
            style:{
              borderBottom: '1px solid #ccc',
              position: 'relative',
              paddingTop: '10px',
              paddingBottom: '10px',
              paddingLeft: '10px',
              paddingRight: '80px',
            },
            key: index
          }, [
            // 1.分享人的账户地址，2.针对的域名，3.cookie，4.时间戳1，5.时间戳2 , 6.留言，7.使用费用 8. 使用时长
            h('div', {},[
              '时间：',showtime(item.sendTime*1000),
            ]),
            h('div', {},[ 
              '费用：', item.price/1000000000000000000, '使用时长：', showUseTime(item.useSeconds)
            ]),
            h('div', {},[ 
              '留言：', 
              item.desp 
            ]),
            h('button.primary', {
              onClick: this.useCookie.bind(this, item),
              style: {
                padding: 0,
                textTransform: 'uppercase',
                width: '60px',
                height: '30px',
                lineHeight: '30px',
                position: 'absolute',
                right: '10px',
                top: '20px',
                fontSize: '14px',
              },
            }, '使用'),
          ])
        }) : null
      ]),
    ])
  )
}
// 生命周期函数
ShareDetailScreen.prototype.componentDidMount =function () {
  // 初始化 state数据
  console.log('初始化列表', mokeList)
  this.setState({
    showShare: false, // 是否显示分享账号的内容
    cookies: '',
    accountList: [], // 别人分享的列表
    shareAccountList: [], // 自己分享的账号列表
    usedAccountList:[], // 使用过的账号列表
    currentDomain: '',
    shareMark: '', // 备注
    cost: -1, // 费用
    useTime: -1 // 使用时长
  })
  // 获取当前的域名,显示 + 获取当前域名下的使用列表
  chrome.tabs.getSelected(null, function (tab) {
    var domain = getRootDomain(tab.url);
    // 设置cookie
    getCookie(domain)
    _this.setState({
      'currentDomain': domain
    },)
  });
  let _this = this
  // 开启IM 通讯
  this.connection = new Strophe.Connection('http://im.zhiparts.com:5280/bosh')
  this.toConnection()
  // 定时刷新使用账号的列表
  this.myInterval=setInterval(() => {
    if (_this.state.usedAccountList && _this.state.usedAccountList.length>0) {
      _this.setState({
        usedAccountList: Object.assign([], _this.state.usedAccountList)
      })
    }
  }, 1000)
  // 获取当前cookie的函数
  function getCookie(domain){	
		var details = {
			domain: domain
		};
		var filteredCookies = [];
		chrome.cookies.getAll(details, function(cks){
      var currentC;
      for(var i=0; i<cks.length; i++) {
        currentC = cks[i];
        delete currentC.expirationDate;               
        filteredCookies.push(currentC);
      }
      let cookies = myJsonStringify(filteredCookies, domain);
      _this.setState({
        cookies: cookies
      })
    })
  }
}
// 生命周期组件卸载前的操作
ShareDetailScreen.prototype.componentWillUnmount=function() {
  clearInterval(this.myInterval)
}
/**
 * 页面主要操作
*/
// 分享账号操作
ShareDetailScreen.prototype.onSubmit = function () {
  console.log(this.state)
  const state = this.state
  console.log(state)
  // 分享校验项
  let message
  if (!state.currentDomain) {
    message = '本系统暂不支持，该网站的账号分享'
    return this.props.dispatch(actions.displayWarning(message))
  }
  if (!state.cookies) {
    message = '获取账号失败，当前账号不能分享'
    return this.props.dispatch(actions.displayWarning(message))
  }
  if (state.cost < 0) {
    message = '请填写使用费用'
    return this.props.dispatch(actions.displayWarning(message))
  }
  if (state.useTime < 0) {
    message = '请填写使用时长'
    return this.props.dispatch(actions.displayWarning(message))
  }
  let shareMark = this.refs.shareMark.state.value
  if (!shareMark) {
    message = '请填写分享备注'
    return this.props.dispatch(actions.displayWarning(message))
  }
  // 发送只能合约
  var txParams = {
    from: this.props.address,
    to: '0x04cac7d033182de0d702dd24b95471d0f8070ad4',
    value: '0x0', // + value.toString(16),
  }
  var d1 = new Date();
  var timesStamp = parseInt(d1.getTime()/1000);
  var expireTimeStamp = timesStamp + 3600*12;
  var costWei = util.normalizeEthStringToWei(state.cost);
  var useSecond = parseInt(state.useTime) *3600;
  console.log('发送的数据', state.currentDomain, state.cookies, timesStamp, expireTimeStamp, costWei, useSecond, shareMark)
  // 账号信息用来存入localstorage
  let accountDetail = {
    status: 0,
    timesStamp: timesStamp,
    costWei: costWei,
    useSecond: useSecond,
    shareMark: shareMark
  }
  //function share(string domain, string cookie, uint timeStamp , uint expireTimeStamp, uint price, uint useSeconds, string desp)
  txParams.data = this.encodeMothed(state.currentDomain, state.cookies, timesStamp, expireTimeStamp, costWei, useSecond, shareMark)
  console.log('签名之前的数据 ', txParams.data)
  this.props.dispatch(actions.signTx(txParams))
}

// 使用账号的操作
ShareDetailScreen.prototype.useCookie = function (item,e) {
  // 发送只能合约
  let value = parseInt(item.price);
  let txParams = {
    from: this.props.address,
    to: '0x04cac7d033182de0d702dd24b95471d0f8070ad4',
    value: '0x' + value.toString(16),
  }
  var d1 = new Date();
  let beginTime = parseInt(d1.getTime()/1000);
  let endTime = beginTime + 3600*1
  console.log('zgl 使用的账号信息', item)
  txParams.data = this.encodeMothed2(item.id,beginTime,endTime)
  this.props.dispatch(actions.signTx(txParams))
  // 使用cookie的函数
  var domain = item.domain;
  var cookie = item.cookie;
  var ext = chrome.extension.getBackgroundPage();
  var cookieJsonArray = myJsonParse(cookie, domain);
  for(var i = 0; i<cookieJsonArray.length; i++){					
    var setDetails = cookieJsonArray[i];
    var thisdomain = setDetails['domain'];
    if(thisdomain.indexOf(this.state.currentDomain) < 0 ){//不是当前域的
      continue;
    }
    var cookie = CookieHelper.cookieForCreationFromFullCookie(setDetails);
    chrome.cookies.set(cookie);
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.reload(tabs[0].id, function(){})
    });
  }
}

// 使用者在使用结束前提出退钱 ; 使用者修改自己的退钱明细
ShareDetailScreen.prototype.refund = function (item,e) {
  let txParams = {
    from: this.props.address,
    to: '0x04cac7d033182de0d702dd24b95471d0f8070ad4',
  }
  var d1 = new Date();
  let beginTime = parseInt(d1.getTime()/1000);
  txParams.data = this.encodeMothedReassign(item.id, beginTime, 100, "aaaaaa");
  console.log(txParams)
  this.props.dispatch(actions.signTx(txParams))
}

// 分享者在使用结束前提出退全部的钱	（这个时候输入的money无用，只能退全部）	
ShareDetailScreen.prototype.refundBySharer = function (item,e) {
  let txParams = {
    from: this.props.address,
    to: '0x04cac7d033182de0d702dd24b95471d0f8070ad4',
  }
  var d1 = new Date();
  let beginTime = parseInt(d1.getTime()/1000);
  txParams.data = this.encodeMothedReassign(item.id, beginTime, 0, "aaaaaa");
  console.log(txParams)
  this.props.dispatch(actions.signTx(txParams))
}

// 分享者在使用结束后提钱	（可以给使用者留点）
ShareDetailScreen.prototype.withdraw = function (item,e) {
  let txParams = {
    from: this.props.address,
    to: '0x04cac7d033182de0d702dd24b95471d0f8070ad4',
  }
  var d1 = new Date();
  let beginTime = parseInt(d1.getTime()/1000);
  txParams.data = this.encodeMothedReassign(item.id, beginTime, 100, "aaaaaa");
  console.log(txParams)
  this.props.dispatch(actions.signTx(txParams))
}

// 分享者同意使用者退钱, 这个时候输入的money与desp 无用
ShareDetailScreen.prototype.agree = function (item,e) {
  let txParams = {
    from: this.props.address,
    to: '0x04cac7d033182de0d702dd24b95471d0f8070ad4',
  }
  var d1 = new Date();
  let beginTime = parseInt(d1.getTime()/1000);
  txParams.data = this.encodeMothedReassign(item.id, beginTime, 0, "");
  console.log(txParams)
  this.props.dispatch(actions.signTx(txParams))

}

// 删除列表项目
ShareDetailScreen.prototype.retractItem = function (nodeId, itemId) {
  log('retractItem:' + nodeId + "  " + itemId);
  var item = Strophe.xmlElement('item', {id: itemId},'');
  var retract = Strophe.xmlElement('retract', {node:nodeId},'');
  var iqId = 'iq_retract_item_' + itemId;
  var iq_pubsub = $iq({to: 'pubsub.im.zhiparts.com', type:'set', id:iqId}).cnode(Strophe.xmlElement('pubsub', {xmlns:'http://jabber.org/protocol/pubsub'} , '')).cnode(retract).cnode(item);
  this.connection.send(iq_pubsub.tree());
}

//
// IM 初始化建立连接的函数
//

// 建立连接并登陆
ShareDetailScreen.prototype.toConnection = function () {
  this.connection.connect(this.props.address + '@im.zhiparts.com', '11231231',onConnect.bind(this));
}
// 连接成功的回调
function onConnect(status){
  console.log('zgl 即时通讯的状态', Strophe.Status, status)
  if (status == Strophe.Status.CONNECTING) {
	  console.log('zgl 通讯状态','Strophe is connecting.');
  } else if (status == Strophe.Status.CONNFAIL) {
    console.log('zgl 通讯状态','Strophe failed to connect.');
  } else if (status == Strophe.Status.DISCONNECTING) {
	  console.log('zgl 通讯状态','Strophe is disconnecting.');
  } else if (status == Strophe.Status.DISCONNECTED) {
	  console.log('zgl 通讯状态','Strophe is disconnected.');
    imTryTime = imTryTime +1;
    setTimeout(this.toConnection.bind(this), 100);
  } else if (status == Strophe.Status.CONNECTED) {
    imTryTime = 0;
    console.log('zgl 通讯状态','Strophe is connected.', 'jid', this.connection.jid)
    this.connection.addHandler(this.onMessage.bind(this), null, 'message', null, null,  null); 
    this.connection.addHandler(this.onIq.bind(this), null, 'iq', null , null,  'pubsub.im.zhiparts.com');
    this.connection.send($pres().tree());//this must be open, or can't receive message
    if(this.state.currentDomain != ''){
      var packet = buildFetchXmppPacket('shareMask_' + this.state.currentDomain, 10);
      this.connection.send(packet.tree());
      var packetSharer = buildFetchXmppPacket('shareMask_sharer_'+ this.props.address, 10);
      this.connection.send(packetSharer.tree());
      var subPacket = buildSubscribeXmppPacket('shareMask_' + this.state.currentDomain, this.props.address + '@im.zhiparts.com');
      this.connection.send(subPacket.tree());
      var subPacketSharer = buildSubscribeXmppPacket('shareMask_sharer_'+ this.props.address, this.props.address + '@im.zhiparts.com');
      this.connection.send(subPacketSharer.tree());
      // wait
      if(true){ //如果我有在使用账号
        var packetUser = buildFetchXmppPacket('shareMask_user_'+ this.props.address, 10);
        this.connection.send(packetUser.tree());
        var subPacketUser = buildSubscribeXmppPacket('shareMask_user_'+ this.props.address, this.props.address + '@im.zhiparts.com');
        this.connection.send(subPacketUser.tree());
      }
    }

  }
}

// 监听获取初始化的3个账号列表
ShareDetailScreen.prototype.onIq = function (iq) {
  try{
    var from = iq.getAttribute('from');
    var type = iq.getAttribute('type');
    var pubsubs = iq.getElementsByTagName('pubsub');
    console.log(pubsubs);
    if(pubsubs.length>0){
      var items = pubsubs[0].getElementsByTagName('items');
      var itemlist = items[0].getElementsByTagName('item');

      var NodeId = items[0].getAttribute('node');
      var domainNodeId = 'shareMask_' + this.state.currentDomain;
      var myShareNodeId = 'shareMask_sharer_' + this.props.address;
      var myUseNodeId = 'shareMask_user_' + this.props.address;
      console.log(items, itemlist.length);
      var accountList = new Array();
      for(var i=0; i<itemlist.length; i++){
        var entry = itemlist[i].getElementsByTagName("entry");
        var summary = entry[0].getElementsByTagName("summary");
        var se = Strophe.getText(summary[0]);
        var se2 = Strophe.xmlunescape(se);
        accountList.push(JSON.parse(se2));
      }
      if(NodeId == domainNodeId){
        console.log('zgl 获取到了可用账号列表', accountList)
        this.setState({
          accountList: accountList
        })
      }
      if(NodeId == myShareNodeId){
        console.log('zgl 获取到了我分享的账号列表', accountList)
        this.setState({
          shareAccountList: accountListFilter( accountList )
        })
      }

      if(NodeId == myUseNodeId){
        console.log('zgl 获取到了我使用的账号列表', accountList)
        onUseAccountList.bind(this)(items);
        // this.setState({
        //   useAccountList: accountListFilter( accountList )
        // })
      }
    }
  } catch(err){
    console.log(err)
  }
  return true;
}

// 监听普通消息的函数 --1.3个列表消息的增删改
ShareDetailScreen.prototype.onMessage = function (msg) {
  console.log('zgl 收到消息了', msg)
  try{
    var from = msg.getAttribute('from');
    var type = msg.getAttribute('type');
    var events = msg.getElementsByTagName('event');
  
    if (from == "pubsub.im.zhiparts.com" && events.length > 0) {
      var items = events[0].getElementsByTagName('items');
  
      var NodeId = items[0].getAttribute('node');
      var domainNodeId = 'shareMask_' + this.state.currentDomain;
      var myShareNodeId = 'shareMask_sharer_' + this.props.address;
      var myUseNodeId = 'shareMask_user_' + this.props.address;
      if(NodeId == domainNodeId){
        console.log('zgl 收到了可用列表的消息')
        onAccountList.bind(this)(items);
      }
      if(NodeId == myShareNodeId){
        console.log('zgl 收到了分享列表的消息')
        onShareAccountList.bind(this)(items);
      }
      if(NodeId == myUseNodeId){
        console.log('zlg 收到了使用列表的消息')
        onUseAccountList.bind(this)(items);
      }
    }
  } catch(err){
    console.error(err)
  }

  return true;
}

/**
 * 基本不会变的函数与工具函数
**/

// 可用列表的处理: 添加 删除
function onAccountList (items){
  var itemlist = items[0].getElementsByTagName('item');
  var retractlist = items[0].getElementsByTagName('retract');
  // add 
  if (itemlist && itemlist.length > 0) {
    let addArr = []
    for(let i=0; i<itemlist.length; i++){
      var entry = itemlist[i].getElementsByTagName("entry");
      var summary = entry[0].getElementsByTagName("summary");
      var se = Strophe.getText(summary[0]);
      var se2 = Strophe.xmlunescape(se);
      //se2 is add share
      addArr.push(JSON.parse(se2))
    }
    // 如果id已经存在则不再增加
    let oldList = Object.assign([], this.state.accountList)
    for (let m=0; m < oldList.length; m++) {
      let oldId = oldList[m].id
      for (let n=0; n < addArr.length; n++) {
        if (oldId == addArr[n].id) {
          addArr.splice(n, 1)
          break
        }
      }
    }
    this.setState({
      accountList: addArr.concat(this.state.accountList)
    })
  }
  // delete
  if (retractlist && retractlist.length > 0) {
    let delArr = []
    let accountList = Object.assign([], this.state.accountList)
    for(let i=0; i<retractlist.length; i++){
      var id = retractlist[i].getAttribute("id");
      //id is the delete share
      for (let j = 0; j < accountList.length; j++) {
        if (id  == accountList[j].id) {
          accountList.splice(j, 1)
          break
        }
      }
    }
    this.setState({
      accountList: accountList
    })
  }  
}

// 分享列表的处理: 添加 删除
function onShareAccountList (items, type){
  var itemlist = items[0].getElementsByTagName('item');
  var retractlist = items[0].getElementsByTagName('retract');
  // add 
  if (itemlist && itemlist.length > 0) {
    let addArr = []
    for(let i=0; i<itemlist.length; i++){
      var entry = itemlist[i].getElementsByTagName("entry");
      var summary = entry[0].getElementsByTagName("summary");
      var se = Strophe.getText(summary[0]);
      var se2 = Strophe.xmlunescape(se);
      //se2 is add share
      addArr.push(JSON.parse(se2))
    }
    // 如果id已经存在则替换，不存在则增加
    let oldList = Object.assign([], this.state.shareAccountList)
    for (let m=0; m < oldList.length; m++) {
      let oldId = oldList[m].id
      for (let n=0; n < addArr.length; n++) {
        if (oldId == addArr[n].id) {
          oldList.splice(m, 1, addArr[n])
          addArr.splice(n, 1)
          break
        }
      }
    }
    console.log('修改了我分享的列表', addArr, oldList)
    this.setState({
      shareAccountList: accountListFilter( addArr.concat(oldList) )
    })
  }
  // delete
  if (retractlist && retractlist.length > 0) {
    let delArr = []
    let accountList = Object.assign([], this.state.shareAccountList)
    for(let i=0; i<retractlist.length; i++){
      var id = retractlist[i].getAttribute("id");
      //id is the delete share
      for (let j = 0; j < accountList.length; j++) {
        if (id  == accountList[j].id) {
          accountList.splice(j, 1)
          break
        }
      }
    }
    console.log('删除了我分享的列表')
    this.setState({
      shareAccountList: accountListFilter( shareAccountList )
    })
  } 
}

// 使用列表的处理: 添加 覆盖
function onUseAccountList (items, type){
  var itemlist = items[0].getElementsByTagName('item');
  var retractlist = items[0].getElementsByTagName('retract');
  // add 与 更新
  if (itemlist && itemlist.length > 0) {
    let addArr = []
    for(let i=0; i<itemlist.length; i++){
      var entry = itemlist[i].getElementsByTagName("entry");
      var summary = entry[0].getElementsByTagName("summary");
      var se = Strophe.getText(summary[0]);
      var se2 = Strophe.xmlunescape(se);
      //se2 is add share
      addArr.push(JSON.parse(se2))
    }
    // 如果id已经存在则替换，不存在则增加
    let oldList = Object.assign([], this.state.useAccountList)
    for (let m=0; m < oldList.length; m++) {
      let oldId = oldList[m].id
      for (let n=0; n < addArr.length; n++) {
        if (oldId == addArr[n].id) {
          oldList.splice(m, 1, addArr[n])
          addArr.splice(n, 1)
          break
        }
      }
    }
    console.log('修改了我使用的列表', addArr, oldList)
    // editUsedAccountList('set', accountListFilter( addArr.concat(oldList) ))
    this.setState({
      useAccountList: accountListFilter( addArr.concat(oldList) )
    })
  }
  // delete
  if (retractlist && retractlist.length > 0) {
    let delArr = []
    let accountList = Object.assign([], this.state.useAccountList)
    for(let i=0; i<retractlist.length; i++){
      var id = retractlist[i].getAttribute("id");
      //id is the delete share
      for (let j = 0; j < accountList.length; j++) {
        if (id  == accountList[j].id) {
          accountList.splice(j, 1)
          break
        }
      }
    }
    console.log('删除了我使用的列表')
    editUsedAccountList('set',accountListFilter( useAccountList ))
    this.setState({
      useAccountList: accountListFilter( useAccountList )
    })
  } 
}

// accountList set 之前都要走的 过滤的filter函数
function accountListFilter (list) {
  let arr = deepClone(list)
  for (let i = 0;i < arr.length; i++) {
    arr[i].status = getItemStatus(arr[i])
  }
  console.log(arr)
  return arr
}

// deepclone 函数
function deepClone (obj) {
  var _tmp,result;
  _tmp = JSON.stringify(obj);
  result = JSON.parse(_tmp);
  return result;
}

// 的账号的状态
// 四种情况：未使用、使用中、申请退款、结束
// 1.未被使用2.使用中未超时3.使用中已超时4.结束5.用户申请退款6.要求用户付款
function getItemStatus (item) {
  let now = new Date().getTime()
  if (!item.use || !item.use.user) {
    return 1// '账号未被使用'
  } 
  let usedTime = now - item.use.useTime
  // 使用中分两种情况
  if (!item.reassign) {
    if (usedTime > item.useSeconds*1000) {
      return 3// '使用中(已超时)'
    } else {
      return 2// '使用中(未超时)'
    }
  // 申请退款与结束
  } else {
    if (item.reassign.agreeSharer == 1 && item.reassign.agreeUser == 1) {
      return 4// '使用结束'
    } else if(item.reassign.agreeSharer == 0) {
      return 5// '用户要求退款'
    }
  }
}

// 分享列表 账号状态的对应文字
function shareListShowStatus(status) {
  let txt = ''
  switch (status) {
    case 1:
      txt = '账号未被使用'
      break
    case 2, 3:
      txt = '账号正在使用中'
      break
    case 4:
      txt = '使用结束'
      break
    case 5:
      txt = '用户请求退款'
      break
  }
  return txt
}

// 使用列表 账号状态对应的文字
function useListShowStatus(status) {
  let txt = ''
  switch (status) {
    case 1:
      txt = '账号未被使用'
      break
    case 2, 3:
      txt = '账号正在使用中'
      break
    case 4:
      txt = '使用结束'
      break
    case 5:
      txt = '用户请求退款'
      break
  }
}

// 表单绑定函数---费用
ShareDetailScreen.prototype.handleCost = function (event) {
  this.setState({
    cost: event.target.value
  })
}
// 表单绑定函数----使用时长
ShareDetailScreen.prototype.handleUseTime = function (event) {
  this.setState({
    useTime: event.target.value
  })
}
// 表单绑定函数----备注
ShareDetailScreen.prototype.handleShareMark = function (event) {
  this.setState({
    shareMark: event.target.value
  })
}
// 打开关闭分享区域
ShareDetailScreen.prototype.changeShareShow = function () {
  this.setState({
    showShare: !this.state.showShare
  })
  return true;
}

// 分享时的data加密
ShareDetailScreen.prototype.encodeMothed = function (domain, cookies, timesStamp, expireTimeStamp, cost, useSecond,  desp) {

  var abit = 	{
		"constant": false,
		"inputs": [
			{
				"name": "domain",
				"type": "string"
			},
			{
				"name": "cookie",
				"type": "string"
			},
			{
				"name": "timeStamp",
				"type": "uint256"
			},
			{
				"name": "expireTimeStamp",
				"type": "uint256"
			},
			{
				"name": "price",
				"type": "uint256"
			},
			{
				"name": "useSeconds",
				"type": "uint256"
			},
			{
				"name": "desp",
				"type": "string"
			}
		],
		"name": "share",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	};
  var setInputBytecode = EthAbi.encodeMethod(abit, [domain, cookies, timesStamp, expireTimeStamp, cost, useSecond, desp]);
  return setInputBytecode;
};

// 使用时的data加密
ShareDetailScreen.prototype.encodeMothed2 = function (shareId, timeS_begin, timeS_end) {

  var abit = 	{
    "constant": false,
    "inputs": [
      {
        "name": "shareId",
        "type": "uint256"
      },
      {
        "name": "timeStamp",
        "type": "uint256"
      },
      {
        "name": "endTimeStamp",
        "type": "uint256"
      }
    ],
    "name": "use",
    "outputs": [],
    "payable": true,
    "stateMutability": "payable",
    "type": "function"
  };
  var setInputBytecode = EthAbi.encodeMethod(abit, [shareId, timeS_begin, timeS_end]);
  return setInputBytecode;
};

// 使用时的data加密
ShareDetailScreen.prototype.encodeMothedReassign = function (shareId, timeStamp , money, desp) {

  var abit = {
      "constant": false,
      "inputs": [
        {
                "name": "shareId",
                "type": "uint256"
        },
        {
                "name": "timeStamp",
                "type": "uint256"
        },
        {
                "name": "money",
                "type": "uint256"
        },
        {
                "name": "desp",
                "type": "string"
        }
      ],
      "name": "postReassign",
      "outputs": [],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
  };
  var setInputBytecode = EthAbi.encodeMethod(abit, [shareId, timeStamp, money, desp]);
  return setInputBytecode;
};

// 解析域名的函数
function getRootDomain(weburl){ 
  if(weburl.indexOf("http")!=0){
    return "";
  }
  var reg = /^http(s)?:\/\/(.*?)\//; 
  var domain = reg.exec(weburl)[2];
  var domainArr = domain.split(".");
  if(domain.indexOf("com.cn")>0){
    domain =  domainArr[domainArr.length-3] + "." + domainArr[domainArr.length-2] + "." + domainArr[domainArr.length-1];
  }else{
    domain =  domainArr[domainArr.length-2] + "." + domainArr[domainArr.length-1];
  }
  return domain;
}

// 加密cookie 的函数
function myJsonStringify(filteredCookies, root_domain){

  var myfilteredCookies = [];
  for(var i=0; i<filteredCookies.length; i++) {
    var currentC = filteredCookies[i];
    var hostOnly = currentC['hostOnly'] ?  '1' : '0';
    var httpOnly = currentC['httpOnly'] ?  '1' : '0';
    var secure = currentC['secure'] ?  '1' : '0';
    var session = currentC['session'] ?  '1' : '0';
    var path = currentC['path']=="/" ?  '1' : '0';
    var storeId = currentC['storeId']=="0" ?  '1' : '0';
    var domain = currentC['domain']== root_domain ? '1' : ( currentC['domain']== ("." + root_domain) ? '2' : (currentC['domain']== ("www." + root_domain) ? '3' : currentC['domain']));
    
    delete currentC.expirationDate;
    delete currentC.hostOnly;
    delete currentC.httpOnly;		
    delete currentC.secure;
    delete currentC.session; 
    delete currentC.domain; 
    if(path == '1') {	delete currentC.path;}
    if(storeId ==  '1') { delete currentC.storeId;}
    if(domain.length == 1) { delete currentC.domain;}
    
    var combo = hostOnly + httpOnly + secure + session + path + storeId + domain;
    
    currentC["a"] = combo;
    var name = currentC["name"];
    var value = currentC["value"];
    delete currentC.name;
    delete currentC.value; 
    currentC["b"] = name;
    currentC["c"] = value;
    myfilteredCookies.push(currentC);

  }
  
  return JSON.stringify(myfilteredCookies);
}

// 解密cookie 的函数
function myJsonParse(jsonStr2, root_domain){
		
  var  filteredCookies = JSON.parse(jsonStr2);
  
  var myfilteredCookies = [];
  for(var i=0; i<filteredCookies.length; i++) {
    var currentC = filteredCookies[i];
    var combo = currentC["a"];
    var name = currentC["b"];
    var value = currentC["c"];
    delete currentC.a;
    delete currentC.b;
    delete currentC.c;
    
    currentC["name"] = name;
    currentC["value"] = value;
    
    var hostOnly = combo.substring(0,1)=='1' ?  true : false;
    var httpOnly = combo.substring(1,2)=='1' ?  true : false;
    var secure = combo.substring(2,3)=='1' ?  true : false;
    var session = combo.substring(3,4)=='1' ?  true : false;
    currentC["hostOnly"] = hostOnly;
    currentC["httpOnly"] = httpOnly;
    currentC["secure"] = secure;
    currentC["session"] = session;
    
    if(combo.substring(4,5)=='1') {currentC["path"] = "/"};
    if(combo.substring(5,6)=='1') {currentC["storeId"] = "0"};
    
    var domain = combo.substring(6,combo.length);
    domain = domain == '1' ? root_domain : domain;
    domain = domain == '2' ? "." + root_domain : domain;
    domain = domain == '3' ? "www." + root_domain : domain;
    currentC["domain"] = domain;
    myfilteredCookies.push(currentC);
  }
  
  return myfilteredCookies;
}

// 倒计时函数
function countDown (start, len) {
  let canUse = len
  let now = new Date().getTime()
  let usedTime = (now -start) / 1000
  if (usedTime >= canUse) return '0分钟'
  let lastTime = canUse - usedTime
  let hour,minit,second
  hour = Math.floor(lastTime/3600)
  minit = Math.floor((lastTime%3600)/60)
  second = Math.floor((lastTime%3600)%60)
  return hour + '时' + minit + '分' + second + '秒'
}

//  生成一个获取用户分享的账户的xmpp 请求包
function buildFetchXmppPacket(nodeId, count){
  //<iq type='get'
  //    to='pubsub.im.zhiparts.com'
  //    id='items1'>
  //  <pubsub xmlns='http://jabber.org/protocol/pubsub'>
  //    <items node='shareMask_xunleicun.cc'  max_items='10'/>
  //  </pubsub>
  //</iq>
  var d1 = new Date();
  var timeS = parseInt(d1.getTime()/1000).toString();
  var countStr = count.toString();
  var item = Strophe.xmlElement('items', {node:nodeId, max_items:countStr},'');
  var iq_pubsub = $iq({to: 'pubsub.im.zhiparts.com', type:'get', id:timeS}).cnode(Strophe.xmlElement('pubsub', {xmlns:'http://jabber.org/protocol/pubsub'} , '')).cnode(item);

  return iq_pubsub;
}

//  生成一个获取用户分享的账户的xmpp 请求包
function buildSubscribeXmppPacket(nodeId, sjid){
  var d1 = new Date();
  var timeS = parseInt(d1.getTime()/1000).toString();
  //var sjid = connection.jid;
  var subscribe = Strophe.xmlElement('subscribe', {node:nodeId, jid:sjid},'');
  var iq_pubsub = $iq({to: 'pubsub.im.zhiparts.com', type:'set', id:timeS}).cnode(Strophe.xmlElement('pubsub', {xmlns:'http://jabber.org/protocol/pubsub'} , '')).cnode(subscribe);
  return iq_pubsub;
}
// 格式化日期的函数
function showtime (myDate) {
  var now = new Date();
  myDate = new Date(myDate)
  var year = myDate.getFullYear();
  var month = myDate.getMonth();
  var day = myDate.getDate(); 
  
  var timeValue = now.getFullYear() == year ? " " : year ;
  timeValue += (now.getMonth() == month && now.getDate() == day) ? "今天" : (month + 1 + "月" + day + "日");
  
  
  
  var hours = myDate.getHours();
  var minutes = myDate.getMinutes();
  var seconds = myDate.getSeconds();
  timeValue += "" +((hours >= 12) ? "下午 " : "上午 " );
  timeValue += ((hours >12) ? hours -12 :hours);
  timeValue += ((minutes < 10) ? ":0" : ":") + minutes;
  timeValue += ((seconds < 10) ? ":0" : ":") + seconds;
  return timeValue;
}

function showUseTime(seconds){
  var res = (seconds%3600)/60;
  var hour = (seconds- seconds%3600)/3600;
  return hour + "小时" + res + "分钟";
}
