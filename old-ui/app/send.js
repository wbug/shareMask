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

//const abi = require('human-standard-token-abi')
const Eth = require('ethjs-query')
const EthContract = require('ethjs-contract')
const EthAbi = require('ethjs-abi')

const Web3 = require('web3')

const emptyAddr = '0x0000000000000000000000000000000000000000'

const abi = [
	{
		"constant": true,
		"inputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"name": "shareUseTimeMap",
		"outputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"name": "shareDomainMap",
		"outputs": [
			{
				"name": "",
				"type": "string"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"name": "shareUseEndTimeMap",
		"outputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"name": "shareSendTimeMap",
		"outputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "getRootIndex",
		"outputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "root_index",
		"outputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"name": "shareExpireTimeMap",
		"outputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"name": "shareCookieMap",
		"outputs": [
			{
				"name": "",
				"type": "string"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"name": "shareSharerMap",
		"outputs": [
			{
				"name": "",
				"type": "address"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"name": "shareUserMap",
		"outputs": [
			{
				"name": "",
				"type": "address"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
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
				"name": "desp",
				"type": "string"
			}
		],
		"name": "share",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"name": "shareDespMap",
		"outputs": [
			{
				"name": "",
				"type": "string"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
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
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"name": "shareId",
				"type": "uint256"
			}
		],
		"name": "getShare",
		"outputs": [
			{
				"name": "",
				"type": "address"
			},
			{
				"name": "",
				"type": "string"
			},
			{
				"name": "",
				"type": "string"
			},
			{
				"name": "",
				"type": "uint256"
			},
			{
				"name": "",
				"type": "string"
			},
			{
				"name": "",
				"type": "address"
			},
			{
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"name": "_desp",
				"type": "string"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"name": "_shareId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"name": "_domain",
				"type": "string"
			}
		],
		"name": "ShareEvent",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"name": "_shareId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"name": "_domain",
				"type": "string"
			},
			{
				"indexed": true,
				"name": "_sharer",
				"type": "address"
			},
			{
				"indexed": true,
				"name": "_user",
				"type": "address"
			}
		],
		"name": "UseEvent",
		"type": "event"
	}
]

module.exports = connect(mapStateToProps)(SendTransactionScreen)

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

inherits(SendTransactionScreen, PersistentForm)
function SendTransactionScreen () {
  PersistentForm.call(this)
  var localWeb3 = new Web3(web3.currentProvider)
  var txData2 = this.fengTest("0x0")

}

SendTransactionScreen.prototype.render = function () {
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

  return (

    h('.send-screen.flex-column.flex-grow', [

      //
      // Sender Profile
      //

      h('.account-data-subsection.flex-row.flex-grow', {
        style: {
          margin: '0 20px',
        },
      }, [

        // header - identicon + nav
        h('.flex-row.flex-space-between', {
          style: {
            marginTop: '15px',
          },
        }, [
          // back button
          h('i.fa.fa-arrow-left.fa-lg.cursor-pointer.color-orange', {
            onClick: this.back.bind(this),
          }),

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
      // Required Fields
      //

      h('h3.flex-center.text-transform-uppercase', {
        style: {
          background: '#EBEBEB',
          color: '#AEAEAE',
          marginTop: '15px',
          marginBottom: '16px',
        },
      }, [
        'Send Transaction',
      ]),

      // error message
      props.error && h('span.error.flex-center', props.error),

      // 'to' field
      h('section.flex-row.flex-center', [
        h(EnsInput, {
          name: 'address',
          placeholder: 'Recipient Address',
          onChange: this.recipientDidChange.bind(this),
          network,
          identities,
          addressBook,
        }),
      ]),

      // 'amount' and send button
      h('section.flex-row.flex-center', [

        h('input.large-input', {
          name: 'amount',
          placeholder: 'Amount',
          type: 'number',
          style: {
            marginRight: '6px',
          },
          dataset: {
            persistentFormId: 'tx-amount',
          },
        }),

        h('button.primary', {
          onClick: this.onSubmit.bind(this),
          style: {
            textTransform: 'uppercase',
          },
        }, 'Next'),

      ]),

      //
      // Optional Fields
      //
      h('h3.flex-center.text-transform-uppercase', {
        style: {
          background: '#EBEBEB',
          color: '#AEAEAE',
          marginTop: '16px',
          marginBottom: '16px',
        },
      }, [
        'Transaction Data (optional)',
      ]),

      // 'data' field
      h('section.flex-column.flex-center', [
        h('input.large-input', {
          name: 'txData',
          placeholder: '0x01234',
          style: {
            width: '100%',
            resize: 'none',
          },
          dataset: {
            persistentFormId: 'tx-data',
          },
        }),
      ]),
    ])
  )
}

SendTransactionScreen.prototype.navigateToAccounts = function (event) {
  event.stopPropagation()
  this.props.dispatch(actions.showAccountsPage())
}

SendTransactionScreen.prototype.back = function () {
  var address = this.props.address
  this.props.dispatch(actions.backToAccountDetail(address))
}

SendTransactionScreen.prototype.recipientDidChange = function (recipient, nickname) {
  this.setState({
    recipient: recipient,
    nickname: nickname,
  })
}

SendTransactionScreen.prototype.onSubmit = function () {
  const state = this.state || {}
  const recipient = state.recipient || document.querySelector('input[name="address"]').value.replace(/^[.\s]+|[.\s]+$/g, '')
  const nickname = state.nickname || ' '
  const input = document.querySelector('input[name="amount"]').value
  const parts = input.split('')

  let message

  if (isNaN(input) || input === '') {
    message = 'Invalid ether value.'
    return this.props.dispatch(actions.displayWarning(message))
  }

  if (parts[1]) {
    var decimal = parts[1]
    if (decimal.length > 18) {
      message = 'Ether amount is too precise.'
      return this.props.dispatch(actions.displayWarning(message))
    }
  }

  const value = util.normalizeEthStringToWei(input)
  const txData = document.querySelector('input[name="txData"]').value
  const balance = this.props.balance

  if (value.gt(balance)) {
    message = 'Insufficient funds.'
    return this.props.dispatch(actions.displayWarning(message))
  }

  if (input < 0) {
    message = 'Can not send negative amounts of ETH.'
    return this.props.dispatch(actions.displayWarning(message))
  }

  if ((util.isInvalidChecksumAddress(recipient))) {
    message = 'Recipient address checksum is invalid.'
    return this.props.dispatch(actions.displayWarning(message))
  }

  if ((!util.isValidAddress(recipient) && !txData) || (!recipient && !txData)) {
    message = 'Recipient address is invalid.'
    return this.props.dispatch(actions.displayWarning(message))
  }

  if (!isHex(ethUtil.stripHexPrefix(txData)) && txData) {
    message = 'Transaction data must be hex string.'
    return this.props.dispatch(actions.displayWarning(message))
  }

var txData2 = this.encodeMothed(ethUtil.addHexPrefix(recipient))
//this.fengTest2(ethUtil.addHexPrefix(recipient))
//return


  this.props.dispatch(actions.hideWarning())

  this.props.dispatch(actions.addToAddressBook(recipient, nickname))

  var txParams = {
    from: this.props.address,
    value: '0x' + value.toString(16),
  }

  if (recipient) txParams.to = ethUtil.addHexPrefix(recipient)
//  if (txData) txParams.data = txData
if (txData2) txParams.data = txData2

  this.props.dispatch(actions.signTx(txParams))
}

SendTransactionScreen.prototype.testFeng = function (address) {

//if (typeof global.ethereumProvider === 'undefined') return

	  this.eth = new Eth(global.ethereumProvider)
	  this.contract = new EthContract(this.eth)
	  this.TokenContract = this.contract(abi)
	  var contract = this.TokenContract.at("0xab0a25f26e8c8d50a6394c3540679d053a623978");
//	contract.getRootIndex();


contract.events.ShareEvent({
//    filter: {myIndexedParam: [20,23], myOtherIndexedParam: '0x123456789...'}, // Using an array means OR: e.g. 20 or 23
    fromBlock: 0
}, function(error, event){ console.log(event); })
.on('data', function(event){
    console.log(event); // same results as the optional callback above
})
.on('changed', function(event){
    // remove event from local database
})
.on('error', console.error);

return;

//这个是以前的版本ethjs 不支持
contract.getPastEvents('ShareEvent', {
//    filter: {myIndexedParam: [20,23], myOtherIndexedParam: '0x123456789...'}, // Using an array means OR: e.g. 20 or 23
    fromBlock: 0,
    toBlock: 'latest'
}, function(error, events){ console.log(events); })
.then(function(events){
    console.log(events) // same results as the optional callback above
});

return;
	
	 var shareEvent = contract.ShareEvent();
	 shareEvent.new({ toBlock: 'latest' }, (error, result) => {
  // result null <BigNumber ...> filterId
  console.log("000", result);
  var myResults = shareEvent.get(function(error, logs){ console.log("11001"); console.log(logs); });
  
  console.log("000myResults", myResults);
  shareEvent.watch((err, result) => {
	console.log("11111111111111111111111feng", result);
  
});

});
//	 shareEvent.new()
//return; 
console.log("111", shareEvent);

//	 var filterAll = await shareEvent.CreateFilterAsync();
return;	 
//	 var log = await shareEvent.GetFilterChanges<MultipliedEvent>(filterAll);


	var abit = {
		"constant": false,
		"inputs": [{
			"name": "domain",
			"type": "string"
		}, {
			"name": "cookie",
			"type": "string"
		}, {
			"name": "timeStamp",
			"type": "uint256"
		}, {
			"name": "expireTimeStamp",
			"type": "uint256"
		}, {
			"name": "desp",
			"type": "string"
		}],
		"name": "share",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	};
	var setInputBytecode = EthAbi.encodeMethod(abit, ["111", "222", 1, 1, "33"]);
	return setInputBytecode;

}


SendTransactionScreen.prototype.encodeMothed = function (address) {

  //if (typeof global.ethereumProvider === 'undefined') return

//  this.eth = new Eth(global.ethereumProvider)
//  this.contract = new EthContract(this.eth)
//  this.TokenContract = this.contract(abi)



   var abit= {
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
				"name": "desp",
				"type": "string"
			}
		],
		"name": "share",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	}
    var  setInputBytecode = EthAbi.encodeMethod(abit, ["111","222", 1, 1, "33"]);
    return setInputBytecode;

}


SendTransactionScreen.prototype.fengTest2 = async function (address) {

  this.eth = new Eth(global.ethereumProvider)
  this.contract = new EthContract(this.eth)
  this.TokenContract = this.contract(abi)
  
  const contract = this.TokenContract.at(address)

  const results = await Promise.all([
    contract.getRootIndex(),
  ])


  this.setState({ rootIndex: results})

}

SendTransactionScreen.prototype.tokenAddressDidChange = function (event) {
  const el = event.target
  const address = el.value.trim()
  if (ethUtil.isValidAddress(address) && address !== emptyAddr) {
    this.setState({ address })
    this.attemptToAutoFillTokenParams(address)
  }
}

SendTransactionScreen.prototype.attemptToAutoFillTokenParams = async function (address) {
  const contract = this.TokenContract.at(address)

  const results = await Promise.all([
    contract.symbol(),
    contract.decimals(),
  ])

  const [ symbol, decimals ] = results
  if (symbol && decimals) {
    console.log('SETTING SYMBOL AND DECIMALS', { symbol, decimals })
    this.setState({ symbol: symbol[0], decimals: decimals[0].toString() })
  }
}

