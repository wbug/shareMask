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

//  生成一个获取用户分享的账户的xmpp 请求包
function buildFetchXmppPacket(domain, count){
  //<iq type='get'
  //    to='pubsub.im.zhiparts.com'
  //    id='items1'>
  //  <pubsub xmlns='http://jabber.org/protocol/pubsub'>
  //    <items node='shareMask_xunleicun.cc'  max_items='10'/>
  //  </pubsub>
  //</iq>
  var d1 = new Date();
  var timeS = parseInt(d1.getTime()/1000).toString();
  var nodeId = 'shareMask_' + domain;
  var countStr = count.toString();
  var item = Strophe.xmlElement('items', {node:nodeId, max_items:countStr},'');
  var iq_pubsub = $iq({to: 'pubsub.im.zhiparts.com', type:'get', id:timeS}).cnode(Strophe.xmlElement('pubsub', {xmlns:'http://jabber.org/protocol/pubsub'} , '')).cnode(item);

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
  // 免费时长
  let freeTime = ''
  if (this.state && this.state.freeTime) {
    freeTime = this.state.freeTime
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
          // // back button
          // h('i.fa.fa-arrow-left.fa-lg.cursor-pointer.color-orange', {
          //   onClick: this.back.bind(this),
          // }),

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
      props.error && h('span.error.flex-center',{ style: { width: '100%' } }, '!!!' + props.error),
      // 是否显示分享 区域，默认隐藏
      showShare ? h('section', {
        style: {
          width: '100%'
        }
      },[
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
            h('option', { value: 0 }, '免费使用'),
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
          }, '免费时间:'),
          h('select.large-input', {
            name: 'amount',
            placeholder: '免费时间',
            type: 'text',
            value: freeTime,
            onChange: this.handleFreeTime.bind(this),
            style: {
              width: '25%',
            }
          }, [
            h('option', { value: -1 }, '请选择时间'),
            h('option', { value: 0 }, '0 分钟'),
            h('option', { value: 1 }, '1 分钟'),
            h('option', { value: 5 }, '5 分钟'),
            h('option', { value: 10 }, '10 分钟'),
            h('option', { value: 10 }, '15 分钟'),
          ]),
        ]),
        h('section.flex-row.flex-center', [
          // h('input.large-input', {
          //   name: 'amount',
          //   placeholder: '分享备注',
          //   type: 'text',
          //   value: shareMark,
          //   onChange: this.handleShareMark.bind(this),
          //   style: {
          //     width: '70%',
          //   }
          // }),
          h(Conbo, {
            ref: 'shareMark',
            list: [1,2,3],
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
        ])
      ]) : null,
      h('h3.flex-center.text-transform-uppercase', {
        style: {
          width: '100%',
          color: '#F7861C',
          background: '#EBEBEB',
          color: '#AEAEAE',
          marginTop: '10px',
        },
      }, [
        '可用账号列表',
      ]),
      // 列表内容
      h('ul',{
        style: {
          width: '100%',
        }
      }, [
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
            // 1.分享人的账户地址，2.针对的域名，3.cookie，4.时间戳1，5.时间戳2 , 6.留言，7.使用费用 8. 免费时长
            h('div', {},[
              '时间：',showtime(item[3]*1000),
            ]),
            h('div', {},[ 
              '费用：', item[6],'免费时长：', item[7]
            ]),
            h('div', {},[ 
              '留言：', 
              item[5] 
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
    accountList: [],
    currentDomain: '',
    shareMark: '', // 备注
    cost: -1, // 费用
    freeTime: -1 // 免费时长
  })
  let _this = this
  // 开启IM 通讯
  this.connection = new Strophe.Connection('http://im.zhiparts.com:5280/bosh')
  this.toConnection()
  // 获取当前cookie的函数
  function shareCookie(domain){	
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
  // 获取当前的域名 并 显示
  chrome.tabs.getSelected(null, function (tab) {
    var domain = getRootDomain(tab.url);
    shareCookie(domain)
    _this.setState({
      'currentDomain': domain
    })
  });
}
// 表单绑定函数---费用
ShareDetailScreen.prototype.handleCost = function (event) {
  this.setState({
    cost: event.target.value
  })
}
// 表单绑定函数----免费时长
ShareDetailScreen.prototype.handleFreeTime = function (event) {
  this.setState({
    freeTime: event.target.value
  })
}
// 表单绑定函数----备注
ShareDetailScreen.prototype.handleShareMark = function (event) {
  this.setState({
    shareMark: event.target.value
  })
}

ShareDetailScreen.prototype.navigateToAccounts = function (event) {
  event.stopPropagation()
  this.props.dispatch(actions.showAccountsPage())
}

ShareDetailScreen.prototype.back = function () {
  var address = this.props.address
  this.props.dispatch(actions.backToAccountDetail(address))
}

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
  if (state.freeTime < 0) {
    message = '请填写免费时间'
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
    to: '0xb806e726aaadda30f5c8f87a9c4fe63490e9f4e6',
    value: '0x0', // + value.toString(16),
  }
  var d1 = new Date();
  var timesStamp = parseInt(d1.getTime()/1000);
  var expireTimeStamp = timesStamp + 3600*12;
  var costWei = util.normalizeEthStringToWei(state.cost);
  var freeSecond = parseInt(state.freeTime) * 60;
  console.log('发送的数据', state.currentDomain, state.cookies, timesStamp, expireTimeStamp, costWei, freeSecond, shareMark)
  //function share(string domain, string cookie, uint timeStamp , uint expireTimeStamp, uint price, uint freeSeconds, string desp)
  txParams.data = this.encodeMothed(state.currentDomain, state.cookies, timesStamp, expireTimeStamp, costWei, freeSecond, shareMark)
  console.log('签名之前的数据 ', txParams.data)
  this.props.dispatch(actions.signTx(txParams))
}
// 分享时的data加密
ShareDetailScreen.prototype.encodeMothed = function (domain, cookies, timesStamp, expireTimeStamp, cost, freeSecond,  desp) {

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
				"name": "freeSeconds",
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
  var setInputBytecode = EthAbi.encodeMethod(abit, [domain, cookies, timesStamp, expireTimeStamp, cost, freeSecond, desp]);
  return setInputBytecode;
};

// 使用cookie 
ShareDetailScreen.prototype.useCookie = function (item,e) {
  // 发送只能合约
  let value = util.normalizeEthStringToWei(item[6])
  let txParams = {
    from: this.props.address,
    to: '0xb806e726aaadda30f5c8f87a9c4fe63490e9f4e6',
    value: '0x' + value.toString(16),
  }
  var d1 = new Date();
  let beginTime = parseInt(d1.getTime()/1000);
  let endTime = beginTime + 3600*1
  console.log(txParams)
  txParams.data = this.encodeMothed2(item[7],beginTime,endTime)
  this.props.dispatch(actions.signTx(txParams))
  // 使用cookie的函数
  var domain = item[1];
  var cookie = item[2];
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
// 打开关闭分享区域
ShareDetailScreen.prototype.changeShareShow = function () {
  this.setState({
    showShare: !this.state.showShare
  })
  return true;
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
	  console.log('zgl 即时通讯','Strophe is connecting.');
  } else if (status == Strophe.Status.CONNFAIL) {
	  console.log('zgl 即时通讯','Strophe failed to connect.');
	  $('#connect').get(0).value = 'connect';
  } else if (status == Strophe.Status.DISCONNECTING) {
	  console.log('zgl 即时通讯','Strophe is disconnecting.');
  } else if (status == Strophe.Status.DISCONNECTED) {
	  console.log('zgl 即时通讯','Strophe is disconnected.');
	  $('#connect').get(0).value = 'connect';
    imTryTime = imTryTime +1;
    setTimeout(this.toConnection, 5000*imTryTime );
  } else if (status == Strophe.Status.CONNECTED) {
    imTryTime = 0;
    console.log('zgl 即时通讯','Strophe is connected.', 'jid', this.connection.jid)
    this.connection.addHandler(this.onMessage.bind(this), null, 'message', null, null,  null); 
    this.connection.addHandler(this.onIq.bind(this), null, 'iq', null , null,  'pubsub.im.zhiparts.com');
    // this.connection.send($pres().tree());
    if(this.state.currentDomain != ''){
      var packet = buildFetchXmppPacket(this.state.currentDomain, 10);
      this.connection.send(packet.tree());
    }

  }
}
// 监听普通消息的函数
ShareDetailScreen.prototype.onMessage = function (msg) {
  console.log('zgl 受到消息了', msg)
  this.setState({
    accountList: msg
  })
  return true;
}

// 监听他人分享账户的函数
ShareDetailScreen.prototype.onIq = function (iq) {
  console.log('zgl 收到他人分享账户', iq);
  try{
      var from = iq.getAttribute('from');
      var type = iq.getAttribute('type');
      var pubsubs = iq.getElementsByTagName('pubsub');
      console.log(from);
      if(pubsubs.length>0){
        console.log('111');
        var items = pubsubs[0].getElementsByTagName('items');
        var itemlist = items[0].getElementsByTagName('item');
        console.log('111222');
        console.log(items, itemlist.length);
        var accountList = new Array();
        for(var i=0; i<itemlist.length; i++){
          console.log('111333');
          var entry = itemlist[i].getElementsByTagName("entry");
          console.log('111444');
          var summary = entry[0].getElementsByTagName("summary");
          console.log('111555');
          var se = Strophe.getText(summary[0]);
          var se2 = Strophe.xmlunescape(se);
          accountList.push(JSON.parse(se2));
        }
        console.log(accountList);
        this.setState({
          accountList: accountList
        })
  
      }
  } catch(err){
  }
  return true;

}

