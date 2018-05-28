(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({"/opt/panxf/_is-buffer@1.1.6@is-buffer/index.js":[function(_dereq_,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}],"/opt/panxf/metamask-extension/app/scripts/inpage.js":[function(_dereq_,module,exports){
(function (global){
'use strict';

/*global Web3*/
cleanContextForImports();
_dereq_('web3/dist/web3.min.js');
var log = _dereq_('loglevel');
var LocalMessageDuplexStream = _dereq_('post-message-stream');
var setupDappAutoReload = _dereq_('./lib/auto-reload.js');
var MetamaskInpageProvider = _dereq_('./lib/inpage-provider.js');
restoreContextAfterImports();

log.setDefaultLevel(true ? 'debug' : 'warn');

//
// setup plugin communication
//

// setup background connection
var metamaskStream = new LocalMessageDuplexStream({
  name: 'inpage',
  target: 'contentscript'
});

// compose the inpage provider
var inpageProvider = new MetamaskInpageProvider(metamaskStream);

//
// setup web3
//

if (typeof window.web3 !== 'undefined') {
  throw new Error('MetaMask detected another web3.\n     MetaMask will not work reliably with another web3 extension.\n     This usually happens if you have two MetaMasks installed,\n     or MetaMask and another web3 extension. Please remove one\n     and try again.');
}
var web3 = new Web3(inpageProvider);
web3.setProvider = function () {
  log.debug('MetaMask - overrode web3.setProvider');
};
log.debug('MetaMask - injected web3');
// export global web3, with usage-detection
setupDappAutoReload(web3, inpageProvider.publicConfigStore);

// set web3 defaultAccount
inpageProvider.publicConfigStore.subscribe(function (state) {
  web3.eth.defaultAccount = state.selectedAddress;
});

// need to make sure we aren't affected by overlapping namespaces
// and that we dont affect the app with our namespace
// mostly a fix for web3's BigNumber if AMD's "define" is defined...
var __define;

/**
 * Caches reference to global define object and deletes it to
 * avoid conflicts with other global define objects, such as
 * AMD's define function
 */
function cleanContextForImports() {
  __define = global.define;
  try {
    global.define = undefined;
  } catch (_) {
    console.warn('MetaMask - global.define could not be deleted.');
  }
}

/**
 * Restores global define object from cached reference
 */
function restoreContextAfterImports() {
  try {
    global.define = __define;
  } catch (_) {
    console.warn('MetaMask - global.define could not be overwritten.');
  }
}


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./lib/auto-reload.js":"/opt/panxf/metamask-extension/app/scripts/lib/auto-reload.js","./lib/inpage-provider.js":"/opt/panxf/metamask-extension/app/scripts/lib/inpage-provider.js","loglevel":"/opt/panxf/metamask-extension/node_modules/_loglevel@1.6.1@loglevel/lib/loglevel.js","post-message-stream":"/opt/panxf/metamask-extension/node_modules/_post-message-stream@3.0.0@post-message-stream/index.js","web3/dist/web3.min.js":"/opt/panxf/metamask-extension/node_modules/_web3@0.20.6@web3/dist/web3.min.js"}],"/opt/panxf/metamask-extension/app/scripts/lib/auto-reload.js":[function(_dereq_,module,exports){
(function (global){
'use strict';

module.exports = setupDappAutoReload;

function setupDappAutoReload(web3, observable) {
  // export web3 as a global, checking for usage
  var hasBeenWarned = false;
  var reloadInProgress = false;
  var lastTimeUsed = void 0;
  var lastSeenNetwork = void 0;

  global.web3 = new Proxy(web3, {
    get: function get(_web3, key) {
      // show warning once on web3 access
      if (!hasBeenWarned && key !== 'currentProvider') {
        console.warn('MetaMask: web3 will be deprecated in the near future in favor of the ethereumProvider \nhttps://github.com/MetaMask/faq/blob/master/detecting_metamask.md#web3-deprecation');
        hasBeenWarned = true;
      }
      // get the time of use
      lastTimeUsed = Date.now();
      // return value normally
      return _web3[key];
    },
    set: function set(_web3, key, value) {
      // set value normally
      _web3[key] = value;
    }
  });

  observable.subscribe(function (state) {
    // if reload in progress, no need to check reload logic
    if (reloadInProgress) return;

    var currentNetwork = state.networkVersion;

    // set the initial network
    if (!lastSeenNetwork) {
      lastSeenNetwork = currentNetwork;
      return;
    }

    // skip reload logic if web3 not used
    if (!lastTimeUsed) return;

    // if network did not change, exit
    if (currentNetwork === lastSeenNetwork) return;

    // initiate page reload
    reloadInProgress = true;
    var timeSinceUse = Date.now() - lastTimeUsed;
    // if web3 was recently used then delay the reloading of the page
    if (timeSinceUse > 500) {
      triggerReset();
    } else {
      setTimeout(triggerReset, 500);
    }
  });
}

// reload the page
function triggerReset() {
  global.location.reload();
}


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],"/opt/panxf/metamask-extension/app/scripts/lib/createErrorMiddleware.js":[function(_dereq_,module,exports){
'use strict';

var _defineProperty2 = _dereq_('babel-runtime/helpers/defineProperty');

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _RPC_ERRORS;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var log = _dereq_('loglevel');

/**
 * JSON-RPC error object
 *
 * @typedef {Object} RpcError
 * @property {number} code - Indicates the error type that occurred
 * @property {Object} [data] - Contains additional information about the error
 * @property {string} [message] - Short description of the error
 */

/**
 * Middleware configuration object
 *
 * @typedef {Object} MiddlewareConfig
 * @property {boolean} [override] - Use RPC_ERRORS message in place of provider message
 */

/**
 * Map of standard and non-standard RPC error codes to messages
 */
var RPC_ERRORS = (_RPC_ERRORS = {
  1: 'An unauthorized action was attempted.',
  2: 'A disallowed action was attempted.',
  3: 'An execution error occurred.'
}, (0, _defineProperty3.default)(_RPC_ERRORS, -32600, 'The JSON sent is not a valid Request object.'), (0, _defineProperty3.default)(_RPC_ERRORS, -32601, 'The method does not exist / is not available.'), (0, _defineProperty3.default)(_RPC_ERRORS, -32602, 'Invalid method parameter(s).'), (0, _defineProperty3.default)(_RPC_ERRORS, -32603, 'Internal JSON-RPC error.'), (0, _defineProperty3.default)(_RPC_ERRORS, -32700, 'Invalid JSON was received by the server. An error occurred on the server while parsing the JSON text.'), (0, _defineProperty3.default)(_RPC_ERRORS, 'internal', 'Internal server error.'), (0, _defineProperty3.default)(_RPC_ERRORS, 'unknown', 'Unknown JSON-RPC error.'), _RPC_ERRORS);

/**
 * Modifies a JSON-RPC error object in-place to add a human-readable message,
 * optionally overriding any provider-supplied message
 *
 * @param {RpcError} error - JSON-RPC error object
 * @param {boolean} override - Use RPC_ERRORS message in place of provider message
 */
function sanitizeRPCError(error, override) {
  if (error.message && !override) {
    return error;
  }
  var message = error.code > -31099 && error.code < -32100 ? RPC_ERRORS.internal : RPC_ERRORS[error.code];
  error.message = message || RPC_ERRORS.unknown;
}

/**
 * json-rpc-engine middleware that both logs standard and non-standard error
 * messages and ends middleware stack traversal if an error is encountered
 *
 * @param {MiddlewareConfig} [config={override:true}] - Middleware configuration
 * @returns {Function} json-rpc-engine middleware function
 */
function createErrorMiddleware() {
  var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      _ref$override = _ref.override,
      override = _ref$override === undefined ? true : _ref$override;

  return function (req, res, next) {
    next(function (done) {
      var error = res.error;

      if (!error) {
        return done();
      }
      sanitizeRPCError(error);
      log.error('MetaMask - RPC Error: ' + error.message, error);
    });
  };
}

module.exports = createErrorMiddleware;


},{"babel-runtime/helpers/defineProperty":"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/helpers/defineProperty.js","loglevel":"/opt/panxf/metamask-extension/node_modules/_loglevel@1.6.1@loglevel/lib/loglevel.js"}],"/opt/panxf/metamask-extension/app/scripts/lib/inpage-provider.js":[function(_dereq_,module,exports){
'use strict';

var pump = _dereq_('pump');
var RpcEngine = _dereq_('json-rpc-engine');
var createErrorMiddleware = _dereq_('./createErrorMiddleware');
var createIdRemapMiddleware = _dereq_('json-rpc-engine/src/idRemapMiddleware');
var createStreamMiddleware = _dereq_('json-rpc-middleware-stream');
var LocalStorageStore = _dereq_('obs-store');
var asStream = _dereq_('obs-store/lib/asStream');
var ObjectMultiplex = _dereq_('obj-multiplex');

module.exports = MetamaskInpageProvider;

function MetamaskInpageProvider(connectionStream) {
  var self = this;

  // setup connectionStream multiplexing
  var mux = self.mux = new ObjectMultiplex();
  pump(connectionStream, mux, connectionStream, function (err) {
    return logStreamDisconnectWarning('MetaMask', err);
  });

  // subscribe to metamask public config (one-way)
  self.publicConfigStore = new LocalStorageStore({ storageKey: 'MetaMask-Config' });

  pump(mux.createStream('publicConfig'), asStream(self.publicConfigStore), function (err) {
    return logStreamDisconnectWarning('MetaMask PublicConfigStore', err);
  });

  // ignore phishing warning message (handled elsewhere)
  mux.ignoreStream('phishing');

  // connect to async provider
  var streamMiddleware = createStreamMiddleware();
  pump(streamMiddleware.stream, mux.createStream('provider'), streamMiddleware.stream, function (err) {
    return logStreamDisconnectWarning('MetaMask RpcProvider', err);
  });

  // handle sendAsync requests via dapp-side rpc engine
  var rpcEngine = new RpcEngine();
  rpcEngine.push(createIdRemapMiddleware());
  rpcEngine.push(createErrorMiddleware());
  rpcEngine.push(streamMiddleware);
  self.rpcEngine = rpcEngine;
}

// handle sendAsync requests via asyncProvider
// also remap ids inbound and outbound
MetamaskInpageProvider.prototype.sendAsync = function (payload, cb) {
  var self = this;
  self.rpcEngine.handle(payload, cb);
};

MetamaskInpageProvider.prototype.send = function (payload) {
  var self = this;

  var selectedAddress = void 0;
  var result = null;
  switch (payload.method) {

    case 'eth_accounts':
      // read from localStorage
      selectedAddress = self.publicConfigStore.getState().selectedAddress;
      result = selectedAddress ? [selectedAddress] : [];
      break;

    case 'eth_coinbase':
      // read from localStorage
      selectedAddress = self.publicConfigStore.getState().selectedAddress;
      result = selectedAddress || null;
      break;

    case 'eth_uninstallFilter':
      self.sendAsync(payload, noop);
      result = true;
      break;

    case 'net_version':
      var networkVersion = self.publicConfigStore.getState().networkVersion;
      result = networkVersion || null;
      break;

    // throw not-supported Error
    default:
      var link = 'https://github.com/MetaMask/faq/blob/master/DEVELOPERS.md#dizzy-all-async---think-of-metamask-as-a-light-client';
      var message = 'The MetaMask Web3 object does not support synchronous methods like ' + payload.method + ' without a callback parameter. See ' + link + ' for details.';
      throw new Error(message);

  }

  // return the result
  return {
    id: payload.id,
    jsonrpc: payload.jsonrpc,
    result: result
  };
};

MetamaskInpageProvider.prototype.isConnected = function () {
  return true;
};

MetamaskInpageProvider.prototype.isMetaMask = true;

// util

function logStreamDisconnectWarning(remoteLabel, err) {
  var warningMsg = 'MetamaskInpageProvider - lost connection to ' + remoteLabel;
  if (err) warningMsg += '\n' + err.stack;
  console.warn(warningMsg);
}

function noop() {}


},{"./createErrorMiddleware":"/opt/panxf/metamask-extension/app/scripts/lib/createErrorMiddleware.js","json-rpc-engine":"/opt/panxf/metamask-extension/node_modules/_json-rpc-engine@3.7.3@json-rpc-engine/src/index.js","json-rpc-engine/src/idRemapMiddleware":"/opt/panxf/metamask-extension/node_modules/_json-rpc-engine@3.7.3@json-rpc-engine/src/idRemapMiddleware.js","json-rpc-middleware-stream":"/opt/panxf/metamask-extension/node_modules/_json-rpc-middleware-stream@1.0.1@json-rpc-middleware-stream/index.js","obj-multiplex":"/opt/panxf/metamask-extension/node_modules/_obj-multiplex@1.0.0@obj-multiplex/index.js","obs-store":"/opt/panxf/metamask-extension/node_modules/_obs-store@3.0.0@obs-store/index.js","obs-store/lib/asStream":"/opt/panxf/metamask-extension/node_modules/_obs-store@3.0.0@obs-store/lib/asStream.js","pump":"/opt/panxf/metamask-extension/node_modules/_pump@3.0.0@pump/index.js"}],"/opt/panxf/metamask-extension/node_modules/_async@2.6.1@async/dist/async.js":[function(_dereq_,module,exports){
(function (process,global,setImmediate){
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.async = global.async || {})));
}(this, (function (exports) { 'use strict';

function slice(arrayLike, start) {
    start = start|0;
    var newLen = Math.max(arrayLike.length - start, 0);
    var newArr = Array(newLen);
    for(var idx = 0; idx < newLen; idx++)  {
        newArr[idx] = arrayLike[start + idx];
    }
    return newArr;
}

/**
 * Creates a continuation function with some arguments already applied.
 *
 * Useful as a shorthand when combined with other control flow functions. Any
 * arguments passed to the returned function are added to the arguments
 * originally passed to apply.
 *
 * @name apply
 * @static
 * @memberOf module:Utils
 * @method
 * @category Util
 * @param {Function} fn - The function you want to eventually apply all
 * arguments to. Invokes with (arguments...).
 * @param {...*} arguments... - Any number of arguments to automatically apply
 * when the continuation is called.
 * @returns {Function} the partially-applied function
 * @example
 *
 * // using apply
 * async.parallel([
 *     async.apply(fs.writeFile, 'testfile1', 'test1'),
 *     async.apply(fs.writeFile, 'testfile2', 'test2')
 * ]);
 *
 *
 * // the same process without using apply
 * async.parallel([
 *     function(callback) {
 *         fs.writeFile('testfile1', 'test1', callback);
 *     },
 *     function(callback) {
 *         fs.writeFile('testfile2', 'test2', callback);
 *     }
 * ]);
 *
 * // It's possible to pass any number of additional arguments when calling the
 * // continuation:
 *
 * node> var fn = async.apply(sys.puts, 'one');
 * node> fn('two', 'three');
 * one
 * two
 * three
 */
var apply = function(fn/*, ...args*/) {
    var args = slice(arguments, 1);
    return function(/*callArgs*/) {
        var callArgs = slice(arguments);
        return fn.apply(null, args.concat(callArgs));
    };
};

var initialParams = function (fn) {
    return function (/*...args, callback*/) {
        var args = slice(arguments);
        var callback = args.pop();
        fn.call(this, args, callback);
    };
};

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return value != null && (type == 'object' || type == 'function');
}

var hasSetImmediate = typeof setImmediate === 'function' && setImmediate;
var hasNextTick = typeof process === 'object' && typeof process.nextTick === 'function';

function fallback(fn) {
    setTimeout(fn, 0);
}

function wrap(defer) {
    return function (fn/*, ...args*/) {
        var args = slice(arguments, 1);
        defer(function () {
            fn.apply(null, args);
        });
    };
}

var _defer;

if (hasSetImmediate) {
    _defer = setImmediate;
} else if (hasNextTick) {
    _defer = process.nextTick;
} else {
    _defer = fallback;
}

var setImmediate$1 = wrap(_defer);

/**
 * Take a sync function and make it async, passing its return value to a
 * callback. This is useful for plugging sync functions into a waterfall,
 * series, or other async functions. Any arguments passed to the generated
 * function will be passed to the wrapped function (except for the final
 * callback argument). Errors thrown will be passed to the callback.
 *
 * If the function passed to `asyncify` returns a Promise, that promises's
 * resolved/rejected state will be used to call the callback, rather than simply
 * the synchronous return value.
 *
 * This also means you can asyncify ES2017 `async` functions.
 *
 * @name asyncify
 * @static
 * @memberOf module:Utils
 * @method
 * @alias wrapSync
 * @category Util
 * @param {Function} func - The synchronous function, or Promise-returning
 * function to convert to an {@link AsyncFunction}.
 * @returns {AsyncFunction} An asynchronous wrapper of the `func`. To be
 * invoked with `(args..., callback)`.
 * @example
 *
 * // passing a regular synchronous function
 * async.waterfall([
 *     async.apply(fs.readFile, filename, "utf8"),
 *     async.asyncify(JSON.parse),
 *     function (data, next) {
 *         // data is the result of parsing the text.
 *         // If there was a parsing error, it would have been caught.
 *     }
 * ], callback);
 *
 * // passing a function returning a promise
 * async.waterfall([
 *     async.apply(fs.readFile, filename, "utf8"),
 *     async.asyncify(function (contents) {
 *         return db.model.create(contents);
 *     }),
 *     function (model, next) {
 *         // `model` is the instantiated model object.
 *         // If there was an error, this function would be skipped.
 *     }
 * ], callback);
 *
 * // es2017 example, though `asyncify` is not needed if your JS environment
 * // supports async functions out of the box
 * var q = async.queue(async.asyncify(async function(file) {
 *     var intermediateStep = await processFile(file);
 *     return await somePromise(intermediateStep)
 * }));
 *
 * q.push(files);
 */
function asyncify(func) {
    return initialParams(function (args, callback) {
        var result;
        try {
            result = func.apply(this, args);
        } catch (e) {
            return callback(e);
        }
        // if result is Promise object
        if (isObject(result) && typeof result.then === 'function') {
            result.then(function(value) {
                invokeCallback(callback, null, value);
            }, function(err) {
                invokeCallback(callback, err.message ? err : new Error(err));
            });
        } else {
            callback(null, result);
        }
    });
}

function invokeCallback(callback, error, value) {
    try {
        callback(error, value);
    } catch (e) {
        setImmediate$1(rethrow, e);
    }
}

function rethrow(error) {
    throw error;
}

var supportsSymbol = typeof Symbol === 'function';

function isAsync(fn) {
    return supportsSymbol && fn[Symbol.toStringTag] === 'AsyncFunction';
}

function wrapAsync(asyncFn) {
    return isAsync(asyncFn) ? asyncify(asyncFn) : asyncFn;
}

function applyEach$1(eachfn) {
    return function(fns/*, ...args*/) {
        var args = slice(arguments, 1);
        var go = initialParams(function(args, callback) {
            var that = this;
            return eachfn(fns, function (fn, cb) {
                wrapAsync(fn).apply(that, args.concat(cb));
            }, callback);
        });
        if (args.length) {
            return go.apply(this, args);
        }
        else {
            return go;
        }
    };
}

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/** Built-in value references. */
var Symbol$1 = root.Symbol;

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto.toString;

/** Built-in value references. */
var symToStringTag$1 = Symbol$1 ? Symbol$1.toStringTag : undefined;

/**
 * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the raw `toStringTag`.
 */
function getRawTag(value) {
  var isOwn = hasOwnProperty.call(value, symToStringTag$1),
      tag = value[symToStringTag$1];

  try {
    value[symToStringTag$1] = undefined;
    var unmasked = true;
  } catch (e) {}

  var result = nativeObjectToString.call(value);
  if (unmasked) {
    if (isOwn) {
      value[symToStringTag$1] = tag;
    } else {
      delete value[symToStringTag$1];
    }
  }
  return result;
}

/** Used for built-in method references. */
var objectProto$1 = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString$1 = objectProto$1.toString;

/**
 * Converts `value` to a string using `Object.prototype.toString`.
 *
 * @private
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 */
function objectToString(value) {
  return nativeObjectToString$1.call(value);
}

/** `Object#toString` result references. */
var nullTag = '[object Null]';
var undefinedTag = '[object Undefined]';

/** Built-in value references. */
var symToStringTag = Symbol$1 ? Symbol$1.toStringTag : undefined;

/**
 * The base implementation of `getTag` without fallbacks for buggy environments.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
function baseGetTag(value) {
  if (value == null) {
    return value === undefined ? undefinedTag : nullTag;
  }
  return (symToStringTag && symToStringTag in Object(value))
    ? getRawTag(value)
    : objectToString(value);
}

/** `Object#toString` result references. */
var asyncTag = '[object AsyncFunction]';
var funcTag = '[object Function]';
var genTag = '[object GeneratorFunction]';
var proxyTag = '[object Proxy]';

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  if (!isObject(value)) {
    return false;
  }
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 9 which returns 'object' for typed arrays and other constructors.
  var tag = baseGetTag(value);
  return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
}

/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This method is loosely based on
 * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 * @example
 *
 * _.isLength(3);
 * // => true
 *
 * _.isLength(Number.MIN_VALUE);
 * // => false
 *
 * _.isLength(Infinity);
 * // => false
 *
 * _.isLength('3');
 * // => false
 */
function isLength(value) {
  return typeof value == 'number' &&
    value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is array-like. A value is considered array-like if it's
 * not a function and has a `value.length` that's an integer greater than or
 * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 * @example
 *
 * _.isArrayLike([1, 2, 3]);
 * // => true
 *
 * _.isArrayLike(document.body.children);
 * // => true
 *
 * _.isArrayLike('abc');
 * // => true
 *
 * _.isArrayLike(_.noop);
 * // => false
 */
function isArrayLike(value) {
  return value != null && isLength(value.length) && !isFunction(value);
}

// A temporary value used to identify if the loop should be broken.
// See #1064, #1293
var breakLoop = {};

/**
 * This method returns `undefined`.
 *
 * @static
 * @memberOf _
 * @since 2.3.0
 * @category Util
 * @example
 *
 * _.times(2, _.noop);
 * // => [undefined, undefined]
 */
function noop() {
  // No operation performed.
}

function once(fn) {
    return function () {
        if (fn === null) return;
        var callFn = fn;
        fn = null;
        callFn.apply(this, arguments);
    };
}

var iteratorSymbol = typeof Symbol === 'function' && Symbol.iterator;

var getIterator = function (coll) {
    return iteratorSymbol && coll[iteratorSymbol] && coll[iteratorSymbol]();
};

/**
 * The base implementation of `_.times` without support for iteratee shorthands
 * or max array length checks.
 *
 * @private
 * @param {number} n The number of times to invoke `iteratee`.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the array of results.
 */
function baseTimes(n, iteratee) {
  var index = -1,
      result = Array(n);

  while (++index < n) {
    result[index] = iteratee(index);
  }
  return result;
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return value != null && typeof value == 'object';
}

/** `Object#toString` result references. */
var argsTag = '[object Arguments]';

/**
 * The base implementation of `_.isArguments`.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 */
function baseIsArguments(value) {
  return isObjectLike(value) && baseGetTag(value) == argsTag;
}

/** Used for built-in method references. */
var objectProto$3 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$2 = objectProto$3.hasOwnProperty;

/** Built-in value references. */
var propertyIsEnumerable = objectProto$3.propertyIsEnumerable;

/**
 * Checks if `value` is likely an `arguments` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 *  else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
var isArguments = baseIsArguments(function() { return arguments; }()) ? baseIsArguments : function(value) {
  return isObjectLike(value) && hasOwnProperty$2.call(value, 'callee') &&
    !propertyIsEnumerable.call(value, 'callee');
};

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(document.body.children);
 * // => false
 *
 * _.isArray('abc');
 * // => false
 *
 * _.isArray(_.noop);
 * // => false
 */
var isArray = Array.isArray;

/**
 * This method returns `false`.
 *
 * @static
 * @memberOf _
 * @since 4.13.0
 * @category Util
 * @returns {boolean} Returns `false`.
 * @example
 *
 * _.times(2, _.stubFalse);
 * // => [false, false]
 */
function stubFalse() {
  return false;
}

/** Detect free variable `exports`. */
var freeExports = typeof exports == 'object' && exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule = freeExports && typeof module == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports = freeModule && freeModule.exports === freeExports;

/** Built-in value references. */
var Buffer = moduleExports ? root.Buffer : undefined;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeIsBuffer = Buffer ? Buffer.isBuffer : undefined;

/**
 * Checks if `value` is a buffer.
 *
 * @static
 * @memberOf _
 * @since 4.3.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a buffer, else `false`.
 * @example
 *
 * _.isBuffer(new Buffer(2));
 * // => true
 *
 * _.isBuffer(new Uint8Array(2));
 * // => false
 */
var isBuffer = nativeIsBuffer || stubFalse;

/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER$1 = 9007199254740991;

/** Used to detect unsigned integer values. */
var reIsUint = /^(?:0|[1-9]\d*)$/;

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  var type = typeof value;
  length = length == null ? MAX_SAFE_INTEGER$1 : length;

  return !!length &&
    (type == 'number' ||
      (type != 'symbol' && reIsUint.test(value))) &&
        (value > -1 && value % 1 == 0 && value < length);
}

/** `Object#toString` result references. */
var argsTag$1 = '[object Arguments]';
var arrayTag = '[object Array]';
var boolTag = '[object Boolean]';
var dateTag = '[object Date]';
var errorTag = '[object Error]';
var funcTag$1 = '[object Function]';
var mapTag = '[object Map]';
var numberTag = '[object Number]';
var objectTag = '[object Object]';
var regexpTag = '[object RegExp]';
var setTag = '[object Set]';
var stringTag = '[object String]';
var weakMapTag = '[object WeakMap]';

var arrayBufferTag = '[object ArrayBuffer]';
var dataViewTag = '[object DataView]';
var float32Tag = '[object Float32Array]';
var float64Tag = '[object Float64Array]';
var int8Tag = '[object Int8Array]';
var int16Tag = '[object Int16Array]';
var int32Tag = '[object Int32Array]';
var uint8Tag = '[object Uint8Array]';
var uint8ClampedTag = '[object Uint8ClampedArray]';
var uint16Tag = '[object Uint16Array]';
var uint32Tag = '[object Uint32Array]';

/** Used to identify `toStringTag` values of typed arrays. */
var typedArrayTags = {};
typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
typedArrayTags[uint32Tag] = true;
typedArrayTags[argsTag$1] = typedArrayTags[arrayTag] =
typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] =
typedArrayTags[dataViewTag] = typedArrayTags[dateTag] =
typedArrayTags[errorTag] = typedArrayTags[funcTag$1] =
typedArrayTags[mapTag] = typedArrayTags[numberTag] =
typedArrayTags[objectTag] = typedArrayTags[regexpTag] =
typedArrayTags[setTag] = typedArrayTags[stringTag] =
typedArrayTags[weakMapTag] = false;

/**
 * The base implementation of `_.isTypedArray` without Node.js optimizations.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 */
function baseIsTypedArray(value) {
  return isObjectLike(value) &&
    isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
}

/**
 * The base implementation of `_.unary` without support for storing metadata.
 *
 * @private
 * @param {Function} func The function to cap arguments for.
 * @returns {Function} Returns the new capped function.
 */
function baseUnary(func) {
  return function(value) {
    return func(value);
  };
}

/** Detect free variable `exports`. */
var freeExports$1 = typeof exports == 'object' && exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule$1 = freeExports$1 && typeof module == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports$1 = freeModule$1 && freeModule$1.exports === freeExports$1;

/** Detect free variable `process` from Node.js. */
var freeProcess = moduleExports$1 && freeGlobal.process;

/** Used to access faster Node.js helpers. */
var nodeUtil = (function() {
  try {
    // Use `util.types` for Node.js 10+.
    var types = freeModule$1 && freeModule$1.require && freeModule$1.require('util').types;

    if (types) {
      return types;
    }

    // Legacy `process.binding('util')` for Node.js < 10.
    return freeProcess && freeProcess.binding && freeProcess.binding('util');
  } catch (e) {}
}());

/* Node.js helper references. */
var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;

/**
 * Checks if `value` is classified as a typed array.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 * @example
 *
 * _.isTypedArray(new Uint8Array);
 * // => true
 *
 * _.isTypedArray([]);
 * // => false
 */
var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;

/** Used for built-in method references. */
var objectProto$2 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$1 = objectProto$2.hasOwnProperty;

/**
 * Creates an array of the enumerable property names of the array-like `value`.
 *
 * @private
 * @param {*} value The value to query.
 * @param {boolean} inherited Specify returning inherited property names.
 * @returns {Array} Returns the array of property names.
 */
function arrayLikeKeys(value, inherited) {
  var isArr = isArray(value),
      isArg = !isArr && isArguments(value),
      isBuff = !isArr && !isArg && isBuffer(value),
      isType = !isArr && !isArg && !isBuff && isTypedArray(value),
      skipIndexes = isArr || isArg || isBuff || isType,
      result = skipIndexes ? baseTimes(value.length, String) : [],
      length = result.length;

  for (var key in value) {
    if ((inherited || hasOwnProperty$1.call(value, key)) &&
        !(skipIndexes && (
           // Safari 9 has enumerable `arguments.length` in strict mode.
           key == 'length' ||
           // Node.js 0.10 has enumerable non-index properties on buffers.
           (isBuff && (key == 'offset' || key == 'parent')) ||
           // PhantomJS 2 has enumerable non-index properties on typed arrays.
           (isType && (key == 'buffer' || key == 'byteLength' || key == 'byteOffset')) ||
           // Skip index properties.
           isIndex(key, length)
        ))) {
      result.push(key);
    }
  }
  return result;
}

/** Used for built-in method references. */
var objectProto$5 = Object.prototype;

/**
 * Checks if `value` is likely a prototype object.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
 */
function isPrototype(value) {
  var Ctor = value && value.constructor,
      proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto$5;

  return value === proto;
}

/**
 * Creates a unary function that invokes `func` with its argument transformed.
 *
 * @private
 * @param {Function} func The function to wrap.
 * @param {Function} transform The argument transform.
 * @returns {Function} Returns the new function.
 */
function overArg(func, transform) {
  return function(arg) {
    return func(transform(arg));
  };
}

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeKeys = overArg(Object.keys, Object);

/** Used for built-in method references. */
var objectProto$4 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$3 = objectProto$4.hasOwnProperty;

/**
 * The base implementation of `_.keys` which doesn't treat sparse arrays as dense.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function baseKeys(object) {
  if (!isPrototype(object)) {
    return nativeKeys(object);
  }
  var result = [];
  for (var key in Object(object)) {
    if (hasOwnProperty$3.call(object, key) && key != 'constructor') {
      result.push(key);
    }
  }
  return result;
}

/**
 * Creates an array of the own enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects. See the
 * [ES spec](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
 * for more details.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keys(new Foo);
 * // => ['a', 'b'] (iteration order is not guaranteed)
 *
 * _.keys('hi');
 * // => ['0', '1']
 */
function keys(object) {
  return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
}

function createArrayIterator(coll) {
    var i = -1;
    var len = coll.length;
    return function next() {
        return ++i < len ? {value: coll[i], key: i} : null;
    }
}

function createES2015Iterator(iterator) {
    var i = -1;
    return function next() {
        var item = iterator.next();
        if (item.done)
            return null;
        i++;
        return {value: item.value, key: i};
    }
}

function createObjectIterator(obj) {
    var okeys = keys(obj);
    var i = -1;
    var len = okeys.length;
    return function next() {
        var key = okeys[++i];
        return i < len ? {value: obj[key], key: key} : null;
    };
}

function iterator(coll) {
    if (isArrayLike(coll)) {
        return createArrayIterator(coll);
    }

    var iterator = getIterator(coll);
    return iterator ? createES2015Iterator(iterator) : createObjectIterator(coll);
}

function onlyOnce(fn) {
    return function() {
        if (fn === null) throw new Error("Callback was already called.");
        var callFn = fn;
        fn = null;
        callFn.apply(this, arguments);
    };
}

function _eachOfLimit(limit) {
    return function (obj, iteratee, callback) {
        callback = once(callback || noop);
        if (limit <= 0 || !obj) {
            return callback(null);
        }
        var nextElem = iterator(obj);
        var done = false;
        var running = 0;
        var looping = false;

        function iterateeCallback(err, value) {
            running -= 1;
            if (err) {
                done = true;
                callback(err);
            }
            else if (value === breakLoop || (done && running <= 0)) {
                done = true;
                return callback(null);
            }
            else if (!looping) {
                replenish();
            }
        }

        function replenish () {
            looping = true;
            while (running < limit && !done) {
                var elem = nextElem();
                if (elem === null) {
                    done = true;
                    if (running <= 0) {
                        callback(null);
                    }
                    return;
                }
                running += 1;
                iteratee(elem.value, elem.key, onlyOnce(iterateeCallback));
            }
            looping = false;
        }

        replenish();
    };
}

/**
 * The same as [`eachOf`]{@link module:Collections.eachOf} but runs a maximum of `limit` async operations at a
 * time.
 *
 * @name eachOfLimit
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.eachOf]{@link module:Collections.eachOf}
 * @alias forEachOfLimit
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {AsyncFunction} iteratee - An async function to apply to each
 * item in `coll`. The `key` is the item's key, or index in the case of an
 * array.
 * Invoked with (item, key, callback).
 * @param {Function} [callback] - A callback which is called when all
 * `iteratee` functions have finished, or an error occurs. Invoked with (err).
 */
function eachOfLimit(coll, limit, iteratee, callback) {
    _eachOfLimit(limit)(coll, wrapAsync(iteratee), callback);
}

function doLimit(fn, limit) {
    return function (iterable, iteratee, callback) {
        return fn(iterable, limit, iteratee, callback);
    };
}

// eachOf implementation optimized for array-likes
function eachOfArrayLike(coll, iteratee, callback) {
    callback = once(callback || noop);
    var index = 0,
        completed = 0,
        length = coll.length;
    if (length === 0) {
        callback(null);
    }

    function iteratorCallback(err, value) {
        if (err) {
            callback(err);
        } else if ((++completed === length) || value === breakLoop) {
            callback(null);
        }
    }

    for (; index < length; index++) {
        iteratee(coll[index], index, onlyOnce(iteratorCallback));
    }
}

// a generic version of eachOf which can handle array, object, and iterator cases.
var eachOfGeneric = doLimit(eachOfLimit, Infinity);

/**
 * Like [`each`]{@link module:Collections.each}, except that it passes the key (or index) as the second argument
 * to the iteratee.
 *
 * @name eachOf
 * @static
 * @memberOf module:Collections
 * @method
 * @alias forEachOf
 * @category Collection
 * @see [async.each]{@link module:Collections.each}
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {AsyncFunction} iteratee - A function to apply to each
 * item in `coll`.
 * The `key` is the item's key, or index in the case of an array.
 * Invoked with (item, key, callback).
 * @param {Function} [callback] - A callback which is called when all
 * `iteratee` functions have finished, or an error occurs. Invoked with (err).
 * @example
 *
 * var obj = {dev: "/dev.json", test: "/test.json", prod: "/prod.json"};
 * var configs = {};
 *
 * async.forEachOf(obj, function (value, key, callback) {
 *     fs.readFile(__dirname + value, "utf8", function (err, data) {
 *         if (err) return callback(err);
 *         try {
 *             configs[key] = JSON.parse(data);
 *         } catch (e) {
 *             return callback(e);
 *         }
 *         callback();
 *     });
 * }, function (err) {
 *     if (err) console.error(err.message);
 *     // configs is now a map of JSON data
 *     doSomethingWith(configs);
 * });
 */
var eachOf = function(coll, iteratee, callback) {
    var eachOfImplementation = isArrayLike(coll) ? eachOfArrayLike : eachOfGeneric;
    eachOfImplementation(coll, wrapAsync(iteratee), callback);
};

function doParallel(fn) {
    return function (obj, iteratee, callback) {
        return fn(eachOf, obj, wrapAsync(iteratee), callback);
    };
}

function _asyncMap(eachfn, arr, iteratee, callback) {
    callback = callback || noop;
    arr = arr || [];
    var results = [];
    var counter = 0;
    var _iteratee = wrapAsync(iteratee);

    eachfn(arr, function (value, _, callback) {
        var index = counter++;
        _iteratee(value, function (err, v) {
            results[index] = v;
            callback(err);
        });
    }, function (err) {
        callback(err, results);
    });
}

/**
 * Produces a new collection of values by mapping each value in `coll` through
 * the `iteratee` function. The `iteratee` is called with an item from `coll`
 * and a callback for when it has finished processing. Each of these callback
 * takes 2 arguments: an `error`, and the transformed item from `coll`. If
 * `iteratee` passes an error to its callback, the main `callback` (for the
 * `map` function) is immediately called with the error.
 *
 * Note, that since this function applies the `iteratee` to each item in
 * parallel, there is no guarantee that the `iteratee` functions will complete
 * in order. However, the results array will be in the same order as the
 * original `coll`.
 *
 * If `map` is passed an Object, the results will be an Array.  The results
 * will roughly be in the order of the original Objects' keys (but this can
 * vary across JavaScript engines).
 *
 * @name map
 * @static
 * @memberOf module:Collections
 * @method
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {AsyncFunction} iteratee - An async function to apply to each item in
 * `coll`.
 * The iteratee should complete with the transformed item.
 * Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called when all `iteratee`
 * functions have finished, or an error occurs. Results is an Array of the
 * transformed items from the `coll`. Invoked with (err, results).
 * @example
 *
 * async.map(['file1','file2','file3'], fs.stat, function(err, results) {
 *     // results is now an array of stats for each file
 * });
 */
var map = doParallel(_asyncMap);

/**
 * Applies the provided arguments to each function in the array, calling
 * `callback` after all functions have completed. If you only provide the first
 * argument, `fns`, then it will return a function which lets you pass in the
 * arguments as if it were a single function call. If more arguments are
 * provided, `callback` is required while `args` is still optional.
 *
 * @name applyEach
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {Array|Iterable|Object} fns - A collection of {@link AsyncFunction}s
 * to all call with the same arguments
 * @param {...*} [args] - any number of separate arguments to pass to the
 * function.
 * @param {Function} [callback] - the final argument should be the callback,
 * called when all functions have completed processing.
 * @returns {Function} - If only the first argument, `fns`, is provided, it will
 * return a function which lets you pass in the arguments as if it were a single
 * function call. The signature is `(..args, callback)`. If invoked with any
 * arguments, `callback` is required.
 * @example
 *
 * async.applyEach([enableSearch, updateSchema], 'bucket', callback);
 *
 * // partial application example:
 * async.each(
 *     buckets,
 *     async.applyEach([enableSearch, updateSchema]),
 *     callback
 * );
 */
var applyEach = applyEach$1(map);

function doParallelLimit(fn) {
    return function (obj, limit, iteratee, callback) {
        return fn(_eachOfLimit(limit), obj, wrapAsync(iteratee), callback);
    };
}

/**
 * The same as [`map`]{@link module:Collections.map} but runs a maximum of `limit` async operations at a time.
 *
 * @name mapLimit
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.map]{@link module:Collections.map}
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {AsyncFunction} iteratee - An async function to apply to each item in
 * `coll`.
 * The iteratee should complete with the transformed item.
 * Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called when all `iteratee`
 * functions have finished, or an error occurs. Results is an array of the
 * transformed items from the `coll`. Invoked with (err, results).
 */
var mapLimit = doParallelLimit(_asyncMap);

/**
 * The same as [`map`]{@link module:Collections.map} but runs only a single async operation at a time.
 *
 * @name mapSeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.map]{@link module:Collections.map}
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {AsyncFunction} iteratee - An async function to apply to each item in
 * `coll`.
 * The iteratee should complete with the transformed item.
 * Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called when all `iteratee`
 * functions have finished, or an error occurs. Results is an array of the
 * transformed items from the `coll`. Invoked with (err, results).
 */
var mapSeries = doLimit(mapLimit, 1);

/**
 * The same as [`applyEach`]{@link module:ControlFlow.applyEach} but runs only a single async operation at a time.
 *
 * @name applyEachSeries
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.applyEach]{@link module:ControlFlow.applyEach}
 * @category Control Flow
 * @param {Array|Iterable|Object} fns - A collection of {@link AsyncFunction}s to all
 * call with the same arguments
 * @param {...*} [args] - any number of separate arguments to pass to the
 * function.
 * @param {Function} [callback] - the final argument should be the callback,
 * called when all functions have completed processing.
 * @returns {Function} - If only the first argument is provided, it will return
 * a function which lets you pass in the arguments as if it were a single
 * function call.
 */
var applyEachSeries = applyEach$1(mapSeries);

/**
 * A specialized version of `_.forEach` for arrays without support for
 * iteratee shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns `array`.
 */
function arrayEach(array, iteratee) {
  var index = -1,
      length = array == null ? 0 : array.length;

  while (++index < length) {
    if (iteratee(array[index], index, array) === false) {
      break;
    }
  }
  return array;
}

/**
 * Creates a base function for methods like `_.forIn` and `_.forOwn`.
 *
 * @private
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new base function.
 */
function createBaseFor(fromRight) {
  return function(object, iteratee, keysFunc) {
    var index = -1,
        iterable = Object(object),
        props = keysFunc(object),
        length = props.length;

    while (length--) {
      var key = props[fromRight ? length : ++index];
      if (iteratee(iterable[key], key, iterable) === false) {
        break;
      }
    }
    return object;
  };
}

/**
 * The base implementation of `baseForOwn` which iterates over `object`
 * properties returned by `keysFunc` and invokes `iteratee` for each property.
 * Iteratee functions may exit iteration early by explicitly returning `false`.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @returns {Object} Returns `object`.
 */
var baseFor = createBaseFor();

/**
 * The base implementation of `_.forOwn` without support for iteratee shorthands.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Object} Returns `object`.
 */
function baseForOwn(object, iteratee) {
  return object && baseFor(object, iteratee, keys);
}

/**
 * The base implementation of `_.findIndex` and `_.findLastIndex` without
 * support for iteratee shorthands.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {Function} predicate The function invoked per iteration.
 * @param {number} fromIndex The index to search from.
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function baseFindIndex(array, predicate, fromIndex, fromRight) {
  var length = array.length,
      index = fromIndex + (fromRight ? 1 : -1);

  while ((fromRight ? index-- : ++index < length)) {
    if (predicate(array[index], index, array)) {
      return index;
    }
  }
  return -1;
}

/**
 * The base implementation of `_.isNaN` without support for number objects.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is `NaN`, else `false`.
 */
function baseIsNaN(value) {
  return value !== value;
}

/**
 * A specialized version of `_.indexOf` which performs strict equality
 * comparisons of values, i.e. `===`.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} value The value to search for.
 * @param {number} fromIndex The index to search from.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function strictIndexOf(array, value, fromIndex) {
  var index = fromIndex - 1,
      length = array.length;

  while (++index < length) {
    if (array[index] === value) {
      return index;
    }
  }
  return -1;
}

/**
 * The base implementation of `_.indexOf` without `fromIndex` bounds checks.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} value The value to search for.
 * @param {number} fromIndex The index to search from.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function baseIndexOf(array, value, fromIndex) {
  return value === value
    ? strictIndexOf(array, value, fromIndex)
    : baseFindIndex(array, baseIsNaN, fromIndex);
}

/**
 * Determines the best order for running the {@link AsyncFunction}s in `tasks`, based on
 * their requirements. Each function can optionally depend on other functions
 * being completed first, and each function is run as soon as its requirements
 * are satisfied.
 *
 * If any of the {@link AsyncFunction}s pass an error to their callback, the `auto` sequence
 * will stop. Further tasks will not execute (so any other functions depending
 * on it will not run), and the main `callback` is immediately called with the
 * error.
 *
 * {@link AsyncFunction}s also receive an object containing the results of functions which
 * have completed so far as the first argument, if they have dependencies. If a
 * task function has no dependencies, it will only be passed a callback.
 *
 * @name auto
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {Object} tasks - An object. Each of its properties is either a
 * function or an array of requirements, with the {@link AsyncFunction} itself the last item
 * in the array. The object's key of a property serves as the name of the task
 * defined by that property, i.e. can be used when specifying requirements for
 * other tasks. The function receives one or two arguments:
 * * a `results` object, containing the results of the previously executed
 *   functions, only passed if the task has any dependencies,
 * * a `callback(err, result)` function, which must be called when finished,
 *   passing an `error` (which can be `null`) and the result of the function's
 *   execution.
 * @param {number} [concurrency=Infinity] - An optional `integer` for
 * determining the maximum number of tasks that can be run in parallel. By
 * default, as many as possible.
 * @param {Function} [callback] - An optional callback which is called when all
 * the tasks have been completed. It receives the `err` argument if any `tasks`
 * pass an error to their callback. Results are always returned; however, if an
 * error occurs, no further `tasks` will be performed, and the results object
 * will only contain partial results. Invoked with (err, results).
 * @returns undefined
 * @example
 *
 * async.auto({
 *     // this function will just be passed a callback
 *     readData: async.apply(fs.readFile, 'data.txt', 'utf-8'),
 *     showData: ['readData', function(results, cb) {
 *         // results.readData is the file's contents
 *         // ...
 *     }]
 * }, callback);
 *
 * async.auto({
 *     get_data: function(callback) {
 *         console.log('in get_data');
 *         // async code to get some data
 *         callback(null, 'data', 'converted to array');
 *     },
 *     make_folder: function(callback) {
 *         console.log('in make_folder');
 *         // async code to create a directory to store a file in
 *         // this is run at the same time as getting the data
 *         callback(null, 'folder');
 *     },
 *     write_file: ['get_data', 'make_folder', function(results, callback) {
 *         console.log('in write_file', JSON.stringify(results));
 *         // once there is some data and the directory exists,
 *         // write the data to a file in the directory
 *         callback(null, 'filename');
 *     }],
 *     email_link: ['write_file', function(results, callback) {
 *         console.log('in email_link', JSON.stringify(results));
 *         // once the file is written let's email a link to it...
 *         // results.write_file contains the filename returned by write_file.
 *         callback(null, {'file':results.write_file, 'email':'user@example.com'});
 *     }]
 * }, function(err, results) {
 *     console.log('err = ', err);
 *     console.log('results = ', results);
 * });
 */
var auto = function (tasks, concurrency, callback) {
    if (typeof concurrency === 'function') {
        // concurrency is optional, shift the args.
        callback = concurrency;
        concurrency = null;
    }
    callback = once(callback || noop);
    var keys$$1 = keys(tasks);
    var numTasks = keys$$1.length;
    if (!numTasks) {
        return callback(null);
    }
    if (!concurrency) {
        concurrency = numTasks;
    }

    var results = {};
    var runningTasks = 0;
    var hasError = false;

    var listeners = Object.create(null);

    var readyTasks = [];

    // for cycle detection:
    var readyToCheck = []; // tasks that have been identified as reachable
    // without the possibility of returning to an ancestor task
    var uncheckedDependencies = {};

    baseForOwn(tasks, function (task, key) {
        if (!isArray(task)) {
            // no dependencies
            enqueueTask(key, [task]);
            readyToCheck.push(key);
            return;
        }

        var dependencies = task.slice(0, task.length - 1);
        var remainingDependencies = dependencies.length;
        if (remainingDependencies === 0) {
            enqueueTask(key, task);
            readyToCheck.push(key);
            return;
        }
        uncheckedDependencies[key] = remainingDependencies;

        arrayEach(dependencies, function (dependencyName) {
            if (!tasks[dependencyName]) {
                throw new Error('async.auto task `' + key +
                    '` has a non-existent dependency `' +
                    dependencyName + '` in ' +
                    dependencies.join(', '));
            }
            addListener(dependencyName, function () {
                remainingDependencies--;
                if (remainingDependencies === 0) {
                    enqueueTask(key, task);
                }
            });
        });
    });

    checkForDeadlocks();
    processQueue();

    function enqueueTask(key, task) {
        readyTasks.push(function () {
            runTask(key, task);
        });
    }

    function processQueue() {
        if (readyTasks.length === 0 && runningTasks === 0) {
            return callback(null, results);
        }
        while(readyTasks.length && runningTasks < concurrency) {
            var run = readyTasks.shift();
            run();
        }

    }

    function addListener(taskName, fn) {
        var taskListeners = listeners[taskName];
        if (!taskListeners) {
            taskListeners = listeners[taskName] = [];
        }

        taskListeners.push(fn);
    }

    function taskComplete(taskName) {
        var taskListeners = listeners[taskName] || [];
        arrayEach(taskListeners, function (fn) {
            fn();
        });
        processQueue();
    }


    function runTask(key, task) {
        if (hasError) return;

        var taskCallback = onlyOnce(function(err, result) {
            runningTasks--;
            if (arguments.length > 2) {
                result = slice(arguments, 1);
            }
            if (err) {
                var safeResults = {};
                baseForOwn(results, function(val, rkey) {
                    safeResults[rkey] = val;
                });
                safeResults[key] = result;
                hasError = true;
                listeners = Object.create(null);

                callback(err, safeResults);
            } else {
                results[key] = result;
                taskComplete(key);
            }
        });

        runningTasks++;
        var taskFn = wrapAsync(task[task.length - 1]);
        if (task.length > 1) {
            taskFn(results, taskCallback);
        } else {
            taskFn(taskCallback);
        }
    }

    function checkForDeadlocks() {
        // Kahn's algorithm
        // https://en.wikipedia.org/wiki/Topological_sorting#Kahn.27s_algorithm
        // http://connalle.blogspot.com/2013/10/topological-sortingkahn-algorithm.html
        var currentTask;
        var counter = 0;
        while (readyToCheck.length) {
            currentTask = readyToCheck.pop();
            counter++;
            arrayEach(getDependents(currentTask), function (dependent) {
                if (--uncheckedDependencies[dependent] === 0) {
                    readyToCheck.push(dependent);
                }
            });
        }

        if (counter !== numTasks) {
            throw new Error(
                'async.auto cannot execute tasks due to a recursive dependency'
            );
        }
    }

    function getDependents(taskName) {
        var result = [];
        baseForOwn(tasks, function (task, key) {
            if (isArray(task) && baseIndexOf(task, taskName, 0) >= 0) {
                result.push(key);
            }
        });
        return result;
    }
};

/**
 * A specialized version of `_.map` for arrays without support for iteratee
 * shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the new mapped array.
 */
function arrayMap(array, iteratee) {
  var index = -1,
      length = array == null ? 0 : array.length,
      result = Array(length);

  while (++index < length) {
    result[index] = iteratee(array[index], index, array);
  }
  return result;
}

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && baseGetTag(value) == symbolTag);
}

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0;

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol$1 ? Symbol$1.prototype : undefined;
var symbolToString = symbolProto ? symbolProto.toString : undefined;

/**
 * The base implementation of `_.toString` which doesn't convert nullish
 * values to empty strings.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 */
function baseToString(value) {
  // Exit early for strings to avoid a performance hit in some environments.
  if (typeof value == 'string') {
    return value;
  }
  if (isArray(value)) {
    // Recursively convert values (susceptible to call stack limits).
    return arrayMap(value, baseToString) + '';
  }
  if (isSymbol(value)) {
    return symbolToString ? symbolToString.call(value) : '';
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

/**
 * The base implementation of `_.slice` without an iteratee call guard.
 *
 * @private
 * @param {Array} array The array to slice.
 * @param {number} [start=0] The start position.
 * @param {number} [end=array.length] The end position.
 * @returns {Array} Returns the slice of `array`.
 */
function baseSlice(array, start, end) {
  var index = -1,
      length = array.length;

  if (start < 0) {
    start = -start > length ? 0 : (length + start);
  }
  end = end > length ? length : end;
  if (end < 0) {
    end += length;
  }
  length = start > end ? 0 : ((end - start) >>> 0);
  start >>>= 0;

  var result = Array(length);
  while (++index < length) {
    result[index] = array[index + start];
  }
  return result;
}

/**
 * Casts `array` to a slice if it's needed.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {number} start The start position.
 * @param {number} [end=array.length] The end position.
 * @returns {Array} Returns the cast slice.
 */
function castSlice(array, start, end) {
  var length = array.length;
  end = end === undefined ? length : end;
  return (!start && end >= length) ? array : baseSlice(array, start, end);
}

/**
 * Used by `_.trim` and `_.trimEnd` to get the index of the last string symbol
 * that is not found in the character symbols.
 *
 * @private
 * @param {Array} strSymbols The string symbols to inspect.
 * @param {Array} chrSymbols The character symbols to find.
 * @returns {number} Returns the index of the last unmatched string symbol.
 */
function charsEndIndex(strSymbols, chrSymbols) {
  var index = strSymbols.length;

  while (index-- && baseIndexOf(chrSymbols, strSymbols[index], 0) > -1) {}
  return index;
}

/**
 * Used by `_.trim` and `_.trimStart` to get the index of the first string symbol
 * that is not found in the character symbols.
 *
 * @private
 * @param {Array} strSymbols The string symbols to inspect.
 * @param {Array} chrSymbols The character symbols to find.
 * @returns {number} Returns the index of the first unmatched string symbol.
 */
function charsStartIndex(strSymbols, chrSymbols) {
  var index = -1,
      length = strSymbols.length;

  while (++index < length && baseIndexOf(chrSymbols, strSymbols[index], 0) > -1) {}
  return index;
}

/**
 * Converts an ASCII `string` to an array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the converted array.
 */
function asciiToArray(string) {
  return string.split('');
}

/** Used to compose unicode character classes. */
var rsAstralRange = '\\ud800-\\udfff';
var rsComboMarksRange = '\\u0300-\\u036f';
var reComboHalfMarksRange = '\\ufe20-\\ufe2f';
var rsComboSymbolsRange = '\\u20d0-\\u20ff';
var rsComboRange = rsComboMarksRange + reComboHalfMarksRange + rsComboSymbolsRange;
var rsVarRange = '\\ufe0e\\ufe0f';

/** Used to compose unicode capture groups. */
var rsZWJ = '\\u200d';

/** Used to detect strings with [zero-width joiners or code points from the astral planes](http://eev.ee/blog/2015/09/12/dark-corners-of-unicode/). */
var reHasUnicode = RegExp('[' + rsZWJ + rsAstralRange  + rsComboRange + rsVarRange + ']');

/**
 * Checks if `string` contains Unicode symbols.
 *
 * @private
 * @param {string} string The string to inspect.
 * @returns {boolean} Returns `true` if a symbol is found, else `false`.
 */
function hasUnicode(string) {
  return reHasUnicode.test(string);
}

/** Used to compose unicode character classes. */
var rsAstralRange$1 = '\\ud800-\\udfff';
var rsComboMarksRange$1 = '\\u0300-\\u036f';
var reComboHalfMarksRange$1 = '\\ufe20-\\ufe2f';
var rsComboSymbolsRange$1 = '\\u20d0-\\u20ff';
var rsComboRange$1 = rsComboMarksRange$1 + reComboHalfMarksRange$1 + rsComboSymbolsRange$1;
var rsVarRange$1 = '\\ufe0e\\ufe0f';

/** Used to compose unicode capture groups. */
var rsAstral = '[' + rsAstralRange$1 + ']';
var rsCombo = '[' + rsComboRange$1 + ']';
var rsFitz = '\\ud83c[\\udffb-\\udfff]';
var rsModifier = '(?:' + rsCombo + '|' + rsFitz + ')';
var rsNonAstral = '[^' + rsAstralRange$1 + ']';
var rsRegional = '(?:\\ud83c[\\udde6-\\uddff]){2}';
var rsSurrPair = '[\\ud800-\\udbff][\\udc00-\\udfff]';
var rsZWJ$1 = '\\u200d';

/** Used to compose unicode regexes. */
var reOptMod = rsModifier + '?';
var rsOptVar = '[' + rsVarRange$1 + ']?';
var rsOptJoin = '(?:' + rsZWJ$1 + '(?:' + [rsNonAstral, rsRegional, rsSurrPair].join('|') + ')' + rsOptVar + reOptMod + ')*';
var rsSeq = rsOptVar + reOptMod + rsOptJoin;
var rsSymbol = '(?:' + [rsNonAstral + rsCombo + '?', rsCombo, rsRegional, rsSurrPair, rsAstral].join('|') + ')';

/** Used to match [string symbols](https://mathiasbynens.be/notes/javascript-unicode). */
var reUnicode = RegExp(rsFitz + '(?=' + rsFitz + ')|' + rsSymbol + rsSeq, 'g');

/**
 * Converts a Unicode `string` to an array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the converted array.
 */
function unicodeToArray(string) {
  return string.match(reUnicode) || [];
}

/**
 * Converts `string` to an array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the converted array.
 */
function stringToArray(string) {
  return hasUnicode(string)
    ? unicodeToArray(string)
    : asciiToArray(string);
}

/**
 * Converts `value` to a string. An empty string is returned for `null`
 * and `undefined` values. The sign of `-0` is preserved.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 * @example
 *
 * _.toString(null);
 * // => ''
 *
 * _.toString(-0);
 * // => '-0'
 *
 * _.toString([1, 2, 3]);
 * // => '1,2,3'
 */
function toString(value) {
  return value == null ? '' : baseToString(value);
}

/** Used to match leading and trailing whitespace. */
var reTrim = /^\s+|\s+$/g;

/**
 * Removes leading and trailing whitespace or specified characters from `string`.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category String
 * @param {string} [string=''] The string to trim.
 * @param {string} [chars=whitespace] The characters to trim.
 * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
 * @returns {string} Returns the trimmed string.
 * @example
 *
 * _.trim('  abc  ');
 * // => 'abc'
 *
 * _.trim('-_-abc-_-', '_-');
 * // => 'abc'
 *
 * _.map(['  foo  ', '  bar  '], _.trim);
 * // => ['foo', 'bar']
 */
function trim(string, chars, guard) {
  string = toString(string);
  if (string && (guard || chars === undefined)) {
    return string.replace(reTrim, '');
  }
  if (!string || !(chars = baseToString(chars))) {
    return string;
  }
  var strSymbols = stringToArray(string),
      chrSymbols = stringToArray(chars),
      start = charsStartIndex(strSymbols, chrSymbols),
      end = charsEndIndex(strSymbols, chrSymbols) + 1;

  return castSlice(strSymbols, start, end).join('');
}

var FN_ARGS = /^(?:async\s+)?(function)?\s*[^\(]*\(\s*([^\)]*)\)/m;
var FN_ARG_SPLIT = /,/;
var FN_ARG = /(=.+)?(\s*)$/;
var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

function parseParams(func) {
    func = func.toString().replace(STRIP_COMMENTS, '');
    func = func.match(FN_ARGS)[2].replace(' ', '');
    func = func ? func.split(FN_ARG_SPLIT) : [];
    func = func.map(function (arg){
        return trim(arg.replace(FN_ARG, ''));
    });
    return func;
}

/**
 * A dependency-injected version of the [async.auto]{@link module:ControlFlow.auto} function. Dependent
 * tasks are specified as parameters to the function, after the usual callback
 * parameter, with the parameter names matching the names of the tasks it
 * depends on. This can provide even more readable task graphs which can be
 * easier to maintain.
 *
 * If a final callback is specified, the task results are similarly injected,
 * specified as named parameters after the initial error parameter.
 *
 * The autoInject function is purely syntactic sugar and its semantics are
 * otherwise equivalent to [async.auto]{@link module:ControlFlow.auto}.
 *
 * @name autoInject
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.auto]{@link module:ControlFlow.auto}
 * @category Control Flow
 * @param {Object} tasks - An object, each of whose properties is an {@link AsyncFunction} of
 * the form 'func([dependencies...], callback). The object's key of a property
 * serves as the name of the task defined by that property, i.e. can be used
 * when specifying requirements for other tasks.
 * * The `callback` parameter is a `callback(err, result)` which must be called
 *   when finished, passing an `error` (which can be `null`) and the result of
 *   the function's execution. The remaining parameters name other tasks on
 *   which the task is dependent, and the results from those tasks are the
 *   arguments of those parameters.
 * @param {Function} [callback] - An optional callback which is called when all
 * the tasks have been completed. It receives the `err` argument if any `tasks`
 * pass an error to their callback, and a `results` object with any completed
 * task results, similar to `auto`.
 * @example
 *
 * //  The example from `auto` can be rewritten as follows:
 * async.autoInject({
 *     get_data: function(callback) {
 *         // async code to get some data
 *         callback(null, 'data', 'converted to array');
 *     },
 *     make_folder: function(callback) {
 *         // async code to create a directory to store a file in
 *         // this is run at the same time as getting the data
 *         callback(null, 'folder');
 *     },
 *     write_file: function(get_data, make_folder, callback) {
 *         // once there is some data and the directory exists,
 *         // write the data to a file in the directory
 *         callback(null, 'filename');
 *     },
 *     email_link: function(write_file, callback) {
 *         // once the file is written let's email a link to it...
 *         // write_file contains the filename returned by write_file.
 *         callback(null, {'file':write_file, 'email':'user@example.com'});
 *     }
 * }, function(err, results) {
 *     console.log('err = ', err);
 *     console.log('email_link = ', results.email_link);
 * });
 *
 * // If you are using a JS minifier that mangles parameter names, `autoInject`
 * // will not work with plain functions, since the parameter names will be
 * // collapsed to a single letter identifier.  To work around this, you can
 * // explicitly specify the names of the parameters your task function needs
 * // in an array, similar to Angular.js dependency injection.
 *
 * // This still has an advantage over plain `auto`, since the results a task
 * // depends on are still spread into arguments.
 * async.autoInject({
 *     //...
 *     write_file: ['get_data', 'make_folder', function(get_data, make_folder, callback) {
 *         callback(null, 'filename');
 *     }],
 *     email_link: ['write_file', function(write_file, callback) {
 *         callback(null, {'file':write_file, 'email':'user@example.com'});
 *     }]
 *     //...
 * }, function(err, results) {
 *     console.log('err = ', err);
 *     console.log('email_link = ', results.email_link);
 * });
 */
function autoInject(tasks, callback) {
    var newTasks = {};

    baseForOwn(tasks, function (taskFn, key) {
        var params;
        var fnIsAsync = isAsync(taskFn);
        var hasNoDeps =
            (!fnIsAsync && taskFn.length === 1) ||
            (fnIsAsync && taskFn.length === 0);

        if (isArray(taskFn)) {
            params = taskFn.slice(0, -1);
            taskFn = taskFn[taskFn.length - 1];

            newTasks[key] = params.concat(params.length > 0 ? newTask : taskFn);
        } else if (hasNoDeps) {
            // no dependencies, use the function as-is
            newTasks[key] = taskFn;
        } else {
            params = parseParams(taskFn);
            if (taskFn.length === 0 && !fnIsAsync && params.length === 0) {
                throw new Error("autoInject task functions require explicit parameters.");
            }

            // remove callback param
            if (!fnIsAsync) params.pop();

            newTasks[key] = params.concat(newTask);
        }

        function newTask(results, taskCb) {
            var newArgs = arrayMap(params, function (name) {
                return results[name];
            });
            newArgs.push(taskCb);
            wrapAsync(taskFn).apply(null, newArgs);
        }
    });

    auto(newTasks, callback);
}

// Simple doubly linked list (https://en.wikipedia.org/wiki/Doubly_linked_list) implementation
// used for queues. This implementation assumes that the node provided by the user can be modified
// to adjust the next and last properties. We implement only the minimal functionality
// for queue support.
function DLL() {
    this.head = this.tail = null;
    this.length = 0;
}

function setInitial(dll, node) {
    dll.length = 1;
    dll.head = dll.tail = node;
}

DLL.prototype.removeLink = function(node) {
    if (node.prev) node.prev.next = node.next;
    else this.head = node.next;
    if (node.next) node.next.prev = node.prev;
    else this.tail = node.prev;

    node.prev = node.next = null;
    this.length -= 1;
    return node;
};

DLL.prototype.empty = function () {
    while(this.head) this.shift();
    return this;
};

DLL.prototype.insertAfter = function(node, newNode) {
    newNode.prev = node;
    newNode.next = node.next;
    if (node.next) node.next.prev = newNode;
    else this.tail = newNode;
    node.next = newNode;
    this.length += 1;
};

DLL.prototype.insertBefore = function(node, newNode) {
    newNode.prev = node.prev;
    newNode.next = node;
    if (node.prev) node.prev.next = newNode;
    else this.head = newNode;
    node.prev = newNode;
    this.length += 1;
};

DLL.prototype.unshift = function(node) {
    if (this.head) this.insertBefore(this.head, node);
    else setInitial(this, node);
};

DLL.prototype.push = function(node) {
    if (this.tail) this.insertAfter(this.tail, node);
    else setInitial(this, node);
};

DLL.prototype.shift = function() {
    return this.head && this.removeLink(this.head);
};

DLL.prototype.pop = function() {
    return this.tail && this.removeLink(this.tail);
};

DLL.prototype.toArray = function () {
    var arr = Array(this.length);
    var curr = this.head;
    for(var idx = 0; idx < this.length; idx++) {
        arr[idx] = curr.data;
        curr = curr.next;
    }
    return arr;
};

DLL.prototype.remove = function (testFn) {
    var curr = this.head;
    while(!!curr) {
        var next = curr.next;
        if (testFn(curr)) {
            this.removeLink(curr);
        }
        curr = next;
    }
    return this;
};

function queue(worker, concurrency, payload) {
    if (concurrency == null) {
        concurrency = 1;
    }
    else if(concurrency === 0) {
        throw new Error('Concurrency must not be zero');
    }

    var _worker = wrapAsync(worker);
    var numRunning = 0;
    var workersList = [];

    var processingScheduled = false;
    function _insert(data, insertAtFront, callback) {
        if (callback != null && typeof callback !== 'function') {
            throw new Error('task callback must be a function');
        }
        q.started = true;
        if (!isArray(data)) {
            data = [data];
        }
        if (data.length === 0 && q.idle()) {
            // call drain immediately if there are no tasks
            return setImmediate$1(function() {
                q.drain();
            });
        }

        for (var i = 0, l = data.length; i < l; i++) {
            var item = {
                data: data[i],
                callback: callback || noop
            };

            if (insertAtFront) {
                q._tasks.unshift(item);
            } else {
                q._tasks.push(item);
            }
        }

        if (!processingScheduled) {
            processingScheduled = true;
            setImmediate$1(function() {
                processingScheduled = false;
                q.process();
            });
        }
    }

    function _next(tasks) {
        return function(err){
            numRunning -= 1;

            for (var i = 0, l = tasks.length; i < l; i++) {
                var task = tasks[i];

                var index = baseIndexOf(workersList, task, 0);
                if (index === 0) {
                    workersList.shift();
                } else if (index > 0) {
                    workersList.splice(index, 1);
                }

                task.callback.apply(task, arguments);

                if (err != null) {
                    q.error(err, task.data);
                }
            }

            if (numRunning <= (q.concurrency - q.buffer) ) {
                q.unsaturated();
            }

            if (q.idle()) {
                q.drain();
            }
            q.process();
        };
    }

    var isProcessing = false;
    var q = {
        _tasks: new DLL(),
        concurrency: concurrency,
        payload: payload,
        saturated: noop,
        unsaturated:noop,
        buffer: concurrency / 4,
        empty: noop,
        drain: noop,
        error: noop,
        started: false,
        paused: false,
        push: function (data, callback) {
            _insert(data, false, callback);
        },
        kill: function () {
            q.drain = noop;
            q._tasks.empty();
        },
        unshift: function (data, callback) {
            _insert(data, true, callback);
        },
        remove: function (testFn) {
            q._tasks.remove(testFn);
        },
        process: function () {
            // Avoid trying to start too many processing operations. This can occur
            // when callbacks resolve synchronously (#1267).
            if (isProcessing) {
                return;
            }
            isProcessing = true;
            while(!q.paused && numRunning < q.concurrency && q._tasks.length){
                var tasks = [], data = [];
                var l = q._tasks.length;
                if (q.payload) l = Math.min(l, q.payload);
                for (var i = 0; i < l; i++) {
                    var node = q._tasks.shift();
                    tasks.push(node);
                    workersList.push(node);
                    data.push(node.data);
                }

                numRunning += 1;

                if (q._tasks.length === 0) {
                    q.empty();
                }

                if (numRunning === q.concurrency) {
                    q.saturated();
                }

                var cb = onlyOnce(_next(tasks));
                _worker(data, cb);
            }
            isProcessing = false;
        },
        length: function () {
            return q._tasks.length;
        },
        running: function () {
            return numRunning;
        },
        workersList: function () {
            return workersList;
        },
        idle: function() {
            return q._tasks.length + numRunning === 0;
        },
        pause: function () {
            q.paused = true;
        },
        resume: function () {
            if (q.paused === false) { return; }
            q.paused = false;
            setImmediate$1(q.process);
        }
    };
    return q;
}

/**
 * A cargo of tasks for the worker function to complete. Cargo inherits all of
 * the same methods and event callbacks as [`queue`]{@link module:ControlFlow.queue}.
 * @typedef {Object} CargoObject
 * @memberOf module:ControlFlow
 * @property {Function} length - A function returning the number of items
 * waiting to be processed. Invoke like `cargo.length()`.
 * @property {number} payload - An `integer` for determining how many tasks
 * should be process per round. This property can be changed after a `cargo` is
 * created to alter the payload on-the-fly.
 * @property {Function} push - Adds `task` to the `queue`. The callback is
 * called once the `worker` has finished processing the task. Instead of a
 * single task, an array of `tasks` can be submitted. The respective callback is
 * used for every task in the list. Invoke like `cargo.push(task, [callback])`.
 * @property {Function} saturated - A callback that is called when the
 * `queue.length()` hits the concurrency and further tasks will be queued.
 * @property {Function} empty - A callback that is called when the last item
 * from the `queue` is given to a `worker`.
 * @property {Function} drain - A callback that is called when the last item
 * from the `queue` has returned from the `worker`.
 * @property {Function} idle - a function returning false if there are items
 * waiting or being processed, or true if not. Invoke like `cargo.idle()`.
 * @property {Function} pause - a function that pauses the processing of tasks
 * until `resume()` is called. Invoke like `cargo.pause()`.
 * @property {Function} resume - a function that resumes the processing of
 * queued tasks when the queue is paused. Invoke like `cargo.resume()`.
 * @property {Function} kill - a function that removes the `drain` callback and
 * empties remaining tasks from the queue forcing it to go idle. Invoke like `cargo.kill()`.
 */

/**
 * Creates a `cargo` object with the specified payload. Tasks added to the
 * cargo will be processed altogether (up to the `payload` limit). If the
 * `worker` is in progress, the task is queued until it becomes available. Once
 * the `worker` has completed some tasks, each callback of those tasks is
 * called. Check out [these](https://camo.githubusercontent.com/6bbd36f4cf5b35a0f11a96dcd2e97711ffc2fb37/68747470733a2f2f662e636c6f75642e6769746875622e636f6d2f6173736574732f313637363837312f36383130382f62626330636662302d356632392d313165322d393734662d3333393763363464633835382e676966) [animations](https://camo.githubusercontent.com/f4810e00e1c5f5f8addbe3e9f49064fd5d102699/68747470733a2f2f662e636c6f75642e6769746875622e636f6d2f6173736574732f313637363837312f36383130312f38346339323036362d356632392d313165322d383134662d3964336430323431336266642e676966)
 * for how `cargo` and `queue` work.
 *
 * While [`queue`]{@link module:ControlFlow.queue} passes only one task to one of a group of workers
 * at a time, cargo passes an array of tasks to a single worker, repeating
 * when the worker is finished.
 *
 * @name cargo
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.queue]{@link module:ControlFlow.queue}
 * @category Control Flow
 * @param {AsyncFunction} worker - An asynchronous function for processing an array
 * of queued tasks. Invoked with `(tasks, callback)`.
 * @param {number} [payload=Infinity] - An optional `integer` for determining
 * how many tasks should be processed per round; if omitted, the default is
 * unlimited.
 * @returns {module:ControlFlow.CargoObject} A cargo object to manage the tasks. Callbacks can
 * attached as certain properties to listen for specific events during the
 * lifecycle of the cargo and inner queue.
 * @example
 *
 * // create a cargo object with payload 2
 * var cargo = async.cargo(function(tasks, callback) {
 *     for (var i=0; i<tasks.length; i++) {
 *         console.log('hello ' + tasks[i].name);
 *     }
 *     callback();
 * }, 2);
 *
 * // add some items
 * cargo.push({name: 'foo'}, function(err) {
 *     console.log('finished processing foo');
 * });
 * cargo.push({name: 'bar'}, function(err) {
 *     console.log('finished processing bar');
 * });
 * cargo.push({name: 'baz'}, function(err) {
 *     console.log('finished processing baz');
 * });
 */
function cargo(worker, payload) {
    return queue(worker, 1, payload);
}

/**
 * The same as [`eachOf`]{@link module:Collections.eachOf} but runs only a single async operation at a time.
 *
 * @name eachOfSeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.eachOf]{@link module:Collections.eachOf}
 * @alias forEachOfSeries
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {AsyncFunction} iteratee - An async function to apply to each item in
 * `coll`.
 * Invoked with (item, key, callback).
 * @param {Function} [callback] - A callback which is called when all `iteratee`
 * functions have finished, or an error occurs. Invoked with (err).
 */
var eachOfSeries = doLimit(eachOfLimit, 1);

/**
 * Reduces `coll` into a single value using an async `iteratee` to return each
 * successive step. `memo` is the initial state of the reduction. This function
 * only operates in series.
 *
 * For performance reasons, it may make sense to split a call to this function
 * into a parallel map, and then use the normal `Array.prototype.reduce` on the
 * results. This function is for situations where each step in the reduction
 * needs to be async; if you can get the data before reducing it, then it's
 * probably a good idea to do so.
 *
 * @name reduce
 * @static
 * @memberOf module:Collections
 * @method
 * @alias inject
 * @alias foldl
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {*} memo - The initial state of the reduction.
 * @param {AsyncFunction} iteratee - A function applied to each item in the
 * array to produce the next step in the reduction.
 * The `iteratee` should complete with the next state of the reduction.
 * If the iteratee complete with an error, the reduction is stopped and the
 * main `callback` is immediately called with the error.
 * Invoked with (memo, item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Result is the reduced value. Invoked with
 * (err, result).
 * @example
 *
 * async.reduce([1,2,3], 0, function(memo, item, callback) {
 *     // pointless async:
 *     process.nextTick(function() {
 *         callback(null, memo + item)
 *     });
 * }, function(err, result) {
 *     // result is now equal to the last value of memo, which is 6
 * });
 */
function reduce(coll, memo, iteratee, callback) {
    callback = once(callback || noop);
    var _iteratee = wrapAsync(iteratee);
    eachOfSeries(coll, function(x, i, callback) {
        _iteratee(memo, x, function(err, v) {
            memo = v;
            callback(err);
        });
    }, function(err) {
        callback(err, memo);
    });
}

/**
 * Version of the compose function that is more natural to read. Each function
 * consumes the return value of the previous function. It is the equivalent of
 * [compose]{@link module:ControlFlow.compose} with the arguments reversed.
 *
 * Each function is executed with the `this` binding of the composed function.
 *
 * @name seq
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.compose]{@link module:ControlFlow.compose}
 * @category Control Flow
 * @param {...AsyncFunction} functions - the asynchronous functions to compose
 * @returns {Function} a function that composes the `functions` in order
 * @example
 *
 * // Requires lodash (or underscore), express3 and dresende's orm2.
 * // Part of an app, that fetches cats of the logged user.
 * // This example uses `seq` function to avoid overnesting and error
 * // handling clutter.
 * app.get('/cats', function(request, response) {
 *     var User = request.models.User;
 *     async.seq(
 *         _.bind(User.get, User),  // 'User.get' has signature (id, callback(err, data))
 *         function(user, fn) {
 *             user.getCats(fn);      // 'getCats' has signature (callback(err, data))
 *         }
 *     )(req.session.user_id, function (err, cats) {
 *         if (err) {
 *             console.error(err);
 *             response.json({ status: 'error', message: err.message });
 *         } else {
 *             response.json({ status: 'ok', message: 'Cats found', data: cats });
 *         }
 *     });
 * });
 */
function seq(/*...functions*/) {
    var _functions = arrayMap(arguments, wrapAsync);
    return function(/*...args*/) {
        var args = slice(arguments);
        var that = this;

        var cb = args[args.length - 1];
        if (typeof cb == 'function') {
            args.pop();
        } else {
            cb = noop;
        }

        reduce(_functions, args, function(newargs, fn, cb) {
            fn.apply(that, newargs.concat(function(err/*, ...nextargs*/) {
                var nextargs = slice(arguments, 1);
                cb(err, nextargs);
            }));
        },
        function(err, results) {
            cb.apply(that, [err].concat(results));
        });
    };
}

/**
 * Creates a function which is a composition of the passed asynchronous
 * functions. Each function consumes the return value of the function that
 * follows. Composing functions `f()`, `g()`, and `h()` would produce the result
 * of `f(g(h()))`, only this version uses callbacks to obtain the return values.
 *
 * Each function is executed with the `this` binding of the composed function.
 *
 * @name compose
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {...AsyncFunction} functions - the asynchronous functions to compose
 * @returns {Function} an asynchronous function that is the composed
 * asynchronous `functions`
 * @example
 *
 * function add1(n, callback) {
 *     setTimeout(function () {
 *         callback(null, n + 1);
 *     }, 10);
 * }
 *
 * function mul3(n, callback) {
 *     setTimeout(function () {
 *         callback(null, n * 3);
 *     }, 10);
 * }
 *
 * var add1mul3 = async.compose(mul3, add1);
 * add1mul3(4, function (err, result) {
 *     // result now equals 15
 * });
 */
var compose = function(/*...args*/) {
    return seq.apply(null, slice(arguments).reverse());
};

var _concat = Array.prototype.concat;

/**
 * The same as [`concat`]{@link module:Collections.concat} but runs a maximum of `limit` async operations at a time.
 *
 * @name concatLimit
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.concat]{@link module:Collections.concat}
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {AsyncFunction} iteratee - A function to apply to each item in `coll`,
 * which should use an array as its result. Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished, or an error occurs. Results is an array
 * containing the concatenated results of the `iteratee` function. Invoked with
 * (err, results).
 */
var concatLimit = function(coll, limit, iteratee, callback) {
    callback = callback || noop;
    var _iteratee = wrapAsync(iteratee);
    mapLimit(coll, limit, function(val, callback) {
        _iteratee(val, function(err /*, ...args*/) {
            if (err) return callback(err);
            return callback(null, slice(arguments, 1));
        });
    }, function(err, mapResults) {
        var result = [];
        for (var i = 0; i < mapResults.length; i++) {
            if (mapResults[i]) {
                result = _concat.apply(result, mapResults[i]);
            }
        }

        return callback(err, result);
    });
};

/**
 * Applies `iteratee` to each item in `coll`, concatenating the results. Returns
 * the concatenated list. The `iteratee`s are called in parallel, and the
 * results are concatenated as they return. There is no guarantee that the
 * results array will be returned in the original order of `coll` passed to the
 * `iteratee` function.
 *
 * @name concat
 * @static
 * @memberOf module:Collections
 * @method
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {AsyncFunction} iteratee - A function to apply to each item in `coll`,
 * which should use an array as its result. Invoked with (item, callback).
 * @param {Function} [callback(err)] - A callback which is called after all the
 * `iteratee` functions have finished, or an error occurs. Results is an array
 * containing the concatenated results of the `iteratee` function. Invoked with
 * (err, results).
 * @example
 *
 * async.concat(['dir1','dir2','dir3'], fs.readdir, function(err, files) {
 *     // files is now a list of filenames that exist in the 3 directories
 * });
 */
var concat = doLimit(concatLimit, Infinity);

/**
 * The same as [`concat`]{@link module:Collections.concat} but runs only a single async operation at a time.
 *
 * @name concatSeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.concat]{@link module:Collections.concat}
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {AsyncFunction} iteratee - A function to apply to each item in `coll`.
 * The iteratee should complete with an array an array of results.
 * Invoked with (item, callback).
 * @param {Function} [callback(err)] - A callback which is called after all the
 * `iteratee` functions have finished, or an error occurs. Results is an array
 * containing the concatenated results of the `iteratee` function. Invoked with
 * (err, results).
 */
var concatSeries = doLimit(concatLimit, 1);

/**
 * Returns a function that when called, calls-back with the values provided.
 * Useful as the first function in a [`waterfall`]{@link module:ControlFlow.waterfall}, or for plugging values in to
 * [`auto`]{@link module:ControlFlow.auto}.
 *
 * @name constant
 * @static
 * @memberOf module:Utils
 * @method
 * @category Util
 * @param {...*} arguments... - Any number of arguments to automatically invoke
 * callback with.
 * @returns {AsyncFunction} Returns a function that when invoked, automatically
 * invokes the callback with the previous given arguments.
 * @example
 *
 * async.waterfall([
 *     async.constant(42),
 *     function (value, next) {
 *         // value === 42
 *     },
 *     //...
 * ], callback);
 *
 * async.waterfall([
 *     async.constant(filename, "utf8"),
 *     fs.readFile,
 *     function (fileData, next) {
 *         //...
 *     }
 *     //...
 * ], callback);
 *
 * async.auto({
 *     hostname: async.constant("https://server.net/"),
 *     port: findFreePort,
 *     launchServer: ["hostname", "port", function (options, cb) {
 *         startServer(options, cb);
 *     }],
 *     //...
 * }, callback);
 */
var constant = function(/*...values*/) {
    var values = slice(arguments);
    var args = [null].concat(values);
    return function (/*...ignoredArgs, callback*/) {
        var callback = arguments[arguments.length - 1];
        return callback.apply(this, args);
    };
};

/**
 * This method returns the first argument it receives.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Util
 * @param {*} value Any value.
 * @returns {*} Returns `value`.
 * @example
 *
 * var object = { 'a': 1 };
 *
 * console.log(_.identity(object) === object);
 * // => true
 */
function identity(value) {
  return value;
}

function _createTester(check, getResult) {
    return function(eachfn, arr, iteratee, cb) {
        cb = cb || noop;
        var testPassed = false;
        var testResult;
        eachfn(arr, function(value, _, callback) {
            iteratee(value, function(err, result) {
                if (err) {
                    callback(err);
                } else if (check(result) && !testResult) {
                    testPassed = true;
                    testResult = getResult(true, value);
                    callback(null, breakLoop);
                } else {
                    callback();
                }
            });
        }, function(err) {
            if (err) {
                cb(err);
            } else {
                cb(null, testPassed ? testResult : getResult(false));
            }
        });
    };
}

function _findGetResult(v, x) {
    return x;
}

/**
 * Returns the first value in `coll` that passes an async truth test. The
 * `iteratee` is applied in parallel, meaning the first iteratee to return
 * `true` will fire the detect `callback` with that result. That means the
 * result might not be the first item in the original `coll` (in terms of order)
 * that passes the test.

 * If order within the original `coll` is important, then look at
 * [`detectSeries`]{@link module:Collections.detectSeries}.
 *
 * @name detect
 * @static
 * @memberOf module:Collections
 * @method
 * @alias find
 * @category Collections
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {AsyncFunction} iteratee - A truth test to apply to each item in `coll`.
 * The iteratee must complete with a boolean value as its result.
 * Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called as soon as any
 * iteratee returns `true`, or after all the `iteratee` functions have finished.
 * Result will be the first item in the array that passes the truth test
 * (iteratee) or the value `undefined` if none passed. Invoked with
 * (err, result).
 * @example
 *
 * async.detect(['file1','file2','file3'], function(filePath, callback) {
 *     fs.access(filePath, function(err) {
 *         callback(null, !err)
 *     });
 * }, function(err, result) {
 *     // result now equals the first file in the list that exists
 * });
 */
var detect = doParallel(_createTester(identity, _findGetResult));

/**
 * The same as [`detect`]{@link module:Collections.detect} but runs a maximum of `limit` async operations at a
 * time.
 *
 * @name detectLimit
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.detect]{@link module:Collections.detect}
 * @alias findLimit
 * @category Collections
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {AsyncFunction} iteratee - A truth test to apply to each item in `coll`.
 * The iteratee must complete with a boolean value as its result.
 * Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called as soon as any
 * iteratee returns `true`, or after all the `iteratee` functions have finished.
 * Result will be the first item in the array that passes the truth test
 * (iteratee) or the value `undefined` if none passed. Invoked with
 * (err, result).
 */
var detectLimit = doParallelLimit(_createTester(identity, _findGetResult));

/**
 * The same as [`detect`]{@link module:Collections.detect} but runs only a single async operation at a time.
 *
 * @name detectSeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.detect]{@link module:Collections.detect}
 * @alias findSeries
 * @category Collections
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {AsyncFunction} iteratee - A truth test to apply to each item in `coll`.
 * The iteratee must complete with a boolean value as its result.
 * Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called as soon as any
 * iteratee returns `true`, or after all the `iteratee` functions have finished.
 * Result will be the first item in the array that passes the truth test
 * (iteratee) or the value `undefined` if none passed. Invoked with
 * (err, result).
 */
var detectSeries = doLimit(detectLimit, 1);

function consoleFunc(name) {
    return function (fn/*, ...args*/) {
        var args = slice(arguments, 1);
        args.push(function (err/*, ...args*/) {
            var args = slice(arguments, 1);
            if (typeof console === 'object') {
                if (err) {
                    if (console.error) {
                        console.error(err);
                    }
                } else if (console[name]) {
                    arrayEach(args, function (x) {
                        console[name](x);
                    });
                }
            }
        });
        wrapAsync(fn).apply(null, args);
    };
}

/**
 * Logs the result of an [`async` function]{@link AsyncFunction} to the
 * `console` using `console.dir` to display the properties of the resulting object.
 * Only works in Node.js or in browsers that support `console.dir` and
 * `console.error` (such as FF and Chrome).
 * If multiple arguments are returned from the async function,
 * `console.dir` is called on each argument in order.
 *
 * @name dir
 * @static
 * @memberOf module:Utils
 * @method
 * @category Util
 * @param {AsyncFunction} function - The function you want to eventually apply
 * all arguments to.
 * @param {...*} arguments... - Any number of arguments to apply to the function.
 * @example
 *
 * // in a module
 * var hello = function(name, callback) {
 *     setTimeout(function() {
 *         callback(null, {hello: name});
 *     }, 1000);
 * };
 *
 * // in the node repl
 * node> async.dir(hello, 'world');
 * {hello: 'world'}
 */
var dir = consoleFunc('dir');

/**
 * The post-check version of [`during`]{@link module:ControlFlow.during}. To reflect the difference in
 * the order of operations, the arguments `test` and `fn` are switched.
 *
 * Also a version of [`doWhilst`]{@link module:ControlFlow.doWhilst} with asynchronous `test` function.
 * @name doDuring
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.during]{@link module:ControlFlow.during}
 * @category Control Flow
 * @param {AsyncFunction} fn - An async function which is called each time
 * `test` passes. Invoked with (callback).
 * @param {AsyncFunction} test - asynchronous truth test to perform before each
 * execution of `fn`. Invoked with (...args, callback), where `...args` are the
 * non-error args from the previous callback of `fn`.
 * @param {Function} [callback] - A callback which is called after the test
 * function has failed and repeated execution of `fn` has stopped. `callback`
 * will be passed an error if one occurred, otherwise `null`.
 */
function doDuring(fn, test, callback) {
    callback = onlyOnce(callback || noop);
    var _fn = wrapAsync(fn);
    var _test = wrapAsync(test);

    function next(err/*, ...args*/) {
        if (err) return callback(err);
        var args = slice(arguments, 1);
        args.push(check);
        _test.apply(this, args);
    }

    function check(err, truth) {
        if (err) return callback(err);
        if (!truth) return callback(null);
        _fn(next);
    }

    check(null, true);

}

/**
 * The post-check version of [`whilst`]{@link module:ControlFlow.whilst}. To reflect the difference in
 * the order of operations, the arguments `test` and `iteratee` are switched.
 *
 * `doWhilst` is to `whilst` as `do while` is to `while` in plain JavaScript.
 *
 * @name doWhilst
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.whilst]{@link module:ControlFlow.whilst}
 * @category Control Flow
 * @param {AsyncFunction} iteratee - A function which is called each time `test`
 * passes. Invoked with (callback).
 * @param {Function} test - synchronous truth test to perform after each
 * execution of `iteratee`. Invoked with any non-error callback results of
 * `iteratee`.
 * @param {Function} [callback] - A callback which is called after the test
 * function has failed and repeated execution of `iteratee` has stopped.
 * `callback` will be passed an error and any arguments passed to the final
 * `iteratee`'s callback. Invoked with (err, [results]);
 */
function doWhilst(iteratee, test, callback) {
    callback = onlyOnce(callback || noop);
    var _iteratee = wrapAsync(iteratee);
    var next = function(err/*, ...args*/) {
        if (err) return callback(err);
        var args = slice(arguments, 1);
        if (test.apply(this, args)) return _iteratee(next);
        callback.apply(null, [null].concat(args));
    };
    _iteratee(next);
}

/**
 * Like ['doWhilst']{@link module:ControlFlow.doWhilst}, except the `test` is inverted. Note the
 * argument ordering differs from `until`.
 *
 * @name doUntil
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.doWhilst]{@link module:ControlFlow.doWhilst}
 * @category Control Flow
 * @param {AsyncFunction} iteratee - An async function which is called each time
 * `test` fails. Invoked with (callback).
 * @param {Function} test - synchronous truth test to perform after each
 * execution of `iteratee`. Invoked with any non-error callback results of
 * `iteratee`.
 * @param {Function} [callback] - A callback which is called after the test
 * function has passed and repeated execution of `iteratee` has stopped. `callback`
 * will be passed an error and any arguments passed to the final `iteratee`'s
 * callback. Invoked with (err, [results]);
 */
function doUntil(iteratee, test, callback) {
    doWhilst(iteratee, function() {
        return !test.apply(this, arguments);
    }, callback);
}

/**
 * Like [`whilst`]{@link module:ControlFlow.whilst}, except the `test` is an asynchronous function that
 * is passed a callback in the form of `function (err, truth)`. If error is
 * passed to `test` or `fn`, the main callback is immediately called with the
 * value of the error.
 *
 * @name during
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.whilst]{@link module:ControlFlow.whilst}
 * @category Control Flow
 * @param {AsyncFunction} test - asynchronous truth test to perform before each
 * execution of `fn`. Invoked with (callback).
 * @param {AsyncFunction} fn - An async function which is called each time
 * `test` passes. Invoked with (callback).
 * @param {Function} [callback] - A callback which is called after the test
 * function has failed and repeated execution of `fn` has stopped. `callback`
 * will be passed an error, if one occurred, otherwise `null`.
 * @example
 *
 * var count = 0;
 *
 * async.during(
 *     function (callback) {
 *         return callback(null, count < 5);
 *     },
 *     function (callback) {
 *         count++;
 *         setTimeout(callback, 1000);
 *     },
 *     function (err) {
 *         // 5 seconds have passed
 *     }
 * );
 */
function during(test, fn, callback) {
    callback = onlyOnce(callback || noop);
    var _fn = wrapAsync(fn);
    var _test = wrapAsync(test);

    function next(err) {
        if (err) return callback(err);
        _test(check);
    }

    function check(err, truth) {
        if (err) return callback(err);
        if (!truth) return callback(null);
        _fn(next);
    }

    _test(check);
}

function _withoutIndex(iteratee) {
    return function (value, index, callback) {
        return iteratee(value, callback);
    };
}

/**
 * Applies the function `iteratee` to each item in `coll`, in parallel.
 * The `iteratee` is called with an item from the list, and a callback for when
 * it has finished. If the `iteratee` passes an error to its `callback`, the
 * main `callback` (for the `each` function) is immediately called with the
 * error.
 *
 * Note, that since this function applies `iteratee` to each item in parallel,
 * there is no guarantee that the iteratee functions will complete in order.
 *
 * @name each
 * @static
 * @memberOf module:Collections
 * @method
 * @alias forEach
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {AsyncFunction} iteratee - An async function to apply to
 * each item in `coll`. Invoked with (item, callback).
 * The array index is not passed to the iteratee.
 * If you need the index, use `eachOf`.
 * @param {Function} [callback] - A callback which is called when all
 * `iteratee` functions have finished, or an error occurs. Invoked with (err).
 * @example
 *
 * // assuming openFiles is an array of file names and saveFile is a function
 * // to save the modified contents of that file:
 *
 * async.each(openFiles, saveFile, function(err){
 *   // if any of the saves produced an error, err would equal that error
 * });
 *
 * // assuming openFiles is an array of file names
 * async.each(openFiles, function(file, callback) {
 *
 *     // Perform operation on file here.
 *     console.log('Processing file ' + file);
 *
 *     if( file.length > 32 ) {
 *       console.log('This file name is too long');
 *       callback('File name too long');
 *     } else {
 *       // Do work to process file here
 *       console.log('File processed');
 *       callback();
 *     }
 * }, function(err) {
 *     // if any of the file processing produced an error, err would equal that error
 *     if( err ) {
 *       // One of the iterations produced an error.
 *       // All processing will now stop.
 *       console.log('A file failed to process');
 *     } else {
 *       console.log('All files have been processed successfully');
 *     }
 * });
 */
function eachLimit(coll, iteratee, callback) {
    eachOf(coll, _withoutIndex(wrapAsync(iteratee)), callback);
}

/**
 * The same as [`each`]{@link module:Collections.each} but runs a maximum of `limit` async operations at a time.
 *
 * @name eachLimit
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.each]{@link module:Collections.each}
 * @alias forEachLimit
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {AsyncFunction} iteratee - An async function to apply to each item in
 * `coll`.
 * The array index is not passed to the iteratee.
 * If you need the index, use `eachOfLimit`.
 * Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called when all
 * `iteratee` functions have finished, or an error occurs. Invoked with (err).
 */
function eachLimit$1(coll, limit, iteratee, callback) {
    _eachOfLimit(limit)(coll, _withoutIndex(wrapAsync(iteratee)), callback);
}

/**
 * The same as [`each`]{@link module:Collections.each} but runs only a single async operation at a time.
 *
 * @name eachSeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.each]{@link module:Collections.each}
 * @alias forEachSeries
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {AsyncFunction} iteratee - An async function to apply to each
 * item in `coll`.
 * The array index is not passed to the iteratee.
 * If you need the index, use `eachOfSeries`.
 * Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called when all
 * `iteratee` functions have finished, or an error occurs. Invoked with (err).
 */
var eachSeries = doLimit(eachLimit$1, 1);

/**
 * Wrap an async function and ensure it calls its callback on a later tick of
 * the event loop.  If the function already calls its callback on a next tick,
 * no extra deferral is added. This is useful for preventing stack overflows
 * (`RangeError: Maximum call stack size exceeded`) and generally keeping
 * [Zalgo](http://blog.izs.me/post/59142742143/designing-apis-for-asynchrony)
 * contained. ES2017 `async` functions are returned as-is -- they are immune
 * to Zalgo's corrupting influences, as they always resolve on a later tick.
 *
 * @name ensureAsync
 * @static
 * @memberOf module:Utils
 * @method
 * @category Util
 * @param {AsyncFunction} fn - an async function, one that expects a node-style
 * callback as its last argument.
 * @returns {AsyncFunction} Returns a wrapped function with the exact same call
 * signature as the function passed in.
 * @example
 *
 * function sometimesAsync(arg, callback) {
 *     if (cache[arg]) {
 *         return callback(null, cache[arg]); // this would be synchronous!!
 *     } else {
 *         doSomeIO(arg, callback); // this IO would be asynchronous
 *     }
 * }
 *
 * // this has a risk of stack overflows if many results are cached in a row
 * async.mapSeries(args, sometimesAsync, done);
 *
 * // this will defer sometimesAsync's callback if necessary,
 * // preventing stack overflows
 * async.mapSeries(args, async.ensureAsync(sometimesAsync), done);
 */
function ensureAsync(fn) {
    if (isAsync(fn)) return fn;
    return initialParams(function (args, callback) {
        var sync = true;
        args.push(function () {
            var innerArgs = arguments;
            if (sync) {
                setImmediate$1(function () {
                    callback.apply(null, innerArgs);
                });
            } else {
                callback.apply(null, innerArgs);
            }
        });
        fn.apply(this, args);
        sync = false;
    });
}

function notId(v) {
    return !v;
}

/**
 * Returns `true` if every element in `coll` satisfies an async test. If any
 * iteratee call returns `false`, the main `callback` is immediately called.
 *
 * @name every
 * @static
 * @memberOf module:Collections
 * @method
 * @alias all
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {AsyncFunction} iteratee - An async truth test to apply to each item
 * in the collection in parallel.
 * The iteratee must complete with a boolean result value.
 * Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Result will be either `true` or `false`
 * depending on the values of the async tests. Invoked with (err, result).
 * @example
 *
 * async.every(['file1','file2','file3'], function(filePath, callback) {
 *     fs.access(filePath, function(err) {
 *         callback(null, !err)
 *     });
 * }, function(err, result) {
 *     // if result is true then every file exists
 * });
 */
var every = doParallel(_createTester(notId, notId));

/**
 * The same as [`every`]{@link module:Collections.every} but runs a maximum of `limit` async operations at a time.
 *
 * @name everyLimit
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.every]{@link module:Collections.every}
 * @alias allLimit
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {AsyncFunction} iteratee - An async truth test to apply to each item
 * in the collection in parallel.
 * The iteratee must complete with a boolean result value.
 * Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Result will be either `true` or `false`
 * depending on the values of the async tests. Invoked with (err, result).
 */
var everyLimit = doParallelLimit(_createTester(notId, notId));

/**
 * The same as [`every`]{@link module:Collections.every} but runs only a single async operation at a time.
 *
 * @name everySeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.every]{@link module:Collections.every}
 * @alias allSeries
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {AsyncFunction} iteratee - An async truth test to apply to each item
 * in the collection in series.
 * The iteratee must complete with a boolean result value.
 * Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Result will be either `true` or `false`
 * depending on the values of the async tests. Invoked with (err, result).
 */
var everySeries = doLimit(everyLimit, 1);

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new accessor function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

function filterArray(eachfn, arr, iteratee, callback) {
    var truthValues = new Array(arr.length);
    eachfn(arr, function (x, index, callback) {
        iteratee(x, function (err, v) {
            truthValues[index] = !!v;
            callback(err);
        });
    }, function (err) {
        if (err) return callback(err);
        var results = [];
        for (var i = 0; i < arr.length; i++) {
            if (truthValues[i]) results.push(arr[i]);
        }
        callback(null, results);
    });
}

function filterGeneric(eachfn, coll, iteratee, callback) {
    var results = [];
    eachfn(coll, function (x, index, callback) {
        iteratee(x, function (err, v) {
            if (err) {
                callback(err);
            } else {
                if (v) {
                    results.push({index: index, value: x});
                }
                callback();
            }
        });
    }, function (err) {
        if (err) {
            callback(err);
        } else {
            callback(null, arrayMap(results.sort(function (a, b) {
                return a.index - b.index;
            }), baseProperty('value')));
        }
    });
}

function _filter(eachfn, coll, iteratee, callback) {
    var filter = isArrayLike(coll) ? filterArray : filterGeneric;
    filter(eachfn, coll, wrapAsync(iteratee), callback || noop);
}

/**
 * Returns a new array of all the values in `coll` which pass an async truth
 * test. This operation is performed in parallel, but the results array will be
 * in the same order as the original.
 *
 * @name filter
 * @static
 * @memberOf module:Collections
 * @method
 * @alias select
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A truth test to apply to each item in `coll`.
 * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
 * with a boolean argument once it has completed. Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Invoked with (err, results).
 * @example
 *
 * async.filter(['file1','file2','file3'], function(filePath, callback) {
 *     fs.access(filePath, function(err) {
 *         callback(null, !err)
 *     });
 * }, function(err, results) {
 *     // results now equals an array of the existing files
 * });
 */
var filter = doParallel(_filter);

/**
 * The same as [`filter`]{@link module:Collections.filter} but runs a maximum of `limit` async operations at a
 * time.
 *
 * @name filterLimit
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.filter]{@link module:Collections.filter}
 * @alias selectLimit
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {Function} iteratee - A truth test to apply to each item in `coll`.
 * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
 * with a boolean argument once it has completed. Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Invoked with (err, results).
 */
var filterLimit = doParallelLimit(_filter);

/**
 * The same as [`filter`]{@link module:Collections.filter} but runs only a single async operation at a time.
 *
 * @name filterSeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.filter]{@link module:Collections.filter}
 * @alias selectSeries
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A truth test to apply to each item in `coll`.
 * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
 * with a boolean argument once it has completed. Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Invoked with (err, results)
 */
var filterSeries = doLimit(filterLimit, 1);

/**
 * Calls the asynchronous function `fn` with a callback parameter that allows it
 * to call itself again, in series, indefinitely.

 * If an error is passed to the callback then `errback` is called with the
 * error, and execution stops, otherwise it will never be called.
 *
 * @name forever
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {AsyncFunction} fn - an async function to call repeatedly.
 * Invoked with (next).
 * @param {Function} [errback] - when `fn` passes an error to it's callback,
 * this function will be called, and execution stops. Invoked with (err).
 * @example
 *
 * async.forever(
 *     function(next) {
 *         // next is suitable for passing to things that need a callback(err [, whatever]);
 *         // it will result in this function being called again.
 *     },
 *     function(err) {
 *         // if next is called with a value in its first parameter, it will appear
 *         // in here as 'err', and execution will stop.
 *     }
 * );
 */
function forever(fn, errback) {
    var done = onlyOnce(errback || noop);
    var task = wrapAsync(ensureAsync(fn));

    function next(err) {
        if (err) return done(err);
        task(next);
    }
    next();
}

/**
 * The same as [`groupBy`]{@link module:Collections.groupBy} but runs a maximum of `limit` async operations at a time.
 *
 * @name groupByLimit
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.groupBy]{@link module:Collections.groupBy}
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {AsyncFunction} iteratee - An async function to apply to each item in
 * `coll`.
 * The iteratee should complete with a `key` to group the value under.
 * Invoked with (value, callback).
 * @param {Function} [callback] - A callback which is called when all `iteratee`
 * functions have finished, or an error occurs. Result is an `Object` whoses
 * properties are arrays of values which returned the corresponding key.
 */
var groupByLimit = function(coll, limit, iteratee, callback) {
    callback = callback || noop;
    var _iteratee = wrapAsync(iteratee);
    mapLimit(coll, limit, function(val, callback) {
        _iteratee(val, function(err, key) {
            if (err) return callback(err);
            return callback(null, {key: key, val: val});
        });
    }, function(err, mapResults) {
        var result = {};
        // from MDN, handle object having an `hasOwnProperty` prop
        var hasOwnProperty = Object.prototype.hasOwnProperty;

        for (var i = 0; i < mapResults.length; i++) {
            if (mapResults[i]) {
                var key = mapResults[i].key;
                var val = mapResults[i].val;

                if (hasOwnProperty.call(result, key)) {
                    result[key].push(val);
                } else {
                    result[key] = [val];
                }
            }
        }

        return callback(err, result);
    });
};

/**
 * Returns a new object, where each value corresponds to an array of items, from
 * `coll`, that returned the corresponding key. That is, the keys of the object
 * correspond to the values passed to the `iteratee` callback.
 *
 * Note: Since this function applies the `iteratee` to each item in parallel,
 * there is no guarantee that the `iteratee` functions will complete in order.
 * However, the values for each key in the `result` will be in the same order as
 * the original `coll`. For Objects, the values will roughly be in the order of
 * the original Objects' keys (but this can vary across JavaScript engines).
 *
 * @name groupBy
 * @static
 * @memberOf module:Collections
 * @method
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {AsyncFunction} iteratee - An async function to apply to each item in
 * `coll`.
 * The iteratee should complete with a `key` to group the value under.
 * Invoked with (value, callback).
 * @param {Function} [callback] - A callback which is called when all `iteratee`
 * functions have finished, or an error occurs. Result is an `Object` whoses
 * properties are arrays of values which returned the corresponding key.
 * @example
 *
 * async.groupBy(['userId1', 'userId2', 'userId3'], function(userId, callback) {
 *     db.findById(userId, function(err, user) {
 *         if (err) return callback(err);
 *         return callback(null, user.age);
 *     });
 * }, function(err, result) {
 *     // result is object containing the userIds grouped by age
 *     // e.g. { 30: ['userId1', 'userId3'], 42: ['userId2']};
 * });
 */
var groupBy = doLimit(groupByLimit, Infinity);

/**
 * The same as [`groupBy`]{@link module:Collections.groupBy} but runs only a single async operation at a time.
 *
 * @name groupBySeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.groupBy]{@link module:Collections.groupBy}
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {AsyncFunction} iteratee - An async function to apply to each item in
 * `coll`.
 * The iteratee should complete with a `key` to group the value under.
 * Invoked with (value, callback).
 * @param {Function} [callback] - A callback which is called when all `iteratee`
 * functions have finished, or an error occurs. Result is an `Object` whoses
 * properties are arrays of values which returned the corresponding key.
 */
var groupBySeries = doLimit(groupByLimit, 1);

/**
 * Logs the result of an `async` function to the `console`. Only works in
 * Node.js or in browsers that support `console.log` and `console.error` (such
 * as FF and Chrome). If multiple arguments are returned from the async
 * function, `console.log` is called on each argument in order.
 *
 * @name log
 * @static
 * @memberOf module:Utils
 * @method
 * @category Util
 * @param {AsyncFunction} function - The function you want to eventually apply
 * all arguments to.
 * @param {...*} arguments... - Any number of arguments to apply to the function.
 * @example
 *
 * // in a module
 * var hello = function(name, callback) {
 *     setTimeout(function() {
 *         callback(null, 'hello ' + name);
 *     }, 1000);
 * };
 *
 * // in the node repl
 * node> async.log(hello, 'world');
 * 'hello world'
 */
var log = consoleFunc('log');

/**
 * The same as [`mapValues`]{@link module:Collections.mapValues} but runs a maximum of `limit` async operations at a
 * time.
 *
 * @name mapValuesLimit
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.mapValues]{@link module:Collections.mapValues}
 * @category Collection
 * @param {Object} obj - A collection to iterate over.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {AsyncFunction} iteratee - A function to apply to each value and key
 * in `coll`.
 * The iteratee should complete with the transformed value as its result.
 * Invoked with (value, key, callback).
 * @param {Function} [callback] - A callback which is called when all `iteratee`
 * functions have finished, or an error occurs. `result` is a new object consisting
 * of each key from `obj`, with each transformed value on the right-hand side.
 * Invoked with (err, result).
 */
function mapValuesLimit(obj, limit, iteratee, callback) {
    callback = once(callback || noop);
    var newObj = {};
    var _iteratee = wrapAsync(iteratee);
    eachOfLimit(obj, limit, function(val, key, next) {
        _iteratee(val, key, function (err, result) {
            if (err) return next(err);
            newObj[key] = result;
            next();
        });
    }, function (err) {
        callback(err, newObj);
    });
}

/**
 * A relative of [`map`]{@link module:Collections.map}, designed for use with objects.
 *
 * Produces a new Object by mapping each value of `obj` through the `iteratee`
 * function. The `iteratee` is called each `value` and `key` from `obj` and a
 * callback for when it has finished processing. Each of these callbacks takes
 * two arguments: an `error`, and the transformed item from `obj`. If `iteratee`
 * passes an error to its callback, the main `callback` (for the `mapValues`
 * function) is immediately called with the error.
 *
 * Note, the order of the keys in the result is not guaranteed.  The keys will
 * be roughly in the order they complete, (but this is very engine-specific)
 *
 * @name mapValues
 * @static
 * @memberOf module:Collections
 * @method
 * @category Collection
 * @param {Object} obj - A collection to iterate over.
 * @param {AsyncFunction} iteratee - A function to apply to each value and key
 * in `coll`.
 * The iteratee should complete with the transformed value as its result.
 * Invoked with (value, key, callback).
 * @param {Function} [callback] - A callback which is called when all `iteratee`
 * functions have finished, or an error occurs. `result` is a new object consisting
 * of each key from `obj`, with each transformed value on the right-hand side.
 * Invoked with (err, result).
 * @example
 *
 * async.mapValues({
 *     f1: 'file1',
 *     f2: 'file2',
 *     f3: 'file3'
 * }, function (file, key, callback) {
 *   fs.stat(file, callback);
 * }, function(err, result) {
 *     // result is now a map of stats for each file, e.g.
 *     // {
 *     //     f1: [stats for file1],
 *     //     f2: [stats for file2],
 *     //     f3: [stats for file3]
 *     // }
 * });
 */

var mapValues = doLimit(mapValuesLimit, Infinity);

/**
 * The same as [`mapValues`]{@link module:Collections.mapValues} but runs only a single async operation at a time.
 *
 * @name mapValuesSeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.mapValues]{@link module:Collections.mapValues}
 * @category Collection
 * @param {Object} obj - A collection to iterate over.
 * @param {AsyncFunction} iteratee - A function to apply to each value and key
 * in `coll`.
 * The iteratee should complete with the transformed value as its result.
 * Invoked with (value, key, callback).
 * @param {Function} [callback] - A callback which is called when all `iteratee`
 * functions have finished, or an error occurs. `result` is a new object consisting
 * of each key from `obj`, with each transformed value on the right-hand side.
 * Invoked with (err, result).
 */
var mapValuesSeries = doLimit(mapValuesLimit, 1);

function has(obj, key) {
    return key in obj;
}

/**
 * Caches the results of an async function. When creating a hash to store
 * function results against, the callback is omitted from the hash and an
 * optional hash function can be used.
 *
 * If no hash function is specified, the first argument is used as a hash key,
 * which may work reasonably if it is a string or a data type that converts to a
 * distinct string. Note that objects and arrays will not behave reasonably.
 * Neither will cases where the other arguments are significant. In such cases,
 * specify your own hash function.
 *
 * The cache of results is exposed as the `memo` property of the function
 * returned by `memoize`.
 *
 * @name memoize
 * @static
 * @memberOf module:Utils
 * @method
 * @category Util
 * @param {AsyncFunction} fn - The async function to proxy and cache results from.
 * @param {Function} hasher - An optional function for generating a custom hash
 * for storing results. It has all the arguments applied to it apart from the
 * callback, and must be synchronous.
 * @returns {AsyncFunction} a memoized version of `fn`
 * @example
 *
 * var slow_fn = function(name, callback) {
 *     // do something
 *     callback(null, result);
 * };
 * var fn = async.memoize(slow_fn);
 *
 * // fn can now be used as if it were slow_fn
 * fn('some name', function() {
 *     // callback
 * });
 */
function memoize(fn, hasher) {
    var memo = Object.create(null);
    var queues = Object.create(null);
    hasher = hasher || identity;
    var _fn = wrapAsync(fn);
    var memoized = initialParams(function memoized(args, callback) {
        var key = hasher.apply(null, args);
        if (has(memo, key)) {
            setImmediate$1(function() {
                callback.apply(null, memo[key]);
            });
        } else if (has(queues, key)) {
            queues[key].push(callback);
        } else {
            queues[key] = [callback];
            _fn.apply(null, args.concat(function(/*args*/) {
                var args = slice(arguments);
                memo[key] = args;
                var q = queues[key];
                delete queues[key];
                for (var i = 0, l = q.length; i < l; i++) {
                    q[i].apply(null, args);
                }
            }));
        }
    });
    memoized.memo = memo;
    memoized.unmemoized = fn;
    return memoized;
}

/**
 * Calls `callback` on a later loop around the event loop. In Node.js this just
 * calls `process.nextTick`.  In the browser it will use `setImmediate` if
 * available, otherwise `setTimeout(callback, 0)`, which means other higher
 * priority events may precede the execution of `callback`.
 *
 * This is used internally for browser-compatibility purposes.
 *
 * @name nextTick
 * @static
 * @memberOf module:Utils
 * @method
 * @see [async.setImmediate]{@link module:Utils.setImmediate}
 * @category Util
 * @param {Function} callback - The function to call on a later loop around
 * the event loop. Invoked with (args...).
 * @param {...*} args... - any number of additional arguments to pass to the
 * callback on the next tick.
 * @example
 *
 * var call_order = [];
 * async.nextTick(function() {
 *     call_order.push('two');
 *     // call_order now equals ['one','two']
 * });
 * call_order.push('one');
 *
 * async.setImmediate(function (a, b, c) {
 *     // a, b, and c equal 1, 2, and 3
 * }, 1, 2, 3);
 */
var _defer$1;

if (hasNextTick) {
    _defer$1 = process.nextTick;
} else if (hasSetImmediate) {
    _defer$1 = setImmediate;
} else {
    _defer$1 = fallback;
}

var nextTick = wrap(_defer$1);

function _parallel(eachfn, tasks, callback) {
    callback = callback || noop;
    var results = isArrayLike(tasks) ? [] : {};

    eachfn(tasks, function (task, key, callback) {
        wrapAsync(task)(function (err, result) {
            if (arguments.length > 2) {
                result = slice(arguments, 1);
            }
            results[key] = result;
            callback(err);
        });
    }, function (err) {
        callback(err, results);
    });
}

/**
 * Run the `tasks` collection of functions in parallel, without waiting until
 * the previous function has completed. If any of the functions pass an error to
 * its callback, the main `callback` is immediately called with the value of the
 * error. Once the `tasks` have completed, the results are passed to the final
 * `callback` as an array.
 *
 * **Note:** `parallel` is about kicking-off I/O tasks in parallel, not about
 * parallel execution of code.  If your tasks do not use any timers or perform
 * any I/O, they will actually be executed in series.  Any synchronous setup
 * sections for each task will happen one after the other.  JavaScript remains
 * single-threaded.
 *
 * **Hint:** Use [`reflect`]{@link module:Utils.reflect} to continue the
 * execution of other tasks when a task fails.
 *
 * It is also possible to use an object instead of an array. Each property will
 * be run as a function and the results will be passed to the final `callback`
 * as an object instead of an array. This can be a more readable way of handling
 * results from {@link async.parallel}.
 *
 * @name parallel
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {Array|Iterable|Object} tasks - A collection of
 * [async functions]{@link AsyncFunction} to run.
 * Each async function can complete with any number of optional `result` values.
 * @param {Function} [callback] - An optional callback to run once all the
 * functions have completed successfully. This function gets a results array
 * (or object) containing all the result arguments passed to the task callbacks.
 * Invoked with (err, results).
 *
 * @example
 * async.parallel([
 *     function(callback) {
 *         setTimeout(function() {
 *             callback(null, 'one');
 *         }, 200);
 *     },
 *     function(callback) {
 *         setTimeout(function() {
 *             callback(null, 'two');
 *         }, 100);
 *     }
 * ],
 * // optional callback
 * function(err, results) {
 *     // the results array will equal ['one','two'] even though
 *     // the second function had a shorter timeout.
 * });
 *
 * // an example using an object instead of an array
 * async.parallel({
 *     one: function(callback) {
 *         setTimeout(function() {
 *             callback(null, 1);
 *         }, 200);
 *     },
 *     two: function(callback) {
 *         setTimeout(function() {
 *             callback(null, 2);
 *         }, 100);
 *     }
 * }, function(err, results) {
 *     // results is now equals to: {one: 1, two: 2}
 * });
 */
function parallelLimit(tasks, callback) {
    _parallel(eachOf, tasks, callback);
}

/**
 * The same as [`parallel`]{@link module:ControlFlow.parallel} but runs a maximum of `limit` async operations at a
 * time.
 *
 * @name parallelLimit
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.parallel]{@link module:ControlFlow.parallel}
 * @category Control Flow
 * @param {Array|Iterable|Object} tasks - A collection of
 * [async functions]{@link AsyncFunction} to run.
 * Each async function can complete with any number of optional `result` values.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {Function} [callback] - An optional callback to run once all the
 * functions have completed successfully. This function gets a results array
 * (or object) containing all the result arguments passed to the task callbacks.
 * Invoked with (err, results).
 */
function parallelLimit$1(tasks, limit, callback) {
    _parallel(_eachOfLimit(limit), tasks, callback);
}

/**
 * A queue of tasks for the worker function to complete.
 * @typedef {Object} QueueObject
 * @memberOf module:ControlFlow
 * @property {Function} length - a function returning the number of items
 * waiting to be processed. Invoke with `queue.length()`.
 * @property {boolean} started - a boolean indicating whether or not any
 * items have been pushed and processed by the queue.
 * @property {Function} running - a function returning the number of items
 * currently being processed. Invoke with `queue.running()`.
 * @property {Function} workersList - a function returning the array of items
 * currently being processed. Invoke with `queue.workersList()`.
 * @property {Function} idle - a function returning false if there are items
 * waiting or being processed, or true if not. Invoke with `queue.idle()`.
 * @property {number} concurrency - an integer for determining how many `worker`
 * functions should be run in parallel. This property can be changed after a
 * `queue` is created to alter the concurrency on-the-fly.
 * @property {Function} push - add a new task to the `queue`. Calls `callback`
 * once the `worker` has finished processing the task. Instead of a single task,
 * a `tasks` array can be submitted. The respective callback is used for every
 * task in the list. Invoke with `queue.push(task, [callback])`,
 * @property {Function} unshift - add a new task to the front of the `queue`.
 * Invoke with `queue.unshift(task, [callback])`.
 * @property {Function} remove - remove items from the queue that match a test
 * function.  The test function will be passed an object with a `data` property,
 * and a `priority` property, if this is a
 * [priorityQueue]{@link module:ControlFlow.priorityQueue} object.
 * Invoked with `queue.remove(testFn)`, where `testFn` is of the form
 * `function ({data, priority}) {}` and returns a Boolean.
 * @property {Function} saturated - a callback that is called when the number of
 * running workers hits the `concurrency` limit, and further tasks will be
 * queued.
 * @property {Function} unsaturated - a callback that is called when the number
 * of running workers is less than the `concurrency` & `buffer` limits, and
 * further tasks will not be queued.
 * @property {number} buffer - A minimum threshold buffer in order to say that
 * the `queue` is `unsaturated`.
 * @property {Function} empty - a callback that is called when the last item
 * from the `queue` is given to a `worker`.
 * @property {Function} drain - a callback that is called when the last item
 * from the `queue` has returned from the `worker`.
 * @property {Function} error - a callback that is called when a task errors.
 * Has the signature `function(error, task)`.
 * @property {boolean} paused - a boolean for determining whether the queue is
 * in a paused state.
 * @property {Function} pause - a function that pauses the processing of tasks
 * until `resume()` is called. Invoke with `queue.pause()`.
 * @property {Function} resume - a function that resumes the processing of
 * queued tasks when the queue is paused. Invoke with `queue.resume()`.
 * @property {Function} kill - a function that removes the `drain` callback and
 * empties remaining tasks from the queue forcing it to go idle. No more tasks
 * should be pushed to the queue after calling this function. Invoke with `queue.kill()`.
 */

/**
 * Creates a `queue` object with the specified `concurrency`. Tasks added to the
 * `queue` are processed in parallel (up to the `concurrency` limit). If all
 * `worker`s are in progress, the task is queued until one becomes available.
 * Once a `worker` completes a `task`, that `task`'s callback is called.
 *
 * @name queue
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {AsyncFunction} worker - An async function for processing a queued task.
 * If you want to handle errors from an individual task, pass a callback to
 * `q.push()`. Invoked with (task, callback).
 * @param {number} [concurrency=1] - An `integer` for determining how many
 * `worker` functions should be run in parallel.  If omitted, the concurrency
 * defaults to `1`.  If the concurrency is `0`, an error is thrown.
 * @returns {module:ControlFlow.QueueObject} A queue object to manage the tasks. Callbacks can
 * attached as certain properties to listen for specific events during the
 * lifecycle of the queue.
 * @example
 *
 * // create a queue object with concurrency 2
 * var q = async.queue(function(task, callback) {
 *     console.log('hello ' + task.name);
 *     callback();
 * }, 2);
 *
 * // assign a callback
 * q.drain = function() {
 *     console.log('all items have been processed');
 * };
 *
 * // add some items to the queue
 * q.push({name: 'foo'}, function(err) {
 *     console.log('finished processing foo');
 * });
 * q.push({name: 'bar'}, function (err) {
 *     console.log('finished processing bar');
 * });
 *
 * // add some items to the queue (batch-wise)
 * q.push([{name: 'baz'},{name: 'bay'},{name: 'bax'}], function(err) {
 *     console.log('finished processing item');
 * });
 *
 * // add some items to the front of the queue
 * q.unshift({name: 'bar'}, function (err) {
 *     console.log('finished processing bar');
 * });
 */
var queue$1 = function (worker, concurrency) {
    var _worker = wrapAsync(worker);
    return queue(function (items, cb) {
        _worker(items[0], cb);
    }, concurrency, 1);
};

/**
 * The same as [async.queue]{@link module:ControlFlow.queue} only tasks are assigned a priority and
 * completed in ascending priority order.
 *
 * @name priorityQueue
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.queue]{@link module:ControlFlow.queue}
 * @category Control Flow
 * @param {AsyncFunction} worker - An async function for processing a queued task.
 * If you want to handle errors from an individual task, pass a callback to
 * `q.push()`.
 * Invoked with (task, callback).
 * @param {number} concurrency - An `integer` for determining how many `worker`
 * functions should be run in parallel.  If omitted, the concurrency defaults to
 * `1`.  If the concurrency is `0`, an error is thrown.
 * @returns {module:ControlFlow.QueueObject} A priorityQueue object to manage the tasks. There are two
 * differences between `queue` and `priorityQueue` objects:
 * * `push(task, priority, [callback])` - `priority` should be a number. If an
 *   array of `tasks` is given, all tasks will be assigned the same priority.
 * * The `unshift` method was removed.
 */
var priorityQueue = function(worker, concurrency) {
    // Start with a normal queue
    var q = queue$1(worker, concurrency);

    // Override push to accept second parameter representing priority
    q.push = function(data, priority, callback) {
        if (callback == null) callback = noop;
        if (typeof callback !== 'function') {
            throw new Error('task callback must be a function');
        }
        q.started = true;
        if (!isArray(data)) {
            data = [data];
        }
        if (data.length === 0) {
            // call drain immediately if there are no tasks
            return setImmediate$1(function() {
                q.drain();
            });
        }

        priority = priority || 0;
        var nextNode = q._tasks.head;
        while (nextNode && priority >= nextNode.priority) {
            nextNode = nextNode.next;
        }

        for (var i = 0, l = data.length; i < l; i++) {
            var item = {
                data: data[i],
                priority: priority,
                callback: callback
            };

            if (nextNode) {
                q._tasks.insertBefore(nextNode, item);
            } else {
                q._tasks.push(item);
            }
        }
        setImmediate$1(q.process);
    };

    // Remove unshift function
    delete q.unshift;

    return q;
};

/**
 * Runs the `tasks` array of functions in parallel, without waiting until the
 * previous function has completed. Once any of the `tasks` complete or pass an
 * error to its callback, the main `callback` is immediately called. It's
 * equivalent to `Promise.race()`.
 *
 * @name race
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {Array} tasks - An array containing [async functions]{@link AsyncFunction}
 * to run. Each function can complete with an optional `result` value.
 * @param {Function} callback - A callback to run once any of the functions have
 * completed. This function gets an error or result from the first function that
 * completed. Invoked with (err, result).
 * @returns undefined
 * @example
 *
 * async.race([
 *     function(callback) {
 *         setTimeout(function() {
 *             callback(null, 'one');
 *         }, 200);
 *     },
 *     function(callback) {
 *         setTimeout(function() {
 *             callback(null, 'two');
 *         }, 100);
 *     }
 * ],
 * // main callback
 * function(err, result) {
 *     // the result will be equal to 'two' as it finishes earlier
 * });
 */
function race(tasks, callback) {
    callback = once(callback || noop);
    if (!isArray(tasks)) return callback(new TypeError('First argument to race must be an array of functions'));
    if (!tasks.length) return callback();
    for (var i = 0, l = tasks.length; i < l; i++) {
        wrapAsync(tasks[i])(callback);
    }
}

/**
 * Same as [`reduce`]{@link module:Collections.reduce}, only operates on `array` in reverse order.
 *
 * @name reduceRight
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.reduce]{@link module:Collections.reduce}
 * @alias foldr
 * @category Collection
 * @param {Array} array - A collection to iterate over.
 * @param {*} memo - The initial state of the reduction.
 * @param {AsyncFunction} iteratee - A function applied to each item in the
 * array to produce the next step in the reduction.
 * The `iteratee` should complete with the next state of the reduction.
 * If the iteratee complete with an error, the reduction is stopped and the
 * main `callback` is immediately called with the error.
 * Invoked with (memo, item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Result is the reduced value. Invoked with
 * (err, result).
 */
function reduceRight (array, memo, iteratee, callback) {
    var reversed = slice(array).reverse();
    reduce(reversed, memo, iteratee, callback);
}

/**
 * Wraps the async function in another function that always completes with a
 * result object, even when it errors.
 *
 * The result object has either the property `error` or `value`.
 *
 * @name reflect
 * @static
 * @memberOf module:Utils
 * @method
 * @category Util
 * @param {AsyncFunction} fn - The async function you want to wrap
 * @returns {Function} - A function that always passes null to it's callback as
 * the error. The second argument to the callback will be an `object` with
 * either an `error` or a `value` property.
 * @example
 *
 * async.parallel([
 *     async.reflect(function(callback) {
 *         // do some stuff ...
 *         callback(null, 'one');
 *     }),
 *     async.reflect(function(callback) {
 *         // do some more stuff but error ...
 *         callback('bad stuff happened');
 *     }),
 *     async.reflect(function(callback) {
 *         // do some more stuff ...
 *         callback(null, 'two');
 *     })
 * ],
 * // optional callback
 * function(err, results) {
 *     // values
 *     // results[0].value = 'one'
 *     // results[1].error = 'bad stuff happened'
 *     // results[2].value = 'two'
 * });
 */
function reflect(fn) {
    var _fn = wrapAsync(fn);
    return initialParams(function reflectOn(args, reflectCallback) {
        args.push(function callback(error, cbArg) {
            if (error) {
                reflectCallback(null, { error: error });
            } else {
                var value;
                if (arguments.length <= 2) {
                    value = cbArg;
                } else {
                    value = slice(arguments, 1);
                }
                reflectCallback(null, { value: value });
            }
        });

        return _fn.apply(this, args);
    });
}

/**
 * A helper function that wraps an array or an object of functions with `reflect`.
 *
 * @name reflectAll
 * @static
 * @memberOf module:Utils
 * @method
 * @see [async.reflect]{@link module:Utils.reflect}
 * @category Util
 * @param {Array|Object|Iterable} tasks - The collection of
 * [async functions]{@link AsyncFunction} to wrap in `async.reflect`.
 * @returns {Array} Returns an array of async functions, each wrapped in
 * `async.reflect`
 * @example
 *
 * let tasks = [
 *     function(callback) {
 *         setTimeout(function() {
 *             callback(null, 'one');
 *         }, 200);
 *     },
 *     function(callback) {
 *         // do some more stuff but error ...
 *         callback(new Error('bad stuff happened'));
 *     },
 *     function(callback) {
 *         setTimeout(function() {
 *             callback(null, 'two');
 *         }, 100);
 *     }
 * ];
 *
 * async.parallel(async.reflectAll(tasks),
 * // optional callback
 * function(err, results) {
 *     // values
 *     // results[0].value = 'one'
 *     // results[1].error = Error('bad stuff happened')
 *     // results[2].value = 'two'
 * });
 *
 * // an example using an object instead of an array
 * let tasks = {
 *     one: function(callback) {
 *         setTimeout(function() {
 *             callback(null, 'one');
 *         }, 200);
 *     },
 *     two: function(callback) {
 *         callback('two');
 *     },
 *     three: function(callback) {
 *         setTimeout(function() {
 *             callback(null, 'three');
 *         }, 100);
 *     }
 * };
 *
 * async.parallel(async.reflectAll(tasks),
 * // optional callback
 * function(err, results) {
 *     // values
 *     // results.one.value = 'one'
 *     // results.two.error = 'two'
 *     // results.three.value = 'three'
 * });
 */
function reflectAll(tasks) {
    var results;
    if (isArray(tasks)) {
        results = arrayMap(tasks, reflect);
    } else {
        results = {};
        baseForOwn(tasks, function(task, key) {
            results[key] = reflect.call(this, task);
        });
    }
    return results;
}

function reject$1(eachfn, arr, iteratee, callback) {
    _filter(eachfn, arr, function(value, cb) {
        iteratee(value, function(err, v) {
            cb(err, !v);
        });
    }, callback);
}

/**
 * The opposite of [`filter`]{@link module:Collections.filter}. Removes values that pass an `async` truth test.
 *
 * @name reject
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.filter]{@link module:Collections.filter}
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - An async truth test to apply to each item in
 * `coll`.
 * The should complete with a boolean value as its `result`.
 * Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Invoked with (err, results).
 * @example
 *
 * async.reject(['file1','file2','file3'], function(filePath, callback) {
 *     fs.access(filePath, function(err) {
 *         callback(null, !err)
 *     });
 * }, function(err, results) {
 *     // results now equals an array of missing files
 *     createFiles(results);
 * });
 */
var reject = doParallel(reject$1);

/**
 * The same as [`reject`]{@link module:Collections.reject} but runs a maximum of `limit` async operations at a
 * time.
 *
 * @name rejectLimit
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.reject]{@link module:Collections.reject}
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {Function} iteratee - An async truth test to apply to each item in
 * `coll`.
 * The should complete with a boolean value as its `result`.
 * Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Invoked with (err, results).
 */
var rejectLimit = doParallelLimit(reject$1);

/**
 * The same as [`reject`]{@link module:Collections.reject} but runs only a single async operation at a time.
 *
 * @name rejectSeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.reject]{@link module:Collections.reject}
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - An async truth test to apply to each item in
 * `coll`.
 * The should complete with a boolean value as its `result`.
 * Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Invoked with (err, results).
 */
var rejectSeries = doLimit(rejectLimit, 1);

/**
 * Creates a function that returns `value`.
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Util
 * @param {*} value The value to return from the new function.
 * @returns {Function} Returns the new constant function.
 * @example
 *
 * var objects = _.times(2, _.constant({ 'a': 1 }));
 *
 * console.log(objects);
 * // => [{ 'a': 1 }, { 'a': 1 }]
 *
 * console.log(objects[0] === objects[1]);
 * // => true
 */
function constant$1(value) {
  return function() {
    return value;
  };
}

/**
 * Attempts to get a successful response from `task` no more than `times` times
 * before returning an error. If the task is successful, the `callback` will be
 * passed the result of the successful task. If all attempts fail, the callback
 * will be passed the error and result (if any) of the final attempt.
 *
 * @name retry
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @see [async.retryable]{@link module:ControlFlow.retryable}
 * @param {Object|number} [opts = {times: 5, interval: 0}| 5] - Can be either an
 * object with `times` and `interval` or a number.
 * * `times` - The number of attempts to make before giving up.  The default
 *   is `5`.
 * * `interval` - The time to wait between retries, in milliseconds.  The
 *   default is `0`. The interval may also be specified as a function of the
 *   retry count (see example).
 * * `errorFilter` - An optional synchronous function that is invoked on
 *   erroneous result. If it returns `true` the retry attempts will continue;
 *   if the function returns `false` the retry flow is aborted with the current
 *   attempt's error and result being returned to the final callback.
 *   Invoked with (err).
 * * If `opts` is a number, the number specifies the number of times to retry,
 *   with the default interval of `0`.
 * @param {AsyncFunction} task - An async function to retry.
 * Invoked with (callback).
 * @param {Function} [callback] - An optional callback which is called when the
 * task has succeeded, or after the final failed attempt. It receives the `err`
 * and `result` arguments of the last attempt at completing the `task`. Invoked
 * with (err, results).
 *
 * @example
 *
 * // The `retry` function can be used as a stand-alone control flow by passing
 * // a callback, as shown below:
 *
 * // try calling apiMethod 3 times
 * async.retry(3, apiMethod, function(err, result) {
 *     // do something with the result
 * });
 *
 * // try calling apiMethod 3 times, waiting 200 ms between each retry
 * async.retry({times: 3, interval: 200}, apiMethod, function(err, result) {
 *     // do something with the result
 * });
 *
 * // try calling apiMethod 10 times with exponential backoff
 * // (i.e. intervals of 100, 200, 400, 800, 1600, ... milliseconds)
 * async.retry({
 *   times: 10,
 *   interval: function(retryCount) {
 *     return 50 * Math.pow(2, retryCount);
 *   }
 * }, apiMethod, function(err, result) {
 *     // do something with the result
 * });
 *
 * // try calling apiMethod the default 5 times no delay between each retry
 * async.retry(apiMethod, function(err, result) {
 *     // do something with the result
 * });
 *
 * // try calling apiMethod only when error condition satisfies, all other
 * // errors will abort the retry control flow and return to final callback
 * async.retry({
 *   errorFilter: function(err) {
 *     return err.message === 'Temporary error'; // only retry on a specific error
 *   }
 * }, apiMethod, function(err, result) {
 *     // do something with the result
 * });
 *
 * // to retry individual methods that are not as reliable within other
 * // control flow functions, use the `retryable` wrapper:
 * async.auto({
 *     users: api.getUsers.bind(api),
 *     payments: async.retryable(3, api.getPayments.bind(api))
 * }, function(err, results) {
 *     // do something with the results
 * });
 *
 */
function retry(opts, task, callback) {
    var DEFAULT_TIMES = 5;
    var DEFAULT_INTERVAL = 0;

    var options = {
        times: DEFAULT_TIMES,
        intervalFunc: constant$1(DEFAULT_INTERVAL)
    };

    function parseTimes(acc, t) {
        if (typeof t === 'object') {
            acc.times = +t.times || DEFAULT_TIMES;

            acc.intervalFunc = typeof t.interval === 'function' ?
                t.interval :
                constant$1(+t.interval || DEFAULT_INTERVAL);

            acc.errorFilter = t.errorFilter;
        } else if (typeof t === 'number' || typeof t === 'string') {
            acc.times = +t || DEFAULT_TIMES;
        } else {
            throw new Error("Invalid arguments for async.retry");
        }
    }

    if (arguments.length < 3 && typeof opts === 'function') {
        callback = task || noop;
        task = opts;
    } else {
        parseTimes(options, opts);
        callback = callback || noop;
    }

    if (typeof task !== 'function') {
        throw new Error("Invalid arguments for async.retry");
    }

    var _task = wrapAsync(task);

    var attempt = 1;
    function retryAttempt() {
        _task(function(err) {
            if (err && attempt++ < options.times &&
                (typeof options.errorFilter != 'function' ||
                    options.errorFilter(err))) {
                setTimeout(retryAttempt, options.intervalFunc(attempt));
            } else {
                callback.apply(null, arguments);
            }
        });
    }

    retryAttempt();
}

/**
 * A close relative of [`retry`]{@link module:ControlFlow.retry}.  This method
 * wraps a task and makes it retryable, rather than immediately calling it
 * with retries.
 *
 * @name retryable
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.retry]{@link module:ControlFlow.retry}
 * @category Control Flow
 * @param {Object|number} [opts = {times: 5, interval: 0}| 5] - optional
 * options, exactly the same as from `retry`
 * @param {AsyncFunction} task - the asynchronous function to wrap.
 * This function will be passed any arguments passed to the returned wrapper.
 * Invoked with (...args, callback).
 * @returns {AsyncFunction} The wrapped function, which when invoked, will
 * retry on an error, based on the parameters specified in `opts`.
 * This function will accept the same parameters as `task`.
 * @example
 *
 * async.auto({
 *     dep1: async.retryable(3, getFromFlakyService),
 *     process: ["dep1", async.retryable(3, function (results, cb) {
 *         maybeProcessData(results.dep1, cb);
 *     })]
 * }, callback);
 */
var retryable = function (opts, task) {
    if (!task) {
        task = opts;
        opts = null;
    }
    var _task = wrapAsync(task);
    return initialParams(function (args, callback) {
        function taskFn(cb) {
            _task.apply(null, args.concat(cb));
        }

        if (opts) retry(opts, taskFn, callback);
        else retry(taskFn, callback);

    });
};

/**
 * Run the functions in the `tasks` collection in series, each one running once
 * the previous function has completed. If any functions in the series pass an
 * error to its callback, no more functions are run, and `callback` is
 * immediately called with the value of the error. Otherwise, `callback`
 * receives an array of results when `tasks` have completed.
 *
 * It is also possible to use an object instead of an array. Each property will
 * be run as a function, and the results will be passed to the final `callback`
 * as an object instead of an array. This can be a more readable way of handling
 *  results from {@link async.series}.
 *
 * **Note** that while many implementations preserve the order of object
 * properties, the [ECMAScript Language Specification](http://www.ecma-international.org/ecma-262/5.1/#sec-8.6)
 * explicitly states that
 *
 * > The mechanics and order of enumerating the properties is not specified.
 *
 * So if you rely on the order in which your series of functions are executed,
 * and want this to work on all platforms, consider using an array.
 *
 * @name series
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {Array|Iterable|Object} tasks - A collection containing
 * [async functions]{@link AsyncFunction} to run in series.
 * Each function can complete with any number of optional `result` values.
 * @param {Function} [callback] - An optional callback to run once all the
 * functions have completed. This function gets a results array (or object)
 * containing all the result arguments passed to the `task` callbacks. Invoked
 * with (err, result).
 * @example
 * async.series([
 *     function(callback) {
 *         // do some stuff ...
 *         callback(null, 'one');
 *     },
 *     function(callback) {
 *         // do some more stuff ...
 *         callback(null, 'two');
 *     }
 * ],
 * // optional callback
 * function(err, results) {
 *     // results is now equal to ['one', 'two']
 * });
 *
 * async.series({
 *     one: function(callback) {
 *         setTimeout(function() {
 *             callback(null, 1);
 *         }, 200);
 *     },
 *     two: function(callback){
 *         setTimeout(function() {
 *             callback(null, 2);
 *         }, 100);
 *     }
 * }, function(err, results) {
 *     // results is now equal to: {one: 1, two: 2}
 * });
 */
function series(tasks, callback) {
    _parallel(eachOfSeries, tasks, callback);
}

/**
 * Returns `true` if at least one element in the `coll` satisfies an async test.
 * If any iteratee call returns `true`, the main `callback` is immediately
 * called.
 *
 * @name some
 * @static
 * @memberOf module:Collections
 * @method
 * @alias any
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {AsyncFunction} iteratee - An async truth test to apply to each item
 * in the collections in parallel.
 * The iteratee should complete with a boolean `result` value.
 * Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called as soon as any
 * iteratee returns `true`, or after all the iteratee functions have finished.
 * Result will be either `true` or `false` depending on the values of the async
 * tests. Invoked with (err, result).
 * @example
 *
 * async.some(['file1','file2','file3'], function(filePath, callback) {
 *     fs.access(filePath, function(err) {
 *         callback(null, !err)
 *     });
 * }, function(err, result) {
 *     // if result is true then at least one of the files exists
 * });
 */
var some = doParallel(_createTester(Boolean, identity));

/**
 * The same as [`some`]{@link module:Collections.some} but runs a maximum of `limit` async operations at a time.
 *
 * @name someLimit
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.some]{@link module:Collections.some}
 * @alias anyLimit
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {AsyncFunction} iteratee - An async truth test to apply to each item
 * in the collections in parallel.
 * The iteratee should complete with a boolean `result` value.
 * Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called as soon as any
 * iteratee returns `true`, or after all the iteratee functions have finished.
 * Result will be either `true` or `false` depending on the values of the async
 * tests. Invoked with (err, result).
 */
var someLimit = doParallelLimit(_createTester(Boolean, identity));

/**
 * The same as [`some`]{@link module:Collections.some} but runs only a single async operation at a time.
 *
 * @name someSeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.some]{@link module:Collections.some}
 * @alias anySeries
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {AsyncFunction} iteratee - An async truth test to apply to each item
 * in the collections in series.
 * The iteratee should complete with a boolean `result` value.
 * Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called as soon as any
 * iteratee returns `true`, or after all the iteratee functions have finished.
 * Result will be either `true` or `false` depending on the values of the async
 * tests. Invoked with (err, result).
 */
var someSeries = doLimit(someLimit, 1);

/**
 * Sorts a list by the results of running each `coll` value through an async
 * `iteratee`.
 *
 * @name sortBy
 * @static
 * @memberOf module:Collections
 * @method
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {AsyncFunction} iteratee - An async function to apply to each item in
 * `coll`.
 * The iteratee should complete with a value to use as the sort criteria as
 * its `result`.
 * Invoked with (item, callback).
 * @param {Function} callback - A callback which is called after all the
 * `iteratee` functions have finished, or an error occurs. Results is the items
 * from the original `coll` sorted by the values returned by the `iteratee`
 * calls. Invoked with (err, results).
 * @example
 *
 * async.sortBy(['file1','file2','file3'], function(file, callback) {
 *     fs.stat(file, function(err, stats) {
 *         callback(err, stats.mtime);
 *     });
 * }, function(err, results) {
 *     // results is now the original array of files sorted by
 *     // modified date
 * });
 *
 * // By modifying the callback parameter the
 * // sorting order can be influenced:
 *
 * // ascending order
 * async.sortBy([1,9,3,5], function(x, callback) {
 *     callback(null, x);
 * }, function(err,result) {
 *     // result callback
 * });
 *
 * // descending order
 * async.sortBy([1,9,3,5], function(x, callback) {
 *     callback(null, x*-1);    //<- x*-1 instead of x, turns the order around
 * }, function(err,result) {
 *     // result callback
 * });
 */
function sortBy (coll, iteratee, callback) {
    var _iteratee = wrapAsync(iteratee);
    map(coll, function (x, callback) {
        _iteratee(x, function (err, criteria) {
            if (err) return callback(err);
            callback(null, {value: x, criteria: criteria});
        });
    }, function (err, results) {
        if (err) return callback(err);
        callback(null, arrayMap(results.sort(comparator), baseProperty('value')));
    });

    function comparator(left, right) {
        var a = left.criteria, b = right.criteria;
        return a < b ? -1 : a > b ? 1 : 0;
    }
}

/**
 * Sets a time limit on an asynchronous function. If the function does not call
 * its callback within the specified milliseconds, it will be called with a
 * timeout error. The code property for the error object will be `'ETIMEDOUT'`.
 *
 * @name timeout
 * @static
 * @memberOf module:Utils
 * @method
 * @category Util
 * @param {AsyncFunction} asyncFn - The async function to limit in time.
 * @param {number} milliseconds - The specified time limit.
 * @param {*} [info] - Any variable you want attached (`string`, `object`, etc)
 * to timeout Error for more information..
 * @returns {AsyncFunction} Returns a wrapped function that can be used with any
 * of the control flow functions.
 * Invoke this function with the same parameters as you would `asyncFunc`.
 * @example
 *
 * function myFunction(foo, callback) {
 *     doAsyncTask(foo, function(err, data) {
 *         // handle errors
 *         if (err) return callback(err);
 *
 *         // do some stuff ...
 *
 *         // return processed data
 *         return callback(null, data);
 *     });
 * }
 *
 * var wrapped = async.timeout(myFunction, 1000);
 *
 * // call `wrapped` as you would `myFunction`
 * wrapped({ bar: 'bar' }, function(err, data) {
 *     // if `myFunction` takes < 1000 ms to execute, `err`
 *     // and `data` will have their expected values
 *
 *     // else `err` will be an Error with the code 'ETIMEDOUT'
 * });
 */
function timeout(asyncFn, milliseconds, info) {
    var fn = wrapAsync(asyncFn);

    return initialParams(function (args, callback) {
        var timedOut = false;
        var timer;

        function timeoutCallback() {
            var name = asyncFn.name || 'anonymous';
            var error  = new Error('Callback function "' + name + '" timed out.');
            error.code = 'ETIMEDOUT';
            if (info) {
                error.info = info;
            }
            timedOut = true;
            callback(error);
        }

        args.push(function () {
            if (!timedOut) {
                callback.apply(null, arguments);
                clearTimeout(timer);
            }
        });

        // setup timer and call original function
        timer = setTimeout(timeoutCallback, milliseconds);
        fn.apply(null, args);
    });
}

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeCeil = Math.ceil;
var nativeMax = Math.max;

/**
 * The base implementation of `_.range` and `_.rangeRight` which doesn't
 * coerce arguments.
 *
 * @private
 * @param {number} start The start of the range.
 * @param {number} end The end of the range.
 * @param {number} step The value to increment or decrement by.
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Array} Returns the range of numbers.
 */
function baseRange(start, end, step, fromRight) {
  var index = -1,
      length = nativeMax(nativeCeil((end - start) / (step || 1)), 0),
      result = Array(length);

  while (length--) {
    result[fromRight ? length : ++index] = start;
    start += step;
  }
  return result;
}

/**
 * The same as [times]{@link module:ControlFlow.times} but runs a maximum of `limit` async operations at a
 * time.
 *
 * @name timesLimit
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.times]{@link module:ControlFlow.times}
 * @category Control Flow
 * @param {number} count - The number of times to run the function.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {AsyncFunction} iteratee - The async function to call `n` times.
 * Invoked with the iteration index and a callback: (n, next).
 * @param {Function} callback - see [async.map]{@link module:Collections.map}.
 */
function timeLimit(count, limit, iteratee, callback) {
    var _iteratee = wrapAsync(iteratee);
    mapLimit(baseRange(0, count, 1), limit, _iteratee, callback);
}

/**
 * Calls the `iteratee` function `n` times, and accumulates results in the same
 * manner you would use with [map]{@link module:Collections.map}.
 *
 * @name times
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.map]{@link module:Collections.map}
 * @category Control Flow
 * @param {number} n - The number of times to run the function.
 * @param {AsyncFunction} iteratee - The async function to call `n` times.
 * Invoked with the iteration index and a callback: (n, next).
 * @param {Function} callback - see {@link module:Collections.map}.
 * @example
 *
 * // Pretend this is some complicated async factory
 * var createUser = function(id, callback) {
 *     callback(null, {
 *         id: 'user' + id
 *     });
 * };
 *
 * // generate 5 users
 * async.times(5, function(n, next) {
 *     createUser(n, function(err, user) {
 *         next(err, user);
 *     });
 * }, function(err, users) {
 *     // we should now have 5 users
 * });
 */
var times = doLimit(timeLimit, Infinity);

/**
 * The same as [times]{@link module:ControlFlow.times} but runs only a single async operation at a time.
 *
 * @name timesSeries
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.times]{@link module:ControlFlow.times}
 * @category Control Flow
 * @param {number} n - The number of times to run the function.
 * @param {AsyncFunction} iteratee - The async function to call `n` times.
 * Invoked with the iteration index and a callback: (n, next).
 * @param {Function} callback - see {@link module:Collections.map}.
 */
var timesSeries = doLimit(timeLimit, 1);

/**
 * A relative of `reduce`.  Takes an Object or Array, and iterates over each
 * element in series, each step potentially mutating an `accumulator` value.
 * The type of the accumulator defaults to the type of collection passed in.
 *
 * @name transform
 * @static
 * @memberOf module:Collections
 * @method
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {*} [accumulator] - The initial state of the transform.  If omitted,
 * it will default to an empty Object or Array, depending on the type of `coll`
 * @param {AsyncFunction} iteratee - A function applied to each item in the
 * collection that potentially modifies the accumulator.
 * Invoked with (accumulator, item, key, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Result is the transformed accumulator.
 * Invoked with (err, result).
 * @example
 *
 * async.transform([1,2,3], function(acc, item, index, callback) {
 *     // pointless async:
 *     process.nextTick(function() {
 *         acc.push(item * 2)
 *         callback(null)
 *     });
 * }, function(err, result) {
 *     // result is now equal to [2, 4, 6]
 * });
 *
 * @example
 *
 * async.transform({a: 1, b: 2, c: 3}, function (obj, val, key, callback) {
 *     setImmediate(function () {
 *         obj[key] = val * 2;
 *         callback();
 *     })
 * }, function (err, result) {
 *     // result is equal to {a: 2, b: 4, c: 6}
 * })
 */
function transform (coll, accumulator, iteratee, callback) {
    if (arguments.length <= 3) {
        callback = iteratee;
        iteratee = accumulator;
        accumulator = isArray(coll) ? [] : {};
    }
    callback = once(callback || noop);
    var _iteratee = wrapAsync(iteratee);

    eachOf(coll, function(v, k, cb) {
        _iteratee(accumulator, v, k, cb);
    }, function(err) {
        callback(err, accumulator);
    });
}

/**
 * It runs each task in series but stops whenever any of the functions were
 * successful. If one of the tasks were successful, the `callback` will be
 * passed the result of the successful task. If all tasks fail, the callback
 * will be passed the error and result (if any) of the final attempt.
 *
 * @name tryEach
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {Array|Iterable|Object} tasks - A collection containing functions to
 * run, each function is passed a `callback(err, result)` it must call on
 * completion with an error `err` (which can be `null`) and an optional `result`
 * value.
 * @param {Function} [callback] - An optional callback which is called when one
 * of the tasks has succeeded, or all have failed. It receives the `err` and
 * `result` arguments of the last attempt at completing the `task`. Invoked with
 * (err, results).
 * @example
 * async.tryEach([
 *     function getDataFromFirstWebsite(callback) {
 *         // Try getting the data from the first website
 *         callback(err, data);
 *     },
 *     function getDataFromSecondWebsite(callback) {
 *         // First website failed,
 *         // Try getting the data from the backup website
 *         callback(err, data);
 *     }
 * ],
 * // optional callback
 * function(err, results) {
 *     Now do something with the data.
 * });
 *
 */
function tryEach(tasks, callback) {
    var error = null;
    var result;
    callback = callback || noop;
    eachSeries(tasks, function(task, callback) {
        wrapAsync(task)(function (err, res/*, ...args*/) {
            if (arguments.length > 2) {
                result = slice(arguments, 1);
            } else {
                result = res;
            }
            error = err;
            callback(!err);
        });
    }, function () {
        callback(error, result);
    });
}

/**
 * Undoes a [memoize]{@link module:Utils.memoize}d function, reverting it to the original,
 * unmemoized form. Handy for testing.
 *
 * @name unmemoize
 * @static
 * @memberOf module:Utils
 * @method
 * @see [async.memoize]{@link module:Utils.memoize}
 * @category Util
 * @param {AsyncFunction} fn - the memoized function
 * @returns {AsyncFunction} a function that calls the original unmemoized function
 */
function unmemoize(fn) {
    return function () {
        return (fn.unmemoized || fn).apply(null, arguments);
    };
}

/**
 * Repeatedly call `iteratee`, while `test` returns `true`. Calls `callback` when
 * stopped, or an error occurs.
 *
 * @name whilst
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {Function} test - synchronous truth test to perform before each
 * execution of `iteratee`. Invoked with ().
 * @param {AsyncFunction} iteratee - An async function which is called each time
 * `test` passes. Invoked with (callback).
 * @param {Function} [callback] - A callback which is called after the test
 * function has failed and repeated execution of `iteratee` has stopped. `callback`
 * will be passed an error and any arguments passed to the final `iteratee`'s
 * callback. Invoked with (err, [results]);
 * @returns undefined
 * @example
 *
 * var count = 0;
 * async.whilst(
 *     function() { return count < 5; },
 *     function(callback) {
 *         count++;
 *         setTimeout(function() {
 *             callback(null, count);
 *         }, 1000);
 *     },
 *     function (err, n) {
 *         // 5 seconds have passed, n = 5
 *     }
 * );
 */
function whilst(test, iteratee, callback) {
    callback = onlyOnce(callback || noop);
    var _iteratee = wrapAsync(iteratee);
    if (!test()) return callback(null);
    var next = function(err/*, ...args*/) {
        if (err) return callback(err);
        if (test()) return _iteratee(next);
        var args = slice(arguments, 1);
        callback.apply(null, [null].concat(args));
    };
    _iteratee(next);
}

/**
 * Repeatedly call `iteratee` until `test` returns `true`. Calls `callback` when
 * stopped, or an error occurs. `callback` will be passed an error and any
 * arguments passed to the final `iteratee`'s callback.
 *
 * The inverse of [whilst]{@link module:ControlFlow.whilst}.
 *
 * @name until
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.whilst]{@link module:ControlFlow.whilst}
 * @category Control Flow
 * @param {Function} test - synchronous truth test to perform before each
 * execution of `iteratee`. Invoked with ().
 * @param {AsyncFunction} iteratee - An async function which is called each time
 * `test` fails. Invoked with (callback).
 * @param {Function} [callback] - A callback which is called after the test
 * function has passed and repeated execution of `iteratee` has stopped. `callback`
 * will be passed an error and any arguments passed to the final `iteratee`'s
 * callback. Invoked with (err, [results]);
 */
function until(test, iteratee, callback) {
    whilst(function() {
        return !test.apply(this, arguments);
    }, iteratee, callback);
}

/**
 * Runs the `tasks` array of functions in series, each passing their results to
 * the next in the array. However, if any of the `tasks` pass an error to their
 * own callback, the next function is not executed, and the main `callback` is
 * immediately called with the error.
 *
 * @name waterfall
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {Array} tasks - An array of [async functions]{@link AsyncFunction}
 * to run.
 * Each function should complete with any number of `result` values.
 * The `result` values will be passed as arguments, in order, to the next task.
 * @param {Function} [callback] - An optional callback to run once all the
 * functions have completed. This will be passed the results of the last task's
 * callback. Invoked with (err, [results]).
 * @returns undefined
 * @example
 *
 * async.waterfall([
 *     function(callback) {
 *         callback(null, 'one', 'two');
 *     },
 *     function(arg1, arg2, callback) {
 *         // arg1 now equals 'one' and arg2 now equals 'two'
 *         callback(null, 'three');
 *     },
 *     function(arg1, callback) {
 *         // arg1 now equals 'three'
 *         callback(null, 'done');
 *     }
 * ], function (err, result) {
 *     // result now equals 'done'
 * });
 *
 * // Or, with named functions:
 * async.waterfall([
 *     myFirstFunction,
 *     mySecondFunction,
 *     myLastFunction,
 * ], function (err, result) {
 *     // result now equals 'done'
 * });
 * function myFirstFunction(callback) {
 *     callback(null, 'one', 'two');
 * }
 * function mySecondFunction(arg1, arg2, callback) {
 *     // arg1 now equals 'one' and arg2 now equals 'two'
 *     callback(null, 'three');
 * }
 * function myLastFunction(arg1, callback) {
 *     // arg1 now equals 'three'
 *     callback(null, 'done');
 * }
 */
var waterfall = function(tasks, callback) {
    callback = once(callback || noop);
    if (!isArray(tasks)) return callback(new Error('First argument to waterfall must be an array of functions'));
    if (!tasks.length) return callback();
    var taskIndex = 0;

    function nextTask(args) {
        var task = wrapAsync(tasks[taskIndex++]);
        args.push(onlyOnce(next));
        task.apply(null, args);
    }

    function next(err/*, ...args*/) {
        if (err || taskIndex === tasks.length) {
            return callback.apply(null, arguments);
        }
        nextTask(slice(arguments, 1));
    }

    nextTask([]);
};

/**
 * An "async function" in the context of Async is an asynchronous function with
 * a variable number of parameters, with the final parameter being a callback.
 * (`function (arg1, arg2, ..., callback) {}`)
 * The final callback is of the form `callback(err, results...)`, which must be
 * called once the function is completed.  The callback should be called with a
 * Error as its first argument to signal that an error occurred.
 * Otherwise, if no error occurred, it should be called with `null` as the first
 * argument, and any additional `result` arguments that may apply, to signal
 * successful completion.
 * The callback must be called exactly once, ideally on a later tick of the
 * JavaScript event loop.
 *
 * This type of function is also referred to as a "Node-style async function",
 * or a "continuation passing-style function" (CPS). Most of the methods of this
 * library are themselves CPS/Node-style async functions, or functions that
 * return CPS/Node-style async functions.
 *
 * Wherever we accept a Node-style async function, we also directly accept an
 * [ES2017 `async` function]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function}.
 * In this case, the `async` function will not be passed a final callback
 * argument, and any thrown error will be used as the `err` argument of the
 * implicit callback, and the return value will be used as the `result` value.
 * (i.e. a `rejected` of the returned Promise becomes the `err` callback
 * argument, and a `resolved` value becomes the `result`.)
 *
 * Note, due to JavaScript limitations, we can only detect native `async`
 * functions and not transpilied implementations.
 * Your environment must have `async`/`await` support for this to work.
 * (e.g. Node > v7.6, or a recent version of a modern browser).
 * If you are using `async` functions through a transpiler (e.g. Babel), you
 * must still wrap the function with [asyncify]{@link module:Utils.asyncify},
 * because the `async function` will be compiled to an ordinary function that
 * returns a promise.
 *
 * @typedef {Function} AsyncFunction
 * @static
 */

/**
 * Async is a utility module which provides straight-forward, powerful functions
 * for working with asynchronous JavaScript. Although originally designed for
 * use with [Node.js](http://nodejs.org) and installable via
 * `npm install --save async`, it can also be used directly in the browser.
 * @module async
 * @see AsyncFunction
 */


/**
 * A collection of `async` functions for manipulating collections, such as
 * arrays and objects.
 * @module Collections
 */

/**
 * A collection of `async` functions for controlling the flow through a script.
 * @module ControlFlow
 */

/**
 * A collection of `async` utility functions.
 * @module Utils
 */

var index = {
    apply: apply,
    applyEach: applyEach,
    applyEachSeries: applyEachSeries,
    asyncify: asyncify,
    auto: auto,
    autoInject: autoInject,
    cargo: cargo,
    compose: compose,
    concat: concat,
    concatLimit: concatLimit,
    concatSeries: concatSeries,
    constant: constant,
    detect: detect,
    detectLimit: detectLimit,
    detectSeries: detectSeries,
    dir: dir,
    doDuring: doDuring,
    doUntil: doUntil,
    doWhilst: doWhilst,
    during: during,
    each: eachLimit,
    eachLimit: eachLimit$1,
    eachOf: eachOf,
    eachOfLimit: eachOfLimit,
    eachOfSeries: eachOfSeries,
    eachSeries: eachSeries,
    ensureAsync: ensureAsync,
    every: every,
    everyLimit: everyLimit,
    everySeries: everySeries,
    filter: filter,
    filterLimit: filterLimit,
    filterSeries: filterSeries,
    forever: forever,
    groupBy: groupBy,
    groupByLimit: groupByLimit,
    groupBySeries: groupBySeries,
    log: log,
    map: map,
    mapLimit: mapLimit,
    mapSeries: mapSeries,
    mapValues: mapValues,
    mapValuesLimit: mapValuesLimit,
    mapValuesSeries: mapValuesSeries,
    memoize: memoize,
    nextTick: nextTick,
    parallel: parallelLimit,
    parallelLimit: parallelLimit$1,
    priorityQueue: priorityQueue,
    queue: queue$1,
    race: race,
    reduce: reduce,
    reduceRight: reduceRight,
    reflect: reflect,
    reflectAll: reflectAll,
    reject: reject,
    rejectLimit: rejectLimit,
    rejectSeries: rejectSeries,
    retry: retry,
    retryable: retryable,
    seq: seq,
    series: series,
    setImmediate: setImmediate$1,
    some: some,
    someLimit: someLimit,
    someSeries: someSeries,
    sortBy: sortBy,
    timeout: timeout,
    times: times,
    timesLimit: timeLimit,
    timesSeries: timesSeries,
    transform: transform,
    tryEach: tryEach,
    unmemoize: unmemoize,
    until: until,
    waterfall: waterfall,
    whilst: whilst,

    // aliases
    all: every,
    allLimit: everyLimit,
    allSeries: everySeries,
    any: some,
    anyLimit: someLimit,
    anySeries: someSeries,
    find: detect,
    findLimit: detectLimit,
    findSeries: detectSeries,
    forEach: eachLimit,
    forEachSeries: eachSeries,
    forEachLimit: eachLimit$1,
    forEachOf: eachOf,
    forEachOfSeries: eachOfSeries,
    forEachOfLimit: eachOfLimit,
    inject: reduce,
    foldl: reduce,
    foldr: reduceRight,
    select: filter,
    selectLimit: filterLimit,
    selectSeries: filterSeries,
    wrapSync: asyncify
};

exports['default'] = index;
exports.apply = apply;
exports.applyEach = applyEach;
exports.applyEachSeries = applyEachSeries;
exports.asyncify = asyncify;
exports.auto = auto;
exports.autoInject = autoInject;
exports.cargo = cargo;
exports.compose = compose;
exports.concat = concat;
exports.concatLimit = concatLimit;
exports.concatSeries = concatSeries;
exports.constant = constant;
exports.detect = detect;
exports.detectLimit = detectLimit;
exports.detectSeries = detectSeries;
exports.dir = dir;
exports.doDuring = doDuring;
exports.doUntil = doUntil;
exports.doWhilst = doWhilst;
exports.during = during;
exports.each = eachLimit;
exports.eachLimit = eachLimit$1;
exports.eachOf = eachOf;
exports.eachOfLimit = eachOfLimit;
exports.eachOfSeries = eachOfSeries;
exports.eachSeries = eachSeries;
exports.ensureAsync = ensureAsync;
exports.every = every;
exports.everyLimit = everyLimit;
exports.everySeries = everySeries;
exports.filter = filter;
exports.filterLimit = filterLimit;
exports.filterSeries = filterSeries;
exports.forever = forever;
exports.groupBy = groupBy;
exports.groupByLimit = groupByLimit;
exports.groupBySeries = groupBySeries;
exports.log = log;
exports.map = map;
exports.mapLimit = mapLimit;
exports.mapSeries = mapSeries;
exports.mapValues = mapValues;
exports.mapValuesLimit = mapValuesLimit;
exports.mapValuesSeries = mapValuesSeries;
exports.memoize = memoize;
exports.nextTick = nextTick;
exports.parallel = parallelLimit;
exports.parallelLimit = parallelLimit$1;
exports.priorityQueue = priorityQueue;
exports.queue = queue$1;
exports.race = race;
exports.reduce = reduce;
exports.reduceRight = reduceRight;
exports.reflect = reflect;
exports.reflectAll = reflectAll;
exports.reject = reject;
exports.rejectLimit = rejectLimit;
exports.rejectSeries = rejectSeries;
exports.retry = retry;
exports.retryable = retryable;
exports.seq = seq;
exports.series = series;
exports.setImmediate = setImmediate$1;
exports.some = some;
exports.someLimit = someLimit;
exports.someSeries = someSeries;
exports.sortBy = sortBy;
exports.timeout = timeout;
exports.times = times;
exports.timesLimit = timeLimit;
exports.timesSeries = timesSeries;
exports.transform = transform;
exports.tryEach = tryEach;
exports.unmemoize = unmemoize;
exports.until = until;
exports.waterfall = waterfall;
exports.whilst = whilst;
exports.all = every;
exports.allLimit = everyLimit;
exports.allSeries = everySeries;
exports.any = some;
exports.anyLimit = someLimit;
exports.anySeries = someSeries;
exports.find = detect;
exports.findLimit = detectLimit;
exports.findSeries = detectSeries;
exports.forEach = eachLimit;
exports.forEachSeries = eachSeries;
exports.forEachLimit = eachLimit$1;
exports.forEachOf = eachOf;
exports.forEachOfSeries = eachOfSeries;
exports.forEachOfLimit = eachOfLimit;
exports.inject = reduce;
exports.foldl = reduce;
exports.foldr = reduceRight;
exports.select = filter;
exports.selectLimit = filterLimit;
exports.selectSeries = filterSeries;
exports.wrapSync = asyncify;

Object.defineProperty(exports, '__esModule', { value: true });

})));

}).call(this,_dereq_('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},_dereq_("timers").setImmediate)

},{"_process":"/opt/panxf/metamask-extension/node_modules/_process@0.11.10@process/browser.js","timers":"/opt/panxf/metamask-extension/node_modules/_timers-browserify@1.4.2@timers-browserify/main.js"}],"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/core-js/json/stringify.js":[function(_dereq_,module,exports){
module.exports = { "default": _dereq_("core-js/library/fn/json/stringify"), __esModule: true };
},{"core-js/library/fn/json/stringify":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/fn/json/stringify.js"}],"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/core-js/object/assign.js":[function(_dereq_,module,exports){
module.exports = { "default": _dereq_("core-js/library/fn/object/assign"), __esModule: true };
},{"core-js/library/fn/object/assign":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/fn/object/assign.js"}],"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/core-js/object/create.js":[function(_dereq_,module,exports){
module.exports = { "default": _dereq_("core-js/library/fn/object/create"), __esModule: true };
},{"core-js/library/fn/object/create":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/fn/object/create.js"}],"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/core-js/object/define-property.js":[function(_dereq_,module,exports){
module.exports = { "default": _dereq_("core-js/library/fn/object/define-property"), __esModule: true };
},{"core-js/library/fn/object/define-property":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/fn/object/define-property.js"}],"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/core-js/object/get-prototype-of.js":[function(_dereq_,module,exports){
module.exports = { "default": _dereq_("core-js/library/fn/object/get-prototype-of"), __esModule: true };
},{"core-js/library/fn/object/get-prototype-of":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/fn/object/get-prototype-of.js"}],"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/core-js/object/set-prototype-of.js":[function(_dereq_,module,exports){
module.exports = { "default": _dereq_("core-js/library/fn/object/set-prototype-of"), __esModule: true };
},{"core-js/library/fn/object/set-prototype-of":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/fn/object/set-prototype-of.js"}],"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/core-js/symbol.js":[function(_dereq_,module,exports){
module.exports = { "default": _dereq_("core-js/library/fn/symbol"), __esModule: true };
},{"core-js/library/fn/symbol":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/fn/symbol/index.js"}],"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/core-js/symbol/iterator.js":[function(_dereq_,module,exports){
module.exports = { "default": _dereq_("core-js/library/fn/symbol/iterator"), __esModule: true };
},{"core-js/library/fn/symbol/iterator":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/fn/symbol/iterator.js"}],"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/helpers/classCallCheck.js":[function(_dereq_,module,exports){
"use strict";

exports.__esModule = true;

exports.default = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};
},{}],"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/helpers/createClass.js":[function(_dereq_,module,exports){
"use strict";

exports.__esModule = true;

var _defineProperty = _dereq_("../core-js/object/define-property");

var _defineProperty2 = _interopRequireDefault(_defineProperty);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      (0, _defineProperty2.default)(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();
},{"../core-js/object/define-property":"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/core-js/object/define-property.js"}],"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/helpers/defineProperty.js":[function(_dereq_,module,exports){
"use strict";

exports.__esModule = true;

var _defineProperty = _dereq_("../core-js/object/define-property");

var _defineProperty2 = _interopRequireDefault(_defineProperty);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (obj, key, value) {
  if (key in obj) {
    (0, _defineProperty2.default)(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
};
},{"../core-js/object/define-property":"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/core-js/object/define-property.js"}],"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/helpers/inherits.js":[function(_dereq_,module,exports){
"use strict";

exports.__esModule = true;

var _setPrototypeOf = _dereq_("../core-js/object/set-prototype-of");

var _setPrototypeOf2 = _interopRequireDefault(_setPrototypeOf);

var _create = _dereq_("../core-js/object/create");

var _create2 = _interopRequireDefault(_create);

var _typeof2 = _dereq_("../helpers/typeof");

var _typeof3 = _interopRequireDefault(_typeof2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : (0, _typeof3.default)(superClass)));
  }

  subClass.prototype = (0, _create2.default)(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) _setPrototypeOf2.default ? (0, _setPrototypeOf2.default)(subClass, superClass) : subClass.__proto__ = superClass;
};
},{"../core-js/object/create":"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/core-js/object/create.js","../core-js/object/set-prototype-of":"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/core-js/object/set-prototype-of.js","../helpers/typeof":"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/helpers/typeof.js"}],"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/helpers/possibleConstructorReturn.js":[function(_dereq_,module,exports){
"use strict";

exports.__esModule = true;

var _typeof2 = _dereq_("../helpers/typeof");

var _typeof3 = _interopRequireDefault(_typeof2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && ((typeof call === "undefined" ? "undefined" : (0, _typeof3.default)(call)) === "object" || typeof call === "function") ? call : self;
};
},{"../helpers/typeof":"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/helpers/typeof.js"}],"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/helpers/typeof.js":[function(_dereq_,module,exports){
"use strict";

exports.__esModule = true;

var _iterator = _dereq_("../core-js/symbol/iterator");

var _iterator2 = _interopRequireDefault(_iterator);

var _symbol = _dereq_("../core-js/symbol");

var _symbol2 = _interopRequireDefault(_symbol);

var _typeof = typeof _symbol2.default === "function" && typeof _iterator2.default === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof _symbol2.default === "function" && obj.constructor === _symbol2.default && obj !== _symbol2.default.prototype ? "symbol" : typeof obj; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = typeof _symbol2.default === "function" && _typeof(_iterator2.default) === "symbol" ? function (obj) {
  return typeof obj === "undefined" ? "undefined" : _typeof(obj);
} : function (obj) {
  return obj && typeof _symbol2.default === "function" && obj.constructor === _symbol2.default && obj !== _symbol2.default.prototype ? "symbol" : typeof obj === "undefined" ? "undefined" : _typeof(obj);
};
},{"../core-js/symbol":"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/core-js/symbol.js","../core-js/symbol/iterator":"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/core-js/symbol/iterator.js"}],"/opt/panxf/metamask-extension/node_modules/_base64-js@1.3.0@base64-js/index.js":[function(_dereq_,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  for (var i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],"/opt/panxf/metamask-extension/node_modules/_browser-resolve@1.11.2@browser-resolve/empty.js":[function(_dereq_,module,exports){

},{}],"/opt/panxf/metamask-extension/node_modules/_buffer@5.1.0@buffer/index.js":[function(_dereq_,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = _dereq_('base64-js')
var ieee754 = _dereq_('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  get: function () {
    if (!(this instanceof Buffer)) {
      return undefined
    }
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  get: function () {
    if (!(this instanceof Buffer)) {
      return undefined
    }
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('Invalid typed array length')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (isArrayBuffer(value) || (value && isArrayBuffer(value.buffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  return fromObject(value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj) {
    if (ArrayBuffer.isView(obj) || 'length' in obj) {
      if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
        return createBuffer(0)
      }
      return fromArrayLike(obj)
    }

    if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
      return fromArrayLike(obj.data)
    }
  }

  throw new TypeError('The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object.')
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (ArrayBuffer.isView(buf)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isArrayBuffer(string)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : new Buffer(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffers from another context (i.e. an iframe) do not pass the `instanceof` check
// but they should be treated as valid. See: https://github.com/feross/buffer/issues/166
function isArrayBuffer (obj) {
  return obj instanceof ArrayBuffer ||
    (obj != null && obj.constructor != null && obj.constructor.name === 'ArrayBuffer' &&
      typeof obj.byteLength === 'number')
}

function numberIsNaN (obj) {
  return obj !== obj // eslint-disable-line no-self-compare
}

},{"base64-js":"/opt/panxf/metamask-extension/node_modules/_base64-js@1.3.0@base64-js/index.js","ieee754":"/opt/panxf/metamask-extension/node_modules/_ieee754@1.1.11@ieee754/index.js"}],"/opt/panxf/metamask-extension/node_modules/_clone@2.1.1@clone/clone.js":[function(_dereq_,module,exports){
(function (Buffer){
var clone = (function() {
'use strict';

function _instanceof(obj, type) {
  return type != null && obj instanceof type;
}

var nativeMap;
try {
  nativeMap = Map;
} catch(_) {
  // maybe a reference error because no `Map`. Give it a dummy value that no
  // value will ever be an instanceof.
  nativeMap = function() {};
}

var nativeSet;
try {
  nativeSet = Set;
} catch(_) {
  nativeSet = function() {};
}

var nativePromise;
try {
  nativePromise = Promise;
} catch(_) {
  nativePromise = function() {};
}

/**
 * Clones (copies) an Object using deep copying.
 *
 * This function supports circular references by default, but if you are certain
 * there are no circular references in your object, you can save some CPU time
 * by calling clone(obj, false).
 *
 * Caution: if `circular` is false and `parent` contains circular references,
 * your program may enter an infinite loop and crash.
 *
 * @param `parent` - the object to be cloned
 * @param `circular` - set to true if the object to be cloned may contain
 *    circular references. (optional - true by default)
 * @param `depth` - set to a number if the object is only to be cloned to
 *    a particular depth. (optional - defaults to Infinity)
 * @param `prototype` - sets the prototype to be used when cloning an object.
 *    (optional - defaults to parent prototype).
 * @param `includeNonEnumerable` - set to true if the non-enumerable properties
 *    should be cloned as well. Non-enumerable properties on the prototype
 *    chain will be ignored. (optional - false by default)
*/
function clone(parent, circular, depth, prototype, includeNonEnumerable) {
  if (typeof circular === 'object') {
    depth = circular.depth;
    prototype = circular.prototype;
    includeNonEnumerable = circular.includeNonEnumerable;
    circular = circular.circular;
  }
  // maintain two arrays for circular references, where corresponding parents
  // and children have the same index
  var allParents = [];
  var allChildren = [];

  var useBuffer = typeof Buffer != 'undefined';

  if (typeof circular == 'undefined')
    circular = true;

  if (typeof depth == 'undefined')
    depth = Infinity;

  // recurse this function so we don't reset allParents and allChildren
  function _clone(parent, depth) {
    // cloning null always returns null
    if (parent === null)
      return null;

    if (depth === 0)
      return parent;

    var child;
    var proto;
    if (typeof parent != 'object') {
      return parent;
    }

    if (_instanceof(parent, nativeMap)) {
      child = new nativeMap();
    } else if (_instanceof(parent, nativeSet)) {
      child = new nativeSet();
    } else if (_instanceof(parent, nativePromise)) {
      child = new nativePromise(function (resolve, reject) {
        parent.then(function(value) {
          resolve(_clone(value, depth - 1));
        }, function(err) {
          reject(_clone(err, depth - 1));
        });
      });
    } else if (clone.__isArray(parent)) {
      child = [];
    } else if (clone.__isRegExp(parent)) {
      child = new RegExp(parent.source, __getRegExpFlags(parent));
      if (parent.lastIndex) child.lastIndex = parent.lastIndex;
    } else if (clone.__isDate(parent)) {
      child = new Date(parent.getTime());
    } else if (useBuffer && Buffer.isBuffer(parent)) {
      child = new Buffer(parent.length);
      parent.copy(child);
      return child;
    } else if (_instanceof(parent, Error)) {
      child = Object.create(parent);
    } else {
      if (typeof prototype == 'undefined') {
        proto = Object.getPrototypeOf(parent);
        child = Object.create(proto);
      }
      else {
        child = Object.create(prototype);
        proto = prototype;
      }
    }

    if (circular) {
      var index = allParents.indexOf(parent);

      if (index != -1) {
        return allChildren[index];
      }
      allParents.push(parent);
      allChildren.push(child);
    }

    if (_instanceof(parent, nativeMap)) {
      parent.forEach(function(value, key) {
        var keyChild = _clone(key, depth - 1);
        var valueChild = _clone(value, depth - 1);
        child.set(keyChild, valueChild);
      });
    }
    if (_instanceof(parent, nativeSet)) {
      parent.forEach(function(value) {
        var entryChild = _clone(value, depth - 1);
        child.add(entryChild);
      });
    }

    for (var i in parent) {
      var attrs;
      if (proto) {
        attrs = Object.getOwnPropertyDescriptor(proto, i);
      }

      if (attrs && attrs.set == null) {
        continue;
      }
      child[i] = _clone(parent[i], depth - 1);
    }

    if (Object.getOwnPropertySymbols) {
      var symbols = Object.getOwnPropertySymbols(parent);
      for (var i = 0; i < symbols.length; i++) {
        // Don't need to worry about cloning a symbol because it is a primitive,
        // like a number or string.
        var symbol = symbols[i];
        var descriptor = Object.getOwnPropertyDescriptor(parent, symbol);
        if (descriptor && !descriptor.enumerable && !includeNonEnumerable) {
          continue;
        }
        child[symbol] = _clone(parent[symbol], depth - 1);
        if (!descriptor.enumerable) {
          Object.defineProperty(child, symbol, {
            enumerable: false
          });
        }
      }
    }

    if (includeNonEnumerable) {
      var allPropertyNames = Object.getOwnPropertyNames(parent);
      for (var i = 0; i < allPropertyNames.length; i++) {
        var propertyName = allPropertyNames[i];
        var descriptor = Object.getOwnPropertyDescriptor(parent, propertyName);
        if (descriptor && descriptor.enumerable) {
          continue;
        }
        child[propertyName] = _clone(parent[propertyName], depth - 1);
        Object.defineProperty(child, propertyName, {
          enumerable: false
        });
      }
    }

    return child;
  }

  return _clone(parent, depth);
}

/**
 * Simple flat clone using prototype, accepts only objects, usefull for property
 * override on FLAT configuration object (no nested props).
 *
 * USE WITH CAUTION! This may not behave as you wish if you do not know how this
 * works.
 */
clone.clonePrototype = function clonePrototype(parent) {
  if (parent === null)
    return null;

  var c = function () {};
  c.prototype = parent;
  return new c();
};

// private utility functions

function __objToStr(o) {
  return Object.prototype.toString.call(o);
}
clone.__objToStr = __objToStr;

function __isDate(o) {
  return typeof o === 'object' && __objToStr(o) === '[object Date]';
}
clone.__isDate = __isDate;

function __isArray(o) {
  return typeof o === 'object' && __objToStr(o) === '[object Array]';
}
clone.__isArray = __isArray;

function __isRegExp(o) {
  return typeof o === 'object' && __objToStr(o) === '[object RegExp]';
}
clone.__isRegExp = __isRegExp;

function __getRegExpFlags(re) {
  var flags = '';
  if (re.global) flags += 'g';
  if (re.ignoreCase) flags += 'i';
  if (re.multiline) flags += 'm';
  return flags;
}
clone.__getRegExpFlags = __getRegExpFlags;

return clone;
})();

if (typeof module === 'object' && module.exports) {
  module.exports = clone;
}

}).call(this,_dereq_("buffer").Buffer)

},{"buffer":"/opt/panxf/metamask-extension/node_modules/_buffer@5.1.0@buffer/index.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/fn/json/stringify.js":[function(_dereq_,module,exports){
var core = _dereq_('../../modules/_core');
var $JSON = core.JSON || (core.JSON = { stringify: JSON.stringify });
module.exports = function stringify(it) { // eslint-disable-line no-unused-vars
  return $JSON.stringify.apply($JSON, arguments);
};

},{"../../modules/_core":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_core.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/fn/object/assign.js":[function(_dereq_,module,exports){
_dereq_('../../modules/es6.object.assign');
module.exports = _dereq_('../../modules/_core').Object.assign;

},{"../../modules/_core":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_core.js","../../modules/es6.object.assign":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/es6.object.assign.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/fn/object/create.js":[function(_dereq_,module,exports){
_dereq_('../../modules/es6.object.create');
var $Object = _dereq_('../../modules/_core').Object;
module.exports = function create(P, D) {
  return $Object.create(P, D);
};

},{"../../modules/_core":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_core.js","../../modules/es6.object.create":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/es6.object.create.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/fn/object/define-property.js":[function(_dereq_,module,exports){
_dereq_('../../modules/es6.object.define-property');
var $Object = _dereq_('../../modules/_core').Object;
module.exports = function defineProperty(it, key, desc) {
  return $Object.defineProperty(it, key, desc);
};

},{"../../modules/_core":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_core.js","../../modules/es6.object.define-property":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/es6.object.define-property.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/fn/object/get-prototype-of.js":[function(_dereq_,module,exports){
_dereq_('../../modules/es6.object.get-prototype-of');
module.exports = _dereq_('../../modules/_core').Object.getPrototypeOf;

},{"../../modules/_core":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_core.js","../../modules/es6.object.get-prototype-of":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/es6.object.get-prototype-of.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/fn/object/set-prototype-of.js":[function(_dereq_,module,exports){
_dereq_('../../modules/es6.object.set-prototype-of');
module.exports = _dereq_('../../modules/_core').Object.setPrototypeOf;

},{"../../modules/_core":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_core.js","../../modules/es6.object.set-prototype-of":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/es6.object.set-prototype-of.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/fn/symbol/index.js":[function(_dereq_,module,exports){
_dereq_('../../modules/es6.symbol');
_dereq_('../../modules/es6.object.to-string');
_dereq_('../../modules/es7.symbol.async-iterator');
_dereq_('../../modules/es7.symbol.observable');
module.exports = _dereq_('../../modules/_core').Symbol;

},{"../../modules/_core":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_core.js","../../modules/es6.object.to-string":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/es6.object.to-string.js","../../modules/es6.symbol":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/es6.symbol.js","../../modules/es7.symbol.async-iterator":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/es7.symbol.async-iterator.js","../../modules/es7.symbol.observable":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/es7.symbol.observable.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/fn/symbol/iterator.js":[function(_dereq_,module,exports){
_dereq_('../../modules/es6.string.iterator');
_dereq_('../../modules/web.dom.iterable');
module.exports = _dereq_('../../modules/_wks-ext').f('iterator');

},{"../../modules/_wks-ext":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_wks-ext.js","../../modules/es6.string.iterator":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/es6.string.iterator.js","../../modules/web.dom.iterable":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/web.dom.iterable.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_a-function.js":[function(_dereq_,module,exports){
module.exports = function (it) {
  if (typeof it != 'function') throw TypeError(it + ' is not a function!');
  return it;
};

},{}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_add-to-unscopables.js":[function(_dereq_,module,exports){
module.exports = function () { /* empty */ };

},{}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_an-object.js":[function(_dereq_,module,exports){
var isObject = _dereq_('./_is-object');
module.exports = function (it) {
  if (!isObject(it)) throw TypeError(it + ' is not an object!');
  return it;
};

},{"./_is-object":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_is-object.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_array-includes.js":[function(_dereq_,module,exports){
// false -> Array#indexOf
// true  -> Array#includes
var toIObject = _dereq_('./_to-iobject');
var toLength = _dereq_('./_to-length');
var toAbsoluteIndex = _dereq_('./_to-absolute-index');
module.exports = function (IS_INCLUDES) {
  return function ($this, el, fromIndex) {
    var O = toIObject($this);
    var length = toLength(O.length);
    var index = toAbsoluteIndex(fromIndex, length);
    var value;
    // Array#includes uses SameValueZero equality algorithm
    // eslint-disable-next-line no-self-compare
    if (IS_INCLUDES && el != el) while (length > index) {
      value = O[index++];
      // eslint-disable-next-line no-self-compare
      if (value != value) return true;
    // Array#indexOf ignores holes, Array#includes - not
    } else for (;length > index; index++) if (IS_INCLUDES || index in O) {
      if (O[index] === el) return IS_INCLUDES || index || 0;
    } return !IS_INCLUDES && -1;
  };
};

},{"./_to-absolute-index":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_to-absolute-index.js","./_to-iobject":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_to-iobject.js","./_to-length":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_to-length.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_cof.js":[function(_dereq_,module,exports){
var toString = {}.toString;

module.exports = function (it) {
  return toString.call(it).slice(8, -1);
};

},{}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_core.js":[function(_dereq_,module,exports){
var core = module.exports = { version: '2.5.7' };
if (typeof __e == 'number') __e = core; // eslint-disable-line no-undef

},{}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_ctx.js":[function(_dereq_,module,exports){
// optional / simple context binding
var aFunction = _dereq_('./_a-function');
module.exports = function (fn, that, length) {
  aFunction(fn);
  if (that === undefined) return fn;
  switch (length) {
    case 1: return function (a) {
      return fn.call(that, a);
    };
    case 2: return function (a, b) {
      return fn.call(that, a, b);
    };
    case 3: return function (a, b, c) {
      return fn.call(that, a, b, c);
    };
  }
  return function (/* ...args */) {
    return fn.apply(that, arguments);
  };
};

},{"./_a-function":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_a-function.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_defined.js":[function(_dereq_,module,exports){
// 7.2.1 RequireObjectCoercible(argument)
module.exports = function (it) {
  if (it == undefined) throw TypeError("Can't call method on  " + it);
  return it;
};

},{}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_descriptors.js":[function(_dereq_,module,exports){
// Thank's IE8 for his funny defineProperty
module.exports = !_dereq_('./_fails')(function () {
  return Object.defineProperty({}, 'a', { get: function () { return 7; } }).a != 7;
});

},{"./_fails":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_fails.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_dom-create.js":[function(_dereq_,module,exports){
var isObject = _dereq_('./_is-object');
var document = _dereq_('./_global').document;
// typeof document.createElement is 'object' in old IE
var is = isObject(document) && isObject(document.createElement);
module.exports = function (it) {
  return is ? document.createElement(it) : {};
};

},{"./_global":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_global.js","./_is-object":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_is-object.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_enum-bug-keys.js":[function(_dereq_,module,exports){
// IE 8- don't enum bug keys
module.exports = (
  'constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf'
).split(',');

},{}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_enum-keys.js":[function(_dereq_,module,exports){
// all enumerable object keys, includes symbols
var getKeys = _dereq_('./_object-keys');
var gOPS = _dereq_('./_object-gops');
var pIE = _dereq_('./_object-pie');
module.exports = function (it) {
  var result = getKeys(it);
  var getSymbols = gOPS.f;
  if (getSymbols) {
    var symbols = getSymbols(it);
    var isEnum = pIE.f;
    var i = 0;
    var key;
    while (symbols.length > i) if (isEnum.call(it, key = symbols[i++])) result.push(key);
  } return result;
};

},{"./_object-gops":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-gops.js","./_object-keys":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-keys.js","./_object-pie":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-pie.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_export.js":[function(_dereq_,module,exports){
var global = _dereq_('./_global');
var core = _dereq_('./_core');
var ctx = _dereq_('./_ctx');
var hide = _dereq_('./_hide');
var has = _dereq_('./_has');
var PROTOTYPE = 'prototype';

var $export = function (type, name, source) {
  var IS_FORCED = type & $export.F;
  var IS_GLOBAL = type & $export.G;
  var IS_STATIC = type & $export.S;
  var IS_PROTO = type & $export.P;
  var IS_BIND = type & $export.B;
  var IS_WRAP = type & $export.W;
  var exports = IS_GLOBAL ? core : core[name] || (core[name] = {});
  var expProto = exports[PROTOTYPE];
  var target = IS_GLOBAL ? global : IS_STATIC ? global[name] : (global[name] || {})[PROTOTYPE];
  var key, own, out;
  if (IS_GLOBAL) source = name;
  for (key in source) {
    // contains in native
    own = !IS_FORCED && target && target[key] !== undefined;
    if (own && has(exports, key)) continue;
    // export native or passed
    out = own ? target[key] : source[key];
    // prevent global pollution for namespaces
    exports[key] = IS_GLOBAL && typeof target[key] != 'function' ? source[key]
    // bind timers to global for call from export context
    : IS_BIND && own ? ctx(out, global)
    // wrap global constructors for prevent change them in library
    : IS_WRAP && target[key] == out ? (function (C) {
      var F = function (a, b, c) {
        if (this instanceof C) {
          switch (arguments.length) {
            case 0: return new C();
            case 1: return new C(a);
            case 2: return new C(a, b);
          } return new C(a, b, c);
        } return C.apply(this, arguments);
      };
      F[PROTOTYPE] = C[PROTOTYPE];
      return F;
    // make static versions for prototype methods
    })(out) : IS_PROTO && typeof out == 'function' ? ctx(Function.call, out) : out;
    // export proto methods to core.%CONSTRUCTOR%.methods.%NAME%
    if (IS_PROTO) {
      (exports.virtual || (exports.virtual = {}))[key] = out;
      // export proto methods to core.%CONSTRUCTOR%.prototype.%NAME%
      if (type & $export.R && expProto && !expProto[key]) hide(expProto, key, out);
    }
  }
};
// type bitmap
$export.F = 1;   // forced
$export.G = 2;   // global
$export.S = 4;   // static
$export.P = 8;   // proto
$export.B = 16;  // bind
$export.W = 32;  // wrap
$export.U = 64;  // safe
$export.R = 128; // real proto method for `library`
module.exports = $export;

},{"./_core":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_core.js","./_ctx":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_ctx.js","./_global":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_global.js","./_has":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_has.js","./_hide":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_hide.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_fails.js":[function(_dereq_,module,exports){
module.exports = function (exec) {
  try {
    return !!exec();
  } catch (e) {
    return true;
  }
};

},{}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_global.js":[function(_dereq_,module,exports){
// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
var global = module.exports = typeof window != 'undefined' && window.Math == Math
  ? window : typeof self != 'undefined' && self.Math == Math ? self
  // eslint-disable-next-line no-new-func
  : Function('return this')();
if (typeof __g == 'number') __g = global; // eslint-disable-line no-undef

},{}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_has.js":[function(_dereq_,module,exports){
var hasOwnProperty = {}.hasOwnProperty;
module.exports = function (it, key) {
  return hasOwnProperty.call(it, key);
};

},{}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_hide.js":[function(_dereq_,module,exports){
var dP = _dereq_('./_object-dp');
var createDesc = _dereq_('./_property-desc');
module.exports = _dereq_('./_descriptors') ? function (object, key, value) {
  return dP.f(object, key, createDesc(1, value));
} : function (object, key, value) {
  object[key] = value;
  return object;
};

},{"./_descriptors":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_descriptors.js","./_object-dp":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-dp.js","./_property-desc":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_property-desc.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_html.js":[function(_dereq_,module,exports){
var document = _dereq_('./_global').document;
module.exports = document && document.documentElement;

},{"./_global":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_global.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_ie8-dom-define.js":[function(_dereq_,module,exports){
module.exports = !_dereq_('./_descriptors') && !_dereq_('./_fails')(function () {
  return Object.defineProperty(_dereq_('./_dom-create')('div'), 'a', { get: function () { return 7; } }).a != 7;
});

},{"./_descriptors":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_descriptors.js","./_dom-create":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_dom-create.js","./_fails":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_fails.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_iobject.js":[function(_dereq_,module,exports){
// fallback for non-array-like ES3 and non-enumerable old V8 strings
var cof = _dereq_('./_cof');
// eslint-disable-next-line no-prototype-builtins
module.exports = Object('z').propertyIsEnumerable(0) ? Object : function (it) {
  return cof(it) == 'String' ? it.split('') : Object(it);
};

},{"./_cof":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_cof.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_is-array.js":[function(_dereq_,module,exports){
// 7.2.2 IsArray(argument)
var cof = _dereq_('./_cof');
module.exports = Array.isArray || function isArray(arg) {
  return cof(arg) == 'Array';
};

},{"./_cof":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_cof.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_is-object.js":[function(_dereq_,module,exports){
module.exports = function (it) {
  return typeof it === 'object' ? it !== null : typeof it === 'function';
};

},{}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_iter-create.js":[function(_dereq_,module,exports){
'use strict';
var create = _dereq_('./_object-create');
var descriptor = _dereq_('./_property-desc');
var setToStringTag = _dereq_('./_set-to-string-tag');
var IteratorPrototype = {};

// 25.1.2.1.1 %IteratorPrototype%[@@iterator]()
_dereq_('./_hide')(IteratorPrototype, _dereq_('./_wks')('iterator'), function () { return this; });

module.exports = function (Constructor, NAME, next) {
  Constructor.prototype = create(IteratorPrototype, { next: descriptor(1, next) });
  setToStringTag(Constructor, NAME + ' Iterator');
};

},{"./_hide":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_hide.js","./_object-create":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-create.js","./_property-desc":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_property-desc.js","./_set-to-string-tag":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_set-to-string-tag.js","./_wks":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_wks.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_iter-define.js":[function(_dereq_,module,exports){
'use strict';
var LIBRARY = _dereq_('./_library');
var $export = _dereq_('./_export');
var redefine = _dereq_('./_redefine');
var hide = _dereq_('./_hide');
var Iterators = _dereq_('./_iterators');
var $iterCreate = _dereq_('./_iter-create');
var setToStringTag = _dereq_('./_set-to-string-tag');
var getPrototypeOf = _dereq_('./_object-gpo');
var ITERATOR = _dereq_('./_wks')('iterator');
var BUGGY = !([].keys && 'next' in [].keys()); // Safari has buggy iterators w/o `next`
var FF_ITERATOR = '@@iterator';
var KEYS = 'keys';
var VALUES = 'values';

var returnThis = function () { return this; };

module.exports = function (Base, NAME, Constructor, next, DEFAULT, IS_SET, FORCED) {
  $iterCreate(Constructor, NAME, next);
  var getMethod = function (kind) {
    if (!BUGGY && kind in proto) return proto[kind];
    switch (kind) {
      case KEYS: return function keys() { return new Constructor(this, kind); };
      case VALUES: return function values() { return new Constructor(this, kind); };
    } return function entries() { return new Constructor(this, kind); };
  };
  var TAG = NAME + ' Iterator';
  var DEF_VALUES = DEFAULT == VALUES;
  var VALUES_BUG = false;
  var proto = Base.prototype;
  var $native = proto[ITERATOR] || proto[FF_ITERATOR] || DEFAULT && proto[DEFAULT];
  var $default = $native || getMethod(DEFAULT);
  var $entries = DEFAULT ? !DEF_VALUES ? $default : getMethod('entries') : undefined;
  var $anyNative = NAME == 'Array' ? proto.entries || $native : $native;
  var methods, key, IteratorPrototype;
  // Fix native
  if ($anyNative) {
    IteratorPrototype = getPrototypeOf($anyNative.call(new Base()));
    if (IteratorPrototype !== Object.prototype && IteratorPrototype.next) {
      // Set @@toStringTag to native iterators
      setToStringTag(IteratorPrototype, TAG, true);
      // fix for some old engines
      if (!LIBRARY && typeof IteratorPrototype[ITERATOR] != 'function') hide(IteratorPrototype, ITERATOR, returnThis);
    }
  }
  // fix Array#{values, @@iterator}.name in V8 / FF
  if (DEF_VALUES && $native && $native.name !== VALUES) {
    VALUES_BUG = true;
    $default = function values() { return $native.call(this); };
  }
  // Define iterator
  if ((!LIBRARY || FORCED) && (BUGGY || VALUES_BUG || !proto[ITERATOR])) {
    hide(proto, ITERATOR, $default);
  }
  // Plug for library
  Iterators[NAME] = $default;
  Iterators[TAG] = returnThis;
  if (DEFAULT) {
    methods = {
      values: DEF_VALUES ? $default : getMethod(VALUES),
      keys: IS_SET ? $default : getMethod(KEYS),
      entries: $entries
    };
    if (FORCED) for (key in methods) {
      if (!(key in proto)) redefine(proto, key, methods[key]);
    } else $export($export.P + $export.F * (BUGGY || VALUES_BUG), NAME, methods);
  }
  return methods;
};

},{"./_export":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_export.js","./_hide":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_hide.js","./_iter-create":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_iter-create.js","./_iterators":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_iterators.js","./_library":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_library.js","./_object-gpo":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-gpo.js","./_redefine":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_redefine.js","./_set-to-string-tag":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_set-to-string-tag.js","./_wks":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_wks.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_iter-step.js":[function(_dereq_,module,exports){
module.exports = function (done, value) {
  return { value: value, done: !!done };
};

},{}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_iterators.js":[function(_dereq_,module,exports){
module.exports = {};

},{}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_library.js":[function(_dereq_,module,exports){
module.exports = true;

},{}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_meta.js":[function(_dereq_,module,exports){
var META = _dereq_('./_uid')('meta');
var isObject = _dereq_('./_is-object');
var has = _dereq_('./_has');
var setDesc = _dereq_('./_object-dp').f;
var id = 0;
var isExtensible = Object.isExtensible || function () {
  return true;
};
var FREEZE = !_dereq_('./_fails')(function () {
  return isExtensible(Object.preventExtensions({}));
});
var setMeta = function (it) {
  setDesc(it, META, { value: {
    i: 'O' + ++id, // object ID
    w: {}          // weak collections IDs
  } });
};
var fastKey = function (it, create) {
  // return primitive with prefix
  if (!isObject(it)) return typeof it == 'symbol' ? it : (typeof it == 'string' ? 'S' : 'P') + it;
  if (!has(it, META)) {
    // can't set metadata to uncaught frozen object
    if (!isExtensible(it)) return 'F';
    // not necessary to add metadata
    if (!create) return 'E';
    // add missing metadata
    setMeta(it);
  // return object ID
  } return it[META].i;
};
var getWeak = function (it, create) {
  if (!has(it, META)) {
    // can't set metadata to uncaught frozen object
    if (!isExtensible(it)) return true;
    // not necessary to add metadata
    if (!create) return false;
    // add missing metadata
    setMeta(it);
  // return hash weak collections IDs
  } return it[META].w;
};
// add metadata on freeze-family methods calling
var onFreeze = function (it) {
  if (FREEZE && meta.NEED && isExtensible(it) && !has(it, META)) setMeta(it);
  return it;
};
var meta = module.exports = {
  KEY: META,
  NEED: false,
  fastKey: fastKey,
  getWeak: getWeak,
  onFreeze: onFreeze
};

},{"./_fails":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_fails.js","./_has":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_has.js","./_is-object":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_is-object.js","./_object-dp":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-dp.js","./_uid":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_uid.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-assign.js":[function(_dereq_,module,exports){
'use strict';
// 19.1.2.1 Object.assign(target, source, ...)
var getKeys = _dereq_('./_object-keys');
var gOPS = _dereq_('./_object-gops');
var pIE = _dereq_('./_object-pie');
var toObject = _dereq_('./_to-object');
var IObject = _dereq_('./_iobject');
var $assign = Object.assign;

// should work with symbols and should have deterministic property order (V8 bug)
module.exports = !$assign || _dereq_('./_fails')(function () {
  var A = {};
  var B = {};
  // eslint-disable-next-line no-undef
  var S = Symbol();
  var K = 'abcdefghijklmnopqrst';
  A[S] = 7;
  K.split('').forEach(function (k) { B[k] = k; });
  return $assign({}, A)[S] != 7 || Object.keys($assign({}, B)).join('') != K;
}) ? function assign(target, source) { // eslint-disable-line no-unused-vars
  var T = toObject(target);
  var aLen = arguments.length;
  var index = 1;
  var getSymbols = gOPS.f;
  var isEnum = pIE.f;
  while (aLen > index) {
    var S = IObject(arguments[index++]);
    var keys = getSymbols ? getKeys(S).concat(getSymbols(S)) : getKeys(S);
    var length = keys.length;
    var j = 0;
    var key;
    while (length > j) if (isEnum.call(S, key = keys[j++])) T[key] = S[key];
  } return T;
} : $assign;

},{"./_fails":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_fails.js","./_iobject":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_iobject.js","./_object-gops":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-gops.js","./_object-keys":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-keys.js","./_object-pie":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-pie.js","./_to-object":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_to-object.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-create.js":[function(_dereq_,module,exports){
// 19.1.2.2 / 15.2.3.5 Object.create(O [, Properties])
var anObject = _dereq_('./_an-object');
var dPs = _dereq_('./_object-dps');
var enumBugKeys = _dereq_('./_enum-bug-keys');
var IE_PROTO = _dereq_('./_shared-key')('IE_PROTO');
var Empty = function () { /* empty */ };
var PROTOTYPE = 'prototype';

// Create object with fake `null` prototype: use iframe Object with cleared prototype
var createDict = function () {
  // Thrash, waste and sodomy: IE GC bug
  var iframe = _dereq_('./_dom-create')('iframe');
  var i = enumBugKeys.length;
  var lt = '<';
  var gt = '>';
  var iframeDocument;
  iframe.style.display = 'none';
  _dereq_('./_html').appendChild(iframe);
  iframe.src = 'javascript:'; // eslint-disable-line no-script-url
  // createDict = iframe.contentWindow.Object;
  // html.removeChild(iframe);
  iframeDocument = iframe.contentWindow.document;
  iframeDocument.open();
  iframeDocument.write(lt + 'script' + gt + 'document.F=Object' + lt + '/script' + gt);
  iframeDocument.close();
  createDict = iframeDocument.F;
  while (i--) delete createDict[PROTOTYPE][enumBugKeys[i]];
  return createDict();
};

module.exports = Object.create || function create(O, Properties) {
  var result;
  if (O !== null) {
    Empty[PROTOTYPE] = anObject(O);
    result = new Empty();
    Empty[PROTOTYPE] = null;
    // add "__proto__" for Object.getPrototypeOf polyfill
    result[IE_PROTO] = O;
  } else result = createDict();
  return Properties === undefined ? result : dPs(result, Properties);
};

},{"./_an-object":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_an-object.js","./_dom-create":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_dom-create.js","./_enum-bug-keys":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_enum-bug-keys.js","./_html":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_html.js","./_object-dps":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-dps.js","./_shared-key":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_shared-key.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-dp.js":[function(_dereq_,module,exports){
var anObject = _dereq_('./_an-object');
var IE8_DOM_DEFINE = _dereq_('./_ie8-dom-define');
var toPrimitive = _dereq_('./_to-primitive');
var dP = Object.defineProperty;

exports.f = _dereq_('./_descriptors') ? Object.defineProperty : function defineProperty(O, P, Attributes) {
  anObject(O);
  P = toPrimitive(P, true);
  anObject(Attributes);
  if (IE8_DOM_DEFINE) try {
    return dP(O, P, Attributes);
  } catch (e) { /* empty */ }
  if ('get' in Attributes || 'set' in Attributes) throw TypeError('Accessors not supported!');
  if ('value' in Attributes) O[P] = Attributes.value;
  return O;
};

},{"./_an-object":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_an-object.js","./_descriptors":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_descriptors.js","./_ie8-dom-define":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_ie8-dom-define.js","./_to-primitive":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_to-primitive.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-dps.js":[function(_dereq_,module,exports){
var dP = _dereq_('./_object-dp');
var anObject = _dereq_('./_an-object');
var getKeys = _dereq_('./_object-keys');

module.exports = _dereq_('./_descriptors') ? Object.defineProperties : function defineProperties(O, Properties) {
  anObject(O);
  var keys = getKeys(Properties);
  var length = keys.length;
  var i = 0;
  var P;
  while (length > i) dP.f(O, P = keys[i++], Properties[P]);
  return O;
};

},{"./_an-object":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_an-object.js","./_descriptors":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_descriptors.js","./_object-dp":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-dp.js","./_object-keys":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-keys.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-gopd.js":[function(_dereq_,module,exports){
var pIE = _dereq_('./_object-pie');
var createDesc = _dereq_('./_property-desc');
var toIObject = _dereq_('./_to-iobject');
var toPrimitive = _dereq_('./_to-primitive');
var has = _dereq_('./_has');
var IE8_DOM_DEFINE = _dereq_('./_ie8-dom-define');
var gOPD = Object.getOwnPropertyDescriptor;

exports.f = _dereq_('./_descriptors') ? gOPD : function getOwnPropertyDescriptor(O, P) {
  O = toIObject(O);
  P = toPrimitive(P, true);
  if (IE8_DOM_DEFINE) try {
    return gOPD(O, P);
  } catch (e) { /* empty */ }
  if (has(O, P)) return createDesc(!pIE.f.call(O, P), O[P]);
};

},{"./_descriptors":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_descriptors.js","./_has":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_has.js","./_ie8-dom-define":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_ie8-dom-define.js","./_object-pie":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-pie.js","./_property-desc":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_property-desc.js","./_to-iobject":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_to-iobject.js","./_to-primitive":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_to-primitive.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-gopn-ext.js":[function(_dereq_,module,exports){
// fallback for IE11 buggy Object.getOwnPropertyNames with iframe and window
var toIObject = _dereq_('./_to-iobject');
var gOPN = _dereq_('./_object-gopn').f;
var toString = {}.toString;

var windowNames = typeof window == 'object' && window && Object.getOwnPropertyNames
  ? Object.getOwnPropertyNames(window) : [];

var getWindowNames = function (it) {
  try {
    return gOPN(it);
  } catch (e) {
    return windowNames.slice();
  }
};

module.exports.f = function getOwnPropertyNames(it) {
  return windowNames && toString.call(it) == '[object Window]' ? getWindowNames(it) : gOPN(toIObject(it));
};

},{"./_object-gopn":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-gopn.js","./_to-iobject":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_to-iobject.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-gopn.js":[function(_dereq_,module,exports){
// 19.1.2.7 / 15.2.3.4 Object.getOwnPropertyNames(O)
var $keys = _dereq_('./_object-keys-internal');
var hiddenKeys = _dereq_('./_enum-bug-keys').concat('length', 'prototype');

exports.f = Object.getOwnPropertyNames || function getOwnPropertyNames(O) {
  return $keys(O, hiddenKeys);
};

},{"./_enum-bug-keys":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_enum-bug-keys.js","./_object-keys-internal":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-keys-internal.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-gops.js":[function(_dereq_,module,exports){
exports.f = Object.getOwnPropertySymbols;

},{}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-gpo.js":[function(_dereq_,module,exports){
// 19.1.2.9 / 15.2.3.2 Object.getPrototypeOf(O)
var has = _dereq_('./_has');
var toObject = _dereq_('./_to-object');
var IE_PROTO = _dereq_('./_shared-key')('IE_PROTO');
var ObjectProto = Object.prototype;

module.exports = Object.getPrototypeOf || function (O) {
  O = toObject(O);
  if (has(O, IE_PROTO)) return O[IE_PROTO];
  if (typeof O.constructor == 'function' && O instanceof O.constructor) {
    return O.constructor.prototype;
  } return O instanceof Object ? ObjectProto : null;
};

},{"./_has":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_has.js","./_shared-key":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_shared-key.js","./_to-object":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_to-object.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-keys-internal.js":[function(_dereq_,module,exports){
var has = _dereq_('./_has');
var toIObject = _dereq_('./_to-iobject');
var arrayIndexOf = _dereq_('./_array-includes')(false);
var IE_PROTO = _dereq_('./_shared-key')('IE_PROTO');

module.exports = function (object, names) {
  var O = toIObject(object);
  var i = 0;
  var result = [];
  var key;
  for (key in O) if (key != IE_PROTO) has(O, key) && result.push(key);
  // Don't enum bug & hidden keys
  while (names.length > i) if (has(O, key = names[i++])) {
    ~arrayIndexOf(result, key) || result.push(key);
  }
  return result;
};

},{"./_array-includes":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_array-includes.js","./_has":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_has.js","./_shared-key":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_shared-key.js","./_to-iobject":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_to-iobject.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-keys.js":[function(_dereq_,module,exports){
// 19.1.2.14 / 15.2.3.14 Object.keys(O)
var $keys = _dereq_('./_object-keys-internal');
var enumBugKeys = _dereq_('./_enum-bug-keys');

module.exports = Object.keys || function keys(O) {
  return $keys(O, enumBugKeys);
};

},{"./_enum-bug-keys":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_enum-bug-keys.js","./_object-keys-internal":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-keys-internal.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-pie.js":[function(_dereq_,module,exports){
exports.f = {}.propertyIsEnumerable;

},{}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-sap.js":[function(_dereq_,module,exports){
// most Object methods by ES6 should accept primitives
var $export = _dereq_('./_export');
var core = _dereq_('./_core');
var fails = _dereq_('./_fails');
module.exports = function (KEY, exec) {
  var fn = (core.Object || {})[KEY] || Object[KEY];
  var exp = {};
  exp[KEY] = exec(fn);
  $export($export.S + $export.F * fails(function () { fn(1); }), 'Object', exp);
};

},{"./_core":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_core.js","./_export":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_export.js","./_fails":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_fails.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_property-desc.js":[function(_dereq_,module,exports){
module.exports = function (bitmap, value) {
  return {
    enumerable: !(bitmap & 1),
    configurable: !(bitmap & 2),
    writable: !(bitmap & 4),
    value: value
  };
};

},{}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_redefine.js":[function(_dereq_,module,exports){
module.exports = _dereq_('./_hide');

},{"./_hide":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_hide.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_set-proto.js":[function(_dereq_,module,exports){
// Works with __proto__ only. Old v8 can't work with null proto objects.
/* eslint-disable no-proto */
var isObject = _dereq_('./_is-object');
var anObject = _dereq_('./_an-object');
var check = function (O, proto) {
  anObject(O);
  if (!isObject(proto) && proto !== null) throw TypeError(proto + ": can't set as prototype!");
};
module.exports = {
  set: Object.setPrototypeOf || ('__proto__' in {} ? // eslint-disable-line
    function (test, buggy, set) {
      try {
        set = _dereq_('./_ctx')(Function.call, _dereq_('./_object-gopd').f(Object.prototype, '__proto__').set, 2);
        set(test, []);
        buggy = !(test instanceof Array);
      } catch (e) { buggy = true; }
      return function setPrototypeOf(O, proto) {
        check(O, proto);
        if (buggy) O.__proto__ = proto;
        else set(O, proto);
        return O;
      };
    }({}, false) : undefined),
  check: check
};

},{"./_an-object":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_an-object.js","./_ctx":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_ctx.js","./_is-object":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_is-object.js","./_object-gopd":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-gopd.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_set-to-string-tag.js":[function(_dereq_,module,exports){
var def = _dereq_('./_object-dp').f;
var has = _dereq_('./_has');
var TAG = _dereq_('./_wks')('toStringTag');

module.exports = function (it, tag, stat) {
  if (it && !has(it = stat ? it : it.prototype, TAG)) def(it, TAG, { configurable: true, value: tag });
};

},{"./_has":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_has.js","./_object-dp":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-dp.js","./_wks":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_wks.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_shared-key.js":[function(_dereq_,module,exports){
var shared = _dereq_('./_shared')('keys');
var uid = _dereq_('./_uid');
module.exports = function (key) {
  return shared[key] || (shared[key] = uid(key));
};

},{"./_shared":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_shared.js","./_uid":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_uid.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_shared.js":[function(_dereq_,module,exports){
var core = _dereq_('./_core');
var global = _dereq_('./_global');
var SHARED = '__core-js_shared__';
var store = global[SHARED] || (global[SHARED] = {});

(module.exports = function (key, value) {
  return store[key] || (store[key] = value !== undefined ? value : {});
})('versions', []).push({
  version: core.version,
  mode: _dereq_('./_library') ? 'pure' : 'global',
  copyright: '© 2018 Denis Pushkarev (zloirock.ru)'
});

},{"./_core":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_core.js","./_global":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_global.js","./_library":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_library.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_string-at.js":[function(_dereq_,module,exports){
var toInteger = _dereq_('./_to-integer');
var defined = _dereq_('./_defined');
// true  -> String#at
// false -> String#codePointAt
module.exports = function (TO_STRING) {
  return function (that, pos) {
    var s = String(defined(that));
    var i = toInteger(pos);
    var l = s.length;
    var a, b;
    if (i < 0 || i >= l) return TO_STRING ? '' : undefined;
    a = s.charCodeAt(i);
    return a < 0xd800 || a > 0xdbff || i + 1 === l || (b = s.charCodeAt(i + 1)) < 0xdc00 || b > 0xdfff
      ? TO_STRING ? s.charAt(i) : a
      : TO_STRING ? s.slice(i, i + 2) : (a - 0xd800 << 10) + (b - 0xdc00) + 0x10000;
  };
};

},{"./_defined":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_defined.js","./_to-integer":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_to-integer.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_to-absolute-index.js":[function(_dereq_,module,exports){
var toInteger = _dereq_('./_to-integer');
var max = Math.max;
var min = Math.min;
module.exports = function (index, length) {
  index = toInteger(index);
  return index < 0 ? max(index + length, 0) : min(index, length);
};

},{"./_to-integer":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_to-integer.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_to-integer.js":[function(_dereq_,module,exports){
// 7.1.4 ToInteger
var ceil = Math.ceil;
var floor = Math.floor;
module.exports = function (it) {
  return isNaN(it = +it) ? 0 : (it > 0 ? floor : ceil)(it);
};

},{}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_to-iobject.js":[function(_dereq_,module,exports){
// to indexed object, toObject with fallback for non-array-like ES3 strings
var IObject = _dereq_('./_iobject');
var defined = _dereq_('./_defined');
module.exports = function (it) {
  return IObject(defined(it));
};

},{"./_defined":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_defined.js","./_iobject":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_iobject.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_to-length.js":[function(_dereq_,module,exports){
// 7.1.15 ToLength
var toInteger = _dereq_('./_to-integer');
var min = Math.min;
module.exports = function (it) {
  return it > 0 ? min(toInteger(it), 0x1fffffffffffff) : 0; // pow(2, 53) - 1 == 9007199254740991
};

},{"./_to-integer":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_to-integer.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_to-object.js":[function(_dereq_,module,exports){
// 7.1.13 ToObject(argument)
var defined = _dereq_('./_defined');
module.exports = function (it) {
  return Object(defined(it));
};

},{"./_defined":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_defined.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_to-primitive.js":[function(_dereq_,module,exports){
// 7.1.1 ToPrimitive(input [, PreferredType])
var isObject = _dereq_('./_is-object');
// instead of the ES6 spec version, we didn't implement @@toPrimitive case
// and the second argument - flag - preferred type is a string
module.exports = function (it, S) {
  if (!isObject(it)) return it;
  var fn, val;
  if (S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it))) return val;
  if (typeof (fn = it.valueOf) == 'function' && !isObject(val = fn.call(it))) return val;
  if (!S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it))) return val;
  throw TypeError("Can't convert object to primitive value");
};

},{"./_is-object":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_is-object.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_uid.js":[function(_dereq_,module,exports){
var id = 0;
var px = Math.random();
module.exports = function (key) {
  return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
};

},{}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_wks-define.js":[function(_dereq_,module,exports){
var global = _dereq_('./_global');
var core = _dereq_('./_core');
var LIBRARY = _dereq_('./_library');
var wksExt = _dereq_('./_wks-ext');
var defineProperty = _dereq_('./_object-dp').f;
module.exports = function (name) {
  var $Symbol = core.Symbol || (core.Symbol = LIBRARY ? {} : global.Symbol || {});
  if (name.charAt(0) != '_' && !(name in $Symbol)) defineProperty($Symbol, name, { value: wksExt.f(name) });
};

},{"./_core":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_core.js","./_global":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_global.js","./_library":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_library.js","./_object-dp":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-dp.js","./_wks-ext":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_wks-ext.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_wks-ext.js":[function(_dereq_,module,exports){
exports.f = _dereq_('./_wks');

},{"./_wks":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_wks.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_wks.js":[function(_dereq_,module,exports){
var store = _dereq_('./_shared')('wks');
var uid = _dereq_('./_uid');
var Symbol = _dereq_('./_global').Symbol;
var USE_SYMBOL = typeof Symbol == 'function';

var $exports = module.exports = function (name) {
  return store[name] || (store[name] =
    USE_SYMBOL && Symbol[name] || (USE_SYMBOL ? Symbol : uid)('Symbol.' + name));
};

$exports.store = store;

},{"./_global":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_global.js","./_shared":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_shared.js","./_uid":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_uid.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/es6.array.iterator.js":[function(_dereq_,module,exports){
'use strict';
var addToUnscopables = _dereq_('./_add-to-unscopables');
var step = _dereq_('./_iter-step');
var Iterators = _dereq_('./_iterators');
var toIObject = _dereq_('./_to-iobject');

// 22.1.3.4 Array.prototype.entries()
// 22.1.3.13 Array.prototype.keys()
// 22.1.3.29 Array.prototype.values()
// 22.1.3.30 Array.prototype[@@iterator]()
module.exports = _dereq_('./_iter-define')(Array, 'Array', function (iterated, kind) {
  this._t = toIObject(iterated); // target
  this._i = 0;                   // next index
  this._k = kind;                // kind
// 22.1.5.2.1 %ArrayIteratorPrototype%.next()
}, function () {
  var O = this._t;
  var kind = this._k;
  var index = this._i++;
  if (!O || index >= O.length) {
    this._t = undefined;
    return step(1);
  }
  if (kind == 'keys') return step(0, index);
  if (kind == 'values') return step(0, O[index]);
  return step(0, [index, O[index]]);
}, 'values');

// argumentsList[@@iterator] is %ArrayProto_values% (9.4.4.6, 9.4.4.7)
Iterators.Arguments = Iterators.Array;

addToUnscopables('keys');
addToUnscopables('values');
addToUnscopables('entries');

},{"./_add-to-unscopables":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_add-to-unscopables.js","./_iter-define":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_iter-define.js","./_iter-step":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_iter-step.js","./_iterators":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_iterators.js","./_to-iobject":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_to-iobject.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/es6.object.assign.js":[function(_dereq_,module,exports){
// 19.1.3.1 Object.assign(target, source)
var $export = _dereq_('./_export');

$export($export.S + $export.F, 'Object', { assign: _dereq_('./_object-assign') });

},{"./_export":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_export.js","./_object-assign":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-assign.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/es6.object.create.js":[function(_dereq_,module,exports){
var $export = _dereq_('./_export');
// 19.1.2.2 / 15.2.3.5 Object.create(O [, Properties])
$export($export.S, 'Object', { create: _dereq_('./_object-create') });

},{"./_export":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_export.js","./_object-create":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-create.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/es6.object.define-property.js":[function(_dereq_,module,exports){
var $export = _dereq_('./_export');
// 19.1.2.4 / 15.2.3.6 Object.defineProperty(O, P, Attributes)
$export($export.S + $export.F * !_dereq_('./_descriptors'), 'Object', { defineProperty: _dereq_('./_object-dp').f });

},{"./_descriptors":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_descriptors.js","./_export":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_export.js","./_object-dp":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-dp.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/es6.object.get-prototype-of.js":[function(_dereq_,module,exports){
// 19.1.2.9 Object.getPrototypeOf(O)
var toObject = _dereq_('./_to-object');
var $getPrototypeOf = _dereq_('./_object-gpo');

_dereq_('./_object-sap')('getPrototypeOf', function () {
  return function getPrototypeOf(it) {
    return $getPrototypeOf(toObject(it));
  };
});

},{"./_object-gpo":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-gpo.js","./_object-sap":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-sap.js","./_to-object":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_to-object.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/es6.object.set-prototype-of.js":[function(_dereq_,module,exports){
// 19.1.3.19 Object.setPrototypeOf(O, proto)
var $export = _dereq_('./_export');
$export($export.S, 'Object', { setPrototypeOf: _dereq_('./_set-proto').set });

},{"./_export":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_export.js","./_set-proto":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_set-proto.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/es6.object.to-string.js":[function(_dereq_,module,exports){
arguments[4]["/opt/panxf/metamask-extension/node_modules/_browser-resolve@1.11.2@browser-resolve/empty.js"][0].apply(exports,arguments)
},{}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/es6.string.iterator.js":[function(_dereq_,module,exports){
'use strict';
var $at = _dereq_('./_string-at')(true);

// 21.1.3.27 String.prototype[@@iterator]()
_dereq_('./_iter-define')(String, 'String', function (iterated) {
  this._t = String(iterated); // target
  this._i = 0;                // next index
// 21.1.5.2.1 %StringIteratorPrototype%.next()
}, function () {
  var O = this._t;
  var index = this._i;
  var point;
  if (index >= O.length) return { value: undefined, done: true };
  point = $at(O, index);
  this._i += point.length;
  return { value: point, done: false };
});

},{"./_iter-define":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_iter-define.js","./_string-at":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_string-at.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/es6.symbol.js":[function(_dereq_,module,exports){
'use strict';
// ECMAScript 6 symbols shim
var global = _dereq_('./_global');
var has = _dereq_('./_has');
var DESCRIPTORS = _dereq_('./_descriptors');
var $export = _dereq_('./_export');
var redefine = _dereq_('./_redefine');
var META = _dereq_('./_meta').KEY;
var $fails = _dereq_('./_fails');
var shared = _dereq_('./_shared');
var setToStringTag = _dereq_('./_set-to-string-tag');
var uid = _dereq_('./_uid');
var wks = _dereq_('./_wks');
var wksExt = _dereq_('./_wks-ext');
var wksDefine = _dereq_('./_wks-define');
var enumKeys = _dereq_('./_enum-keys');
var isArray = _dereq_('./_is-array');
var anObject = _dereq_('./_an-object');
var isObject = _dereq_('./_is-object');
var toIObject = _dereq_('./_to-iobject');
var toPrimitive = _dereq_('./_to-primitive');
var createDesc = _dereq_('./_property-desc');
var _create = _dereq_('./_object-create');
var gOPNExt = _dereq_('./_object-gopn-ext');
var $GOPD = _dereq_('./_object-gopd');
var $DP = _dereq_('./_object-dp');
var $keys = _dereq_('./_object-keys');
var gOPD = $GOPD.f;
var dP = $DP.f;
var gOPN = gOPNExt.f;
var $Symbol = global.Symbol;
var $JSON = global.JSON;
var _stringify = $JSON && $JSON.stringify;
var PROTOTYPE = 'prototype';
var HIDDEN = wks('_hidden');
var TO_PRIMITIVE = wks('toPrimitive');
var isEnum = {}.propertyIsEnumerable;
var SymbolRegistry = shared('symbol-registry');
var AllSymbols = shared('symbols');
var OPSymbols = shared('op-symbols');
var ObjectProto = Object[PROTOTYPE];
var USE_NATIVE = typeof $Symbol == 'function';
var QObject = global.QObject;
// Don't use setters in Qt Script, https://github.com/zloirock/core-js/issues/173
var setter = !QObject || !QObject[PROTOTYPE] || !QObject[PROTOTYPE].findChild;

// fallback for old Android, https://code.google.com/p/v8/issues/detail?id=687
var setSymbolDesc = DESCRIPTORS && $fails(function () {
  return _create(dP({}, 'a', {
    get: function () { return dP(this, 'a', { value: 7 }).a; }
  })).a != 7;
}) ? function (it, key, D) {
  var protoDesc = gOPD(ObjectProto, key);
  if (protoDesc) delete ObjectProto[key];
  dP(it, key, D);
  if (protoDesc && it !== ObjectProto) dP(ObjectProto, key, protoDesc);
} : dP;

var wrap = function (tag) {
  var sym = AllSymbols[tag] = _create($Symbol[PROTOTYPE]);
  sym._k = tag;
  return sym;
};

var isSymbol = USE_NATIVE && typeof $Symbol.iterator == 'symbol' ? function (it) {
  return typeof it == 'symbol';
} : function (it) {
  return it instanceof $Symbol;
};

var $defineProperty = function defineProperty(it, key, D) {
  if (it === ObjectProto) $defineProperty(OPSymbols, key, D);
  anObject(it);
  key = toPrimitive(key, true);
  anObject(D);
  if (has(AllSymbols, key)) {
    if (!D.enumerable) {
      if (!has(it, HIDDEN)) dP(it, HIDDEN, createDesc(1, {}));
      it[HIDDEN][key] = true;
    } else {
      if (has(it, HIDDEN) && it[HIDDEN][key]) it[HIDDEN][key] = false;
      D = _create(D, { enumerable: createDesc(0, false) });
    } return setSymbolDesc(it, key, D);
  } return dP(it, key, D);
};
var $defineProperties = function defineProperties(it, P) {
  anObject(it);
  var keys = enumKeys(P = toIObject(P));
  var i = 0;
  var l = keys.length;
  var key;
  while (l > i) $defineProperty(it, key = keys[i++], P[key]);
  return it;
};
var $create = function create(it, P) {
  return P === undefined ? _create(it) : $defineProperties(_create(it), P);
};
var $propertyIsEnumerable = function propertyIsEnumerable(key) {
  var E = isEnum.call(this, key = toPrimitive(key, true));
  if (this === ObjectProto && has(AllSymbols, key) && !has(OPSymbols, key)) return false;
  return E || !has(this, key) || !has(AllSymbols, key) || has(this, HIDDEN) && this[HIDDEN][key] ? E : true;
};
var $getOwnPropertyDescriptor = function getOwnPropertyDescriptor(it, key) {
  it = toIObject(it);
  key = toPrimitive(key, true);
  if (it === ObjectProto && has(AllSymbols, key) && !has(OPSymbols, key)) return;
  var D = gOPD(it, key);
  if (D && has(AllSymbols, key) && !(has(it, HIDDEN) && it[HIDDEN][key])) D.enumerable = true;
  return D;
};
var $getOwnPropertyNames = function getOwnPropertyNames(it) {
  var names = gOPN(toIObject(it));
  var result = [];
  var i = 0;
  var key;
  while (names.length > i) {
    if (!has(AllSymbols, key = names[i++]) && key != HIDDEN && key != META) result.push(key);
  } return result;
};
var $getOwnPropertySymbols = function getOwnPropertySymbols(it) {
  var IS_OP = it === ObjectProto;
  var names = gOPN(IS_OP ? OPSymbols : toIObject(it));
  var result = [];
  var i = 0;
  var key;
  while (names.length > i) {
    if (has(AllSymbols, key = names[i++]) && (IS_OP ? has(ObjectProto, key) : true)) result.push(AllSymbols[key]);
  } return result;
};

// 19.4.1.1 Symbol([description])
if (!USE_NATIVE) {
  $Symbol = function Symbol() {
    if (this instanceof $Symbol) throw TypeError('Symbol is not a constructor!');
    var tag = uid(arguments.length > 0 ? arguments[0] : undefined);
    var $set = function (value) {
      if (this === ObjectProto) $set.call(OPSymbols, value);
      if (has(this, HIDDEN) && has(this[HIDDEN], tag)) this[HIDDEN][tag] = false;
      setSymbolDesc(this, tag, createDesc(1, value));
    };
    if (DESCRIPTORS && setter) setSymbolDesc(ObjectProto, tag, { configurable: true, set: $set });
    return wrap(tag);
  };
  redefine($Symbol[PROTOTYPE], 'toString', function toString() {
    return this._k;
  });

  $GOPD.f = $getOwnPropertyDescriptor;
  $DP.f = $defineProperty;
  _dereq_('./_object-gopn').f = gOPNExt.f = $getOwnPropertyNames;
  _dereq_('./_object-pie').f = $propertyIsEnumerable;
  _dereq_('./_object-gops').f = $getOwnPropertySymbols;

  if (DESCRIPTORS && !_dereq_('./_library')) {
    redefine(ObjectProto, 'propertyIsEnumerable', $propertyIsEnumerable, true);
  }

  wksExt.f = function (name) {
    return wrap(wks(name));
  };
}

$export($export.G + $export.W + $export.F * !USE_NATIVE, { Symbol: $Symbol });

for (var es6Symbols = (
  // 19.4.2.2, 19.4.2.3, 19.4.2.4, 19.4.2.6, 19.4.2.8, 19.4.2.9, 19.4.2.10, 19.4.2.11, 19.4.2.12, 19.4.2.13, 19.4.2.14
  'hasInstance,isConcatSpreadable,iterator,match,replace,search,species,split,toPrimitive,toStringTag,unscopables'
).split(','), j = 0; es6Symbols.length > j;)wks(es6Symbols[j++]);

for (var wellKnownSymbols = $keys(wks.store), k = 0; wellKnownSymbols.length > k;) wksDefine(wellKnownSymbols[k++]);

$export($export.S + $export.F * !USE_NATIVE, 'Symbol', {
  // 19.4.2.1 Symbol.for(key)
  'for': function (key) {
    return has(SymbolRegistry, key += '')
      ? SymbolRegistry[key]
      : SymbolRegistry[key] = $Symbol(key);
  },
  // 19.4.2.5 Symbol.keyFor(sym)
  keyFor: function keyFor(sym) {
    if (!isSymbol(sym)) throw TypeError(sym + ' is not a symbol!');
    for (var key in SymbolRegistry) if (SymbolRegistry[key] === sym) return key;
  },
  useSetter: function () { setter = true; },
  useSimple: function () { setter = false; }
});

$export($export.S + $export.F * !USE_NATIVE, 'Object', {
  // 19.1.2.2 Object.create(O [, Properties])
  create: $create,
  // 19.1.2.4 Object.defineProperty(O, P, Attributes)
  defineProperty: $defineProperty,
  // 19.1.2.3 Object.defineProperties(O, Properties)
  defineProperties: $defineProperties,
  // 19.1.2.6 Object.getOwnPropertyDescriptor(O, P)
  getOwnPropertyDescriptor: $getOwnPropertyDescriptor,
  // 19.1.2.7 Object.getOwnPropertyNames(O)
  getOwnPropertyNames: $getOwnPropertyNames,
  // 19.1.2.8 Object.getOwnPropertySymbols(O)
  getOwnPropertySymbols: $getOwnPropertySymbols
});

// 24.3.2 JSON.stringify(value [, replacer [, space]])
$JSON && $export($export.S + $export.F * (!USE_NATIVE || $fails(function () {
  var S = $Symbol();
  // MS Edge converts symbol values to JSON as {}
  // WebKit converts symbol values to JSON as null
  // V8 throws on boxed symbols
  return _stringify([S]) != '[null]' || _stringify({ a: S }) != '{}' || _stringify(Object(S)) != '{}';
})), 'JSON', {
  stringify: function stringify(it) {
    var args = [it];
    var i = 1;
    var replacer, $replacer;
    while (arguments.length > i) args.push(arguments[i++]);
    $replacer = replacer = args[1];
    if (!isObject(replacer) && it === undefined || isSymbol(it)) return; // IE8 returns string on undefined
    if (!isArray(replacer)) replacer = function (key, value) {
      if (typeof $replacer == 'function') value = $replacer.call(this, key, value);
      if (!isSymbol(value)) return value;
    };
    args[1] = replacer;
    return _stringify.apply($JSON, args);
  }
});

// 19.4.3.4 Symbol.prototype[@@toPrimitive](hint)
$Symbol[PROTOTYPE][TO_PRIMITIVE] || _dereq_('./_hide')($Symbol[PROTOTYPE], TO_PRIMITIVE, $Symbol[PROTOTYPE].valueOf);
// 19.4.3.5 Symbol.prototype[@@toStringTag]
setToStringTag($Symbol, 'Symbol');
// 20.2.1.9 Math[@@toStringTag]
setToStringTag(Math, 'Math', true);
// 24.3.3 JSON[@@toStringTag]
setToStringTag(global.JSON, 'JSON', true);

},{"./_an-object":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_an-object.js","./_descriptors":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_descriptors.js","./_enum-keys":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_enum-keys.js","./_export":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_export.js","./_fails":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_fails.js","./_global":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_global.js","./_has":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_has.js","./_hide":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_hide.js","./_is-array":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_is-array.js","./_is-object":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_is-object.js","./_library":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_library.js","./_meta":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_meta.js","./_object-create":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-create.js","./_object-dp":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-dp.js","./_object-gopd":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-gopd.js","./_object-gopn":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-gopn.js","./_object-gopn-ext":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-gopn-ext.js","./_object-gops":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-gops.js","./_object-keys":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-keys.js","./_object-pie":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_object-pie.js","./_property-desc":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_property-desc.js","./_redefine":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_redefine.js","./_set-to-string-tag":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_set-to-string-tag.js","./_shared":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_shared.js","./_to-iobject":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_to-iobject.js","./_to-primitive":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_to-primitive.js","./_uid":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_uid.js","./_wks":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_wks.js","./_wks-define":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_wks-define.js","./_wks-ext":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_wks-ext.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/es7.symbol.async-iterator.js":[function(_dereq_,module,exports){
_dereq_('./_wks-define')('asyncIterator');

},{"./_wks-define":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_wks-define.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/es7.symbol.observable.js":[function(_dereq_,module,exports){
_dereq_('./_wks-define')('observable');

},{"./_wks-define":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_wks-define.js"}],"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/web.dom.iterable.js":[function(_dereq_,module,exports){
_dereq_('./es6.array.iterator');
var global = _dereq_('./_global');
var hide = _dereq_('./_hide');
var Iterators = _dereq_('./_iterators');
var TO_STRING_TAG = _dereq_('./_wks')('toStringTag');

var DOMIterables = ('CSSRuleList,CSSStyleDeclaration,CSSValueList,ClientRectList,DOMRectList,DOMStringList,' +
  'DOMTokenList,DataTransferItemList,FileList,HTMLAllCollection,HTMLCollection,HTMLFormElement,HTMLSelectElement,' +
  'MediaList,MimeTypeArray,NamedNodeMap,NodeList,PaintRequestList,Plugin,PluginArray,SVGLengthList,SVGNumberList,' +
  'SVGPathSegList,SVGPointList,SVGStringList,SVGTransformList,SourceBufferList,StyleSheetList,TextTrackCueList,' +
  'TextTrackList,TouchList').split(',');

for (var i = 0; i < DOMIterables.length; i++) {
  var NAME = DOMIterables[i];
  var Collection = global[NAME];
  var proto = Collection && Collection.prototype;
  if (proto && !proto[TO_STRING_TAG]) hide(proto, TO_STRING_TAG, NAME);
  Iterators[NAME] = Iterators.Array;
}

},{"./_global":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_global.js","./_hide":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_hide.js","./_iterators":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_iterators.js","./_wks":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/_wks.js","./es6.array.iterator":"/opt/panxf/metamask-extension/node_modules/_core-js@2.5.7@core-js/library/modules/es6.array.iterator.js"}],"/opt/panxf/metamask-extension/node_modules/_core-util-is@1.0.2@core-util-is/lib/util.js":[function(_dereq_,module,exports){
(function (Buffer){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.

function isArray(arg) {
  if (Array.isArray) {
    return Array.isArray(arg);
  }
  return objectToString(arg) === '[object Array]';
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = Buffer.isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}

}).call(this,{"isBuffer":_dereq_("../../../../_is-buffer@1.1.6@is-buffer/index.js")})

},{"../../../../_is-buffer@1.1.6@is-buffer/index.js":"/opt/panxf/_is-buffer@1.1.6@is-buffer/index.js"}],"/opt/panxf/metamask-extension/node_modules/_end-of-stream@1.4.1@end-of-stream/index.js":[function(_dereq_,module,exports){
var once = _dereq_('once');

var noop = function() {};

var isRequest = function(stream) {
	return stream.setHeader && typeof stream.abort === 'function';
};

var isChildProcess = function(stream) {
	return stream.stdio && Array.isArray(stream.stdio) && stream.stdio.length === 3
};

var eos = function(stream, opts, callback) {
	if (typeof opts === 'function') return eos(stream, null, opts);
	if (!opts) opts = {};

	callback = once(callback || noop);

	var ws = stream._writableState;
	var rs = stream._readableState;
	var readable = opts.readable || (opts.readable !== false && stream.readable);
	var writable = opts.writable || (opts.writable !== false && stream.writable);

	var onlegacyfinish = function() {
		if (!stream.writable) onfinish();
	};

	var onfinish = function() {
		writable = false;
		if (!readable) callback.call(stream);
	};

	var onend = function() {
		readable = false;
		if (!writable) callback.call(stream);
	};

	var onexit = function(exitCode) {
		callback.call(stream, exitCode ? new Error('exited with error code: ' + exitCode) : null);
	};

	var onerror = function(err) {
		callback.call(stream, err);
	};

	var onclose = function() {
		if (readable && !(rs && rs.ended)) return callback.call(stream, new Error('premature close'));
		if (writable && !(ws && ws.ended)) return callback.call(stream, new Error('premature close'));
	};

	var onrequest = function() {
		stream.req.on('finish', onfinish);
	};

	if (isRequest(stream)) {
		stream.on('complete', onfinish);
		stream.on('abort', onclose);
		if (stream.req) onrequest();
		else stream.on('request', onrequest);
	} else if (writable && !ws) { // legacy streams
		stream.on('end', onlegacyfinish);
		stream.on('close', onlegacyfinish);
	}

	if (isChildProcess(stream)) stream.on('exit', onexit);

	stream.on('end', onend);
	stream.on('finish', onfinish);
	if (opts.error !== false) stream.on('error', onerror);
	stream.on('close', onclose);

	return function() {
		stream.removeListener('complete', onfinish);
		stream.removeListener('abort', onclose);
		stream.removeListener('request', onrequest);
		if (stream.req) stream.req.removeListener('finish', onfinish);
		stream.removeListener('end', onlegacyfinish);
		stream.removeListener('close', onlegacyfinish);
		stream.removeListener('finish', onfinish);
		stream.removeListener('exit', onexit);
		stream.removeListener('end', onend);
		stream.removeListener('error', onerror);
		stream.removeListener('close', onclose);
	};
};

module.exports = eos;

},{"once":"/opt/panxf/metamask-extension/node_modules/_once@1.4.0@once/once.js"}],"/opt/panxf/metamask-extension/node_modules/_events@2.1.0@events/events.js":[function(_dereq_,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var objectCreate = Object.create || objectCreatePolyfill
var objectKeys = Object.keys || objectKeysPolyfill
var bind = Function.prototype.bind || functionBindPolyfill

function EventEmitter() {
  if (!this._events || !Object.prototype.hasOwnProperty.call(this, '_events')) {
    this._events = objectCreate(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

var hasDefineProperty;
try {
  var o = {};
  if (Object.defineProperty) Object.defineProperty(o, 'x', { value: 0 });
  hasDefineProperty = o.x === 0;
} catch (err) { hasDefineProperty = false }
if (hasDefineProperty) {
  Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
    enumerable: true,
    get: function() {
      return defaultMaxListeners;
    },
    set: function(arg) {
      // check whether the input is a positive number (whose value is zero or
      // greater and not a NaN).
      if (typeof arg !== 'number' || arg < 0 || arg !== arg)
        throw new TypeError('"defaultMaxListeners" must be a positive number');
      defaultMaxListeners = arg;
    }
  });
} else {
  EventEmitter.defaultMaxListeners = defaultMaxListeners;
}

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || isNaN(n))
    throw new TypeError('"n" argument must be a positive number');
  this._maxListeners = n;
  return this;
};

function $getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
function emitNone(handler, isFn, self) {
  if (isFn)
    handler.call(self);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self);
  }
}
function emitOne(handler, isFn, self, arg1) {
  if (isFn)
    handler.call(self, arg1);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1);
  }
}
function emitTwo(handler, isFn, self, arg1, arg2) {
  if (isFn)
    handler.call(self, arg1, arg2);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2);
  }
}
function emitThree(handler, isFn, self, arg1, arg2, arg3) {
  if (isFn)
    handler.call(self, arg1, arg2, arg3);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2, arg3);
  }
}

function emitMany(handler, isFn, self, args) {
  if (isFn)
    handler.apply(self, args);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].apply(self, args);
  }
}

EventEmitter.prototype.emit = function emit(type) {
  var er, handler, len, args, i, events;
  var doError = (type === 'error');

  events = this._events;
  if (events)
    doError = (doError && events.error == null);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    if (arguments.length > 1)
      er = arguments[1];
    if (er instanceof Error) {
      throw er; // Unhandled 'error' event
    } else {
      // At least give some kind of context to the user
      var err = new Error('Unhandled "error" event. (' + er + ')');
      err.context = er;
      throw err;
    }
    return false;
  }

  handler = events[type];

  if (!handler)
    return false;

  var isFn = typeof handler === 'function';
  len = arguments.length;
  switch (len) {
      // fast cases
    case 1:
      emitNone(handler, isFn, this);
      break;
    case 2:
      emitOne(handler, isFn, this, arguments[1]);
      break;
    case 3:
      emitTwo(handler, isFn, this, arguments[1], arguments[2]);
      break;
    case 4:
      emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
      break;
      // slower
    default:
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      emitMany(handler, isFn, this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');

  events = target._events;
  if (!events) {
    events = target._events = objectCreate(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener) {
      target.emit('newListener', type,
          listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (!existing) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
          prepend ? [listener, existing] : [existing, listener];
    } else {
      // If we've already got an array, just append.
      if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
    }

    // Check for listener leak
    if (!existing.warned) {
      m = $getMaxListeners(target);
      if (m && m > 0 && existing.length > m) {
        existing.warned = true;
        var w = new Error('Possible EventEmitter memory leak detected. ' +
            existing.length + ' "' + String(type) + '" listeners ' +
            'added. Use emitter.setMaxListeners() to ' +
            'increase limit.');
        w.name = 'MaxListenersExceededWarning';
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        if (typeof console === 'object' && console.warn) {
          console.warn('%s: %s', w.name, w.message);
        }
      }
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    switch (arguments.length) {
      case 0:
        return this.listener.call(this.target);
      case 1:
        return this.listener.call(this.target, arguments[0]);
      case 2:
        return this.listener.call(this.target, arguments[0], arguments[1]);
      case 3:
        return this.listener.call(this.target, arguments[0], arguments[1],
            arguments[2]);
      default:
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; ++i)
          args[i] = arguments[i];
        this.listener.apply(this.target, args);
    }
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = bind.call(onceWrapper, state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = this._events;
      if (!events)
        return this;

      list = events[type];
      if (!list)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = objectCreate(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else
          spliceOne(list, position);

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (!events)
        return this;

      // not listening for removeListener, no need to emit
      if (!events.removeListener) {
        if (arguments.length === 0) {
          this._events = objectCreate(null);
          this._eventsCount = 0;
        } else if (events[type]) {
          if (--this._eventsCount === 0)
            this._events = objectCreate(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = objectKeys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = objectCreate(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (!events)
    return [];

  var evlistener = events[type];
  if (!evlistener)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
};

// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne(list, index) {
  for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
    list[i] = list[k];
  list.pop();
}

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function objectCreatePolyfill(proto) {
  var F = function() {};
  F.prototype = proto;
  return new F;
}
function objectKeysPolyfill(obj) {
  var keys = [];
  for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
    keys.push(k);
  }
  return k;
}
function functionBindPolyfill(context) {
  var fn = this;
  return function () {
    return fn.apply(context, arguments);
  };
}

},{}],"/opt/panxf/metamask-extension/node_modules/_ieee754@1.1.11@ieee754/index.js":[function(_dereq_,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],"/opt/panxf/metamask-extension/node_modules/_inherits@2.0.1@inherits/inherits_browser.js":[function(_dereq_,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],"/opt/panxf/metamask-extension/node_modules/_inherits@2.0.3@inherits/inherits_browser.js":[function(_dereq_,module,exports){
arguments[4]["/opt/panxf/metamask-extension/node_modules/_inherits@2.0.1@inherits/inherits_browser.js"][0].apply(exports,arguments)
},{}],"/opt/panxf/metamask-extension/node_modules/_isarray@1.0.0@isarray/index.js":[function(_dereq_,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],"/opt/panxf/metamask-extension/node_modules/_json-rpc-engine@3.7.3@json-rpc-engine/src/getUniqueId.js":[function(_dereq_,module,exports){
"use strict";

// uint32 (two's complement) max
// more conservative than Number.MAX_SAFE_INTEGER
var MAX = 4294967295;
var idCounter = Math.floor(Math.random() * MAX);

module.exports = getUniqueId;

function getUniqueId() {
  idCounter = (idCounter + 1) % MAX;
  return idCounter;
}

},{}],"/opt/panxf/metamask-extension/node_modules/_json-rpc-engine@3.7.3@json-rpc-engine/src/idRemapMiddleware.js":[function(_dereq_,module,exports){
'use strict';

var getUniqueId = _dereq_('./getUniqueId');

module.exports = createIdRemapMiddleware;

function createIdRemapMiddleware() {
  return function (req, res, next, end) {
    var originalId = req.id;
    var newId = getUniqueId();
    req.id = newId;
    res.id = newId;
    next(function (done) {
      req.id = originalId;
      res.id = originalId;
      done();
    });
  };
}

},{"./getUniqueId":"/opt/panxf/metamask-extension/node_modules/_json-rpc-engine@3.7.3@json-rpc-engine/src/getUniqueId.js"}],"/opt/panxf/metamask-extension/node_modules/_json-rpc-engine@3.7.3@json-rpc-engine/src/index.js":[function(_dereq_,module,exports){
'use strict';

var _stringify = _dereq_('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var async = _dereq_('async');
var clone = _dereq_('clone');

var RpcEngine = function () {
  function RpcEngine() {
    (0, _classCallCheck3.default)(this, RpcEngine);

    this._middleware = [];
  }

  //
  // Public
  //

  (0, _createClass3.default)(RpcEngine, [{
    key: 'push',
    value: function push(middleware) {
      this._middleware.push(middleware);
    }
  }, {
    key: 'handle',
    value: function handle(req, cb) {
      // batch request support
      if (Array.isArray(req)) {
        async.map(req, this._handle.bind(this), cb);
      } else {
        this._handle(req, cb);
      }
    }

    //
    // Private
    //

  }, {
    key: '_handle',
    value: function _handle(_req, cb) {
      // clone request object
      var req = clone(_req);
      // create response obj
      var res = {
        id: req.id,
        jsonrpc: req.jsonrpc
        // process all middleware
      };this._runMiddleware(req, res, function (err) {
        // return response
        cb(err, res);
      });
    }
  }, {
    key: '_runMiddleware',
    value: function _runMiddleware(req, res, onDone) {
      var _this = this;

      // flow
      async.waterfall([function (cb) {
        return _this._runMiddlewareDown(req, res, cb);
      }, checkForCompletion, function (returnHandlers, cb) {
        return _this._runReturnHandlersUp(returnHandlers, cb);
      }], onDone);

      function checkForCompletion(_ref, cb) {
        var isComplete = _ref.isComplete,
            returnHandlers = _ref.returnHandlers;

        // fail if not completed
        if (!('result' in res) && !('error' in res)) {
          var requestBody = (0, _stringify2.default)(req, null, 2);
          var message = 'JsonRpcEngine - response has no error or result for request:\n' + requestBody;
          return cb(new Error(message));
        }
        if (!isComplete) {
          var _requestBody = (0, _stringify2.default)(req, null, 2);
          var _message = 'JsonRpcEngine - nothing ended request:\n' + _requestBody;
          return cb(new Error(_message));
        }
        // continue
        return cb(null, returnHandlers);
      }

      function runReturnHandlers(returnHandlers, cb) {
        async.eachSeries(returnHandlers, function (handler, next) {
          return handler(next);
        }, onDone);
      }
    }

    // walks down stack of middleware

  }, {
    key: '_runMiddlewareDown',
    value: function _runMiddlewareDown(req, res, onDone) {
      // for climbing back up the stack
      var allReturnHandlers = [];
      // flag for stack return
      var isComplete = false;

      // down stack of middleware, call and collect optional allReturnHandlers
      async.mapSeries(this._middleware, eachMiddleware, completeRequest);

      // runs an individual middleware
      function eachMiddleware(middleware, cb) {
        // skip middleware if completed
        if (isComplete) return cb();
        // run individual middleware
        middleware(req, res, next, end);

        function next(returnHandler) {
          // add return handler
          allReturnHandlers.push(returnHandler);
          cb();
        }
        function end(err) {
          if (err) return cb(err);
          // mark as completed
          isComplete = true;
          cb();
        }
      }

      // returns, indicating whether or not it ended
      function completeRequest(err) {
        if (err) {
          // prepare error message
          res.error = {
            code: err.code || -32603,
            message: err.stack
            // return error-first and res with err
          };return onDone(err, res);
        }
        var returnHandlers = allReturnHandlers.filter(Boolean).reverse();
        onDone(null, { isComplete: isComplete, returnHandlers: returnHandlers });
      }
    }

    // climbs the stack calling return handlers

  }, {
    key: '_runReturnHandlersUp',
    value: function _runReturnHandlersUp(returnHandlers, cb) {
      async.eachSeries(returnHandlers, function (handler, next) {
        return handler(next);
      }, cb);
    }
  }]);
  return RpcEngine;
}();

module.exports = RpcEngine;

},{"async":"/opt/panxf/metamask-extension/node_modules/_async@2.6.1@async/dist/async.js","babel-runtime/core-js/json/stringify":"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/core-js/json/stringify.js","babel-runtime/helpers/classCallCheck":"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/helpers/classCallCheck.js","babel-runtime/helpers/createClass":"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/helpers/createClass.js","clone":"/opt/panxf/metamask-extension/node_modules/_clone@2.1.1@clone/clone.js"}],"/opt/panxf/metamask-extension/node_modules/_json-rpc-middleware-stream@1.0.1@json-rpc-middleware-stream/index.js":[function(_dereq_,module,exports){
const DuplexStream = _dereq_('readable-stream').Duplex

module.exports = createStreamMiddleware

function createStreamMiddleware() {
  const idMap = {}
  const stream = new DuplexStream({ objectMode: true, read, write })

  const middleware = (req, res, next, end) => {
    // write req to stream
    stream.push(req)
    // register request on id map
    idMap[req.id] = { req, res, next, end }
  }

  middleware.stream = stream
  
  return middleware

  function read () {
    return false
  }

  function write (res, encoding, cb) {
    // console.log(res, encoding, cb)
    const context = idMap[res.id]
    if (!context) cb(new Error(`StreamMiddleware - Unknown response id ${res.id}`))
    delete idMap[res.id]
    // copy whole res onto original res
    Object.assign(context.res, res)
    // run callback on empty stack,
    // prevent internal stream-handler from catching errors
    setTimeout(context.end)
    // continue processing stream
    cb()
  }

}
},{"readable-stream":"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/readable-browser.js"}],"/opt/panxf/metamask-extension/node_modules/_loglevel@1.6.1@loglevel/lib/loglevel.js":[function(_dereq_,module,exports){
/*
* loglevel - https://github.com/pimterry/loglevel
*
* Copyright (c) 2013 Tim Perry
* Licensed under the MIT license.
*/
(function (root, definition) {
    "use strict";
    if (typeof define === 'function' && define.amd) {
        define(definition);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = definition();
    } else {
        root.log = definition();
    }
}(this, function () {
    "use strict";

    // Slightly dubious tricks to cut down minimized file size
    var noop = function() {};
    var undefinedType = "undefined";

    var logMethods = [
        "trace",
        "debug",
        "info",
        "warn",
        "error"
    ];

    // Cross-browser bind equivalent that works at least back to IE6
    function bindMethod(obj, methodName) {
        var method = obj[methodName];
        if (typeof method.bind === 'function') {
            return method.bind(obj);
        } else {
            try {
                return Function.prototype.bind.call(method, obj);
            } catch (e) {
                // Missing bind shim or IE8 + Modernizr, fallback to wrapping
                return function() {
                    return Function.prototype.apply.apply(method, [obj, arguments]);
                };
            }
        }
    }

    // Build the best logging method possible for this env
    // Wherever possible we want to bind, not wrap, to preserve stack traces
    function realMethod(methodName) {
        if (methodName === 'debug') {
            methodName = 'log';
        }

        if (typeof console === undefinedType) {
            return false; // No method possible, for now - fixed later by enableLoggingWhenConsoleArrives
        } else if (console[methodName] !== undefined) {
            return bindMethod(console, methodName);
        } else if (console.log !== undefined) {
            return bindMethod(console, 'log');
        } else {
            return noop;
        }
    }

    // These private functions always need `this` to be set properly

    function replaceLoggingMethods(level, loggerName) {
        /*jshint validthis:true */
        for (var i = 0; i < logMethods.length; i++) {
            var methodName = logMethods[i];
            this[methodName] = (i < level) ?
                noop :
                this.methodFactory(methodName, level, loggerName);
        }

        // Define log.log as an alias for log.debug
        this.log = this.debug;
    }

    // In old IE versions, the console isn't present until you first open it.
    // We build realMethod() replacements here that regenerate logging methods
    function enableLoggingWhenConsoleArrives(methodName, level, loggerName) {
        return function () {
            if (typeof console !== undefinedType) {
                replaceLoggingMethods.call(this, level, loggerName);
                this[methodName].apply(this, arguments);
            }
        };
    }

    // By default, we use closely bound real methods wherever possible, and
    // otherwise we wait for a console to appear, and then try again.
    function defaultMethodFactory(methodName, level, loggerName) {
        /*jshint validthis:true */
        return realMethod(methodName) ||
               enableLoggingWhenConsoleArrives.apply(this, arguments);
    }

    function Logger(name, defaultLevel, factory) {
      var self = this;
      var currentLevel;
      var storageKey = "loglevel";
      if (name) {
        storageKey += ":" + name;
      }

      function persistLevelIfPossible(levelNum) {
          var levelName = (logMethods[levelNum] || 'silent').toUpperCase();

          if (typeof window === undefinedType) return;

          // Use localStorage if available
          try {
              window.localStorage[storageKey] = levelName;
              return;
          } catch (ignore) {}

          // Use session cookie as fallback
          try {
              window.document.cookie =
                encodeURIComponent(storageKey) + "=" + levelName + ";";
          } catch (ignore) {}
      }

      function getPersistedLevel() {
          var storedLevel;

          if (typeof window === undefinedType) return;

          try {
              storedLevel = window.localStorage[storageKey];
          } catch (ignore) {}

          // Fallback to cookies if local storage gives us nothing
          if (typeof storedLevel === undefinedType) {
              try {
                  var cookie = window.document.cookie;
                  var location = cookie.indexOf(
                      encodeURIComponent(storageKey) + "=");
                  if (location !== -1) {
                      storedLevel = /^([^;]+)/.exec(cookie.slice(location))[1];
                  }
              } catch (ignore) {}
          }

          // If the stored level is not valid, treat it as if nothing was stored.
          if (self.levels[storedLevel] === undefined) {
              storedLevel = undefined;
          }

          return storedLevel;
      }

      /*
       *
       * Public logger API - see https://github.com/pimterry/loglevel for details
       *
       */

      self.name = name;

      self.levels = { "TRACE": 0, "DEBUG": 1, "INFO": 2, "WARN": 3,
          "ERROR": 4, "SILENT": 5};

      self.methodFactory = factory || defaultMethodFactory;

      self.getLevel = function () {
          return currentLevel;
      };

      self.setLevel = function (level, persist) {
          if (typeof level === "string" && self.levels[level.toUpperCase()] !== undefined) {
              level = self.levels[level.toUpperCase()];
          }
          if (typeof level === "number" && level >= 0 && level <= self.levels.SILENT) {
              currentLevel = level;
              if (persist !== false) {  // defaults to true
                  persistLevelIfPossible(level);
              }
              replaceLoggingMethods.call(self, level, name);
              if (typeof console === undefinedType && level < self.levels.SILENT) {
                  return "No console available for logging";
              }
          } else {
              throw "log.setLevel() called with invalid level: " + level;
          }
      };

      self.setDefaultLevel = function (level) {
          if (!getPersistedLevel()) {
              self.setLevel(level, false);
          }
      };

      self.enableAll = function(persist) {
          self.setLevel(self.levels.TRACE, persist);
      };

      self.disableAll = function(persist) {
          self.setLevel(self.levels.SILENT, persist);
      };

      // Initialize with the right level
      var initialLevel = getPersistedLevel();
      if (initialLevel == null) {
          initialLevel = defaultLevel == null ? "WARN" : defaultLevel;
      }
      self.setLevel(initialLevel, false);
    }

    /*
     *
     * Top-level API
     *
     */

    var defaultLogger = new Logger();

    var _loggersByName = {};
    defaultLogger.getLogger = function getLogger(name) {
        if (typeof name !== "string" || name === "") {
          throw new TypeError("You must supply a name when creating a logger.");
        }

        var logger = _loggersByName[name];
        if (!logger) {
          logger = _loggersByName[name] = new Logger(
            name, defaultLogger.getLevel(), defaultLogger.methodFactory);
        }
        return logger;
    };

    // Grab the current global log variable in case of overwrite
    var _log = (typeof window !== undefinedType) ? window.log : undefined;
    defaultLogger.noConflict = function() {
        if (typeof window !== undefinedType &&
               window.log === defaultLogger) {
            window.log = _log;
        }

        return defaultLogger;
    };

    defaultLogger.getLoggers = function getLoggers() {
        return _loggersByName;
    };

    return defaultLogger;
}));

},{}],"/opt/panxf/metamask-extension/node_modules/_obj-multiplex@1.0.0@obj-multiplex/index.js":[function(_dereq_,module,exports){
const { Duplex } = _dereq_('readable-stream')
const endOfStream = _dereq_('end-of-stream')
const once = _dereq_('once')
const noop = () => {}

const IGNORE_SUBSTREAM = {}


class ObjectMultiplex extends Duplex {

  constructor(_opts = {}) {
    const opts = Object.assign({}, _opts, {
      objectMode: true,
    })
    super(opts)

    this._substreams = {}
  }

  createStream (name) {
    // validate name
    if (!name) throw new Error('ObjectMultiplex - name must not be empty')
    if (this._substreams[name]) throw new Error('ObjectMultiplex - Substream for name "${name}" already exists')

    // create substream
    const substream = new Substream({ parent: this, name: name })
    this._substreams[name] = substream

    // listen for parent stream to end
    anyStreamEnd(this, (err) => {
      substream.destroy(err)
    })

    return substream
  }

  // ignore streams (dont display orphaned data warning)
  ignoreStream (name) {
    // validate name
    if (!name) throw new Error('ObjectMultiplex - name must not be empty')
    if (this._substreams[name]) throw new Error('ObjectMultiplex - Substream for name "${name}" already exists')
    // set
    this._substreams[name] = IGNORE_SUBSTREAM
  }

  // stream plumbing

  _read () {}

  _write(chunk, encoding, callback) {
    // parse message
    const name = chunk.name
    const data = chunk.data
    if (!name) {
      console.warn(`ObjectMultiplex - malformed chunk without name "${chunk}"`)
      return callback()
    }

    // get corresponding substream
    const substream = this._substreams[name]
    if (!substream) {
      console.warn(`ObjectMultiplex - orphaned data for stream "${name}"`)
      return callback()
    }

    // push data into substream
    if (substream !== IGNORE_SUBSTREAM) {
      substream.push(data)
    }

    callback()
  }

}


class Substream extends Duplex {

  constructor ({ parent, name }) {
    super({
      objectMode: true,
    })

    this._parent = parent
    this._name = name
  }

  _read () {}

  _write (chunk, enc, callback) {
    this._parent.push({
      name: this._name,
      data: chunk,
    })
    callback()
  }

}

module.exports = ObjectMultiplex

// util

function anyStreamEnd(stream, _cb) {
  const cb = once(_cb)
  endOfStream(stream, { readable: false }, cb)
  endOfStream(stream, { writable: false }, cb)
}
},{"end-of-stream":"/opt/panxf/metamask-extension/node_modules/_end-of-stream@1.4.1@end-of-stream/index.js","once":"/opt/panxf/metamask-extension/node_modules/_once@1.4.0@once/once.js","readable-stream":"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/readable-browser.js"}],"/opt/panxf/metamask-extension/node_modules/_obs-store@3.0.0@obs-store/index.js":[function(_dereq_,module,exports){
'use strict';

var _assign = _dereq_('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _typeof2 = _dereq_('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _getPrototypeOf = _dereq_('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = _dereq_('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = _dereq_('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var extend = _dereq_('xtend');
var EventEmitter = _dereq_('events');

var ObservableStore = function (_EventEmitter) {
  (0, _inherits3.default)(ObservableStore, _EventEmitter);

  function ObservableStore() {
    var initState = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    (0, _classCallCheck3.default)(this, ObservableStore);

    // set init state
    var _this = (0, _possibleConstructorReturn3.default)(this, (ObservableStore.__proto__ || (0, _getPrototypeOf2.default)(ObservableStore)).call(this));

    _this._state = initState;
    return _this;
  }

  // wrapper around internal getState


  (0, _createClass3.default)(ObservableStore, [{
    key: 'getState',
    value: function getState() {
      return this._getState();
    }

    // wrapper around internal putState

  }, {
    key: 'putState',
    value: function putState(newState) {
      this._putState(newState);
      this.emit('update', newState);
    }
  }, {
    key: 'updateState',
    value: function updateState(partialState) {
      // if non-null object, merge
      if (partialState && (typeof partialState === 'undefined' ? 'undefined' : (0, _typeof3.default)(partialState)) === 'object') {
        var state = this.getState();
        var newState = (0, _assign2.default)({}, state, partialState);
        this.putState(newState);
        // if not object, use new value
      } else {
        this.putState(partialState);
      }
    }

    // subscribe to changes

  }, {
    key: 'subscribe',
    value: function subscribe(handler) {
      this.on('update', handler);
    }

    // unsubscribe to changes

  }, {
    key: 'unsubscribe',
    value: function unsubscribe(handler) {
      this.removeListener('update', handler);
    }

    //
    // private
    //

    // read from persistence

  }, {
    key: '_getState',
    value: function _getState() {
      return this._state;
    }

    // write to persistence

  }, {
    key: '_putState',
    value: function _putState(newState) {
      this._state = newState;
    }
  }]);
  return ObservableStore;
}(EventEmitter);

module.exports = ObservableStore;

},{"babel-runtime/core-js/object/assign":"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/core-js/object/assign.js","babel-runtime/core-js/object/get-prototype-of":"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/core-js/object/get-prototype-of.js","babel-runtime/helpers/classCallCheck":"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/helpers/classCallCheck.js","babel-runtime/helpers/createClass":"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/helpers/createClass.js","babel-runtime/helpers/inherits":"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/helpers/inherits.js","babel-runtime/helpers/possibleConstructorReturn":"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/helpers/possibleConstructorReturn.js","babel-runtime/helpers/typeof":"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/helpers/typeof.js","events":"/opt/panxf/metamask-extension/node_modules/_events@2.1.0@events/events.js","xtend":"/opt/panxf/metamask-extension/node_modules/_xtend@4.0.1@xtend/immutable.js"}],"/opt/panxf/metamask-extension/node_modules/_obs-store@3.0.0@obs-store/lib/asStream.js":[function(_dereq_,module,exports){
'use strict';

var _getPrototypeOf = _dereq_('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = _dereq_('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = _dereq_('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = _dereq_('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = _dereq_('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var DuplexStream = _dereq_('stream').Duplex;

module.exports = asStream;

function asStream(obsStore) {
  return new ObsStoreStream(obsStore);
}

//
//
//
//

var ObsStoreStream = function (_DuplexStream) {
  (0, _inherits3.default)(ObsStoreStream, _DuplexStream);

  function ObsStoreStream(obsStore) {
    (0, _classCallCheck3.default)(this, ObsStoreStream);

    // dont buffer outgoing updates
    var _this = (0, _possibleConstructorReturn3.default)(this, (ObsStoreStream.__proto__ || (0, _getPrototypeOf2.default)(ObsStoreStream)).call(this, {
      // pass values, not serializations
      objectMode: true
    }));

    _this.resume();
    // subscribe to obsStore changes
    _this.obsStore = obsStore;
    _this.obsStore.subscribe(function (state) {
      return _this.push(state);
    });
    return _this;
  }

  // emit current state on new destination


  (0, _createClass3.default)(ObsStoreStream, [{
    key: 'pipe',
    value: function pipe(dest, options) {
      var result = DuplexStream.prototype.pipe.call(this, dest, options);
      dest.write(this.obsStore.getState());
      return result;
    }

    // write from incomming stream to state

  }, {
    key: '_write',
    value: function _write(chunk, encoding, callback) {
      this.obsStore.putState(chunk);
      callback();
    }

    // noop - outgoing stream is asking us if we have data we arent giving it

  }, {
    key: '_read',
    value: function _read(size) {}
  }]);
  return ObsStoreStream;
}(DuplexStream);

},{"babel-runtime/core-js/object/get-prototype-of":"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/core-js/object/get-prototype-of.js","babel-runtime/helpers/classCallCheck":"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/helpers/classCallCheck.js","babel-runtime/helpers/createClass":"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/helpers/createClass.js","babel-runtime/helpers/inherits":"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/helpers/inherits.js","babel-runtime/helpers/possibleConstructorReturn":"/opt/panxf/metamask-extension/node_modules/_babel-runtime@6.26.0@babel-runtime/helpers/possibleConstructorReturn.js","stream":"/opt/panxf/metamask-extension/node_modules/_stream-browserify@2.0.1@stream-browserify/index.js"}],"/opt/panxf/metamask-extension/node_modules/_once@1.4.0@once/once.js":[function(_dereq_,module,exports){
var wrappy = _dereq_('wrappy')
module.exports = wrappy(once)
module.exports.strict = wrappy(onceStrict)

once.proto = once(function () {
  Object.defineProperty(Function.prototype, 'once', {
    value: function () {
      return once(this)
    },
    configurable: true
  })

  Object.defineProperty(Function.prototype, 'onceStrict', {
    value: function () {
      return onceStrict(this)
    },
    configurable: true
  })
})

function once (fn) {
  var f = function () {
    if (f.called) return f.value
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  f.called = false
  return f
}

function onceStrict (fn) {
  var f = function () {
    if (f.called)
      throw new Error(f.onceError)
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  var name = fn.name || 'Function wrapped with `once`'
  f.onceError = name + " shouldn't be called more than once"
  f.called = false
  return f
}

},{"wrappy":"/opt/panxf/metamask-extension/node_modules/_wrappy@1.0.2@wrappy/wrappy.js"}],"/opt/panxf/metamask-extension/node_modules/_post-message-stream@3.0.0@post-message-stream/index.js":[function(_dereq_,module,exports){
const DuplexStream = _dereq_('readable-stream').Duplex
const inherits = _dereq_('util').inherits

module.exports = PostMessageStream

inherits(PostMessageStream, DuplexStream)

function PostMessageStream (opts) {
  DuplexStream.call(this, {
    objectMode: true,
  })

  this._name = opts.name
  this._target = opts.target
  this._targetWindow = opts.targetWindow || window
  this._origin = (opts.targetWindow ? '*' : location.origin)

  // initialization flags
  this._init = false
  this._haveSyn = false

  window.addEventListener('message', this._onMessage.bind(this), false)
  // send syncorization message
  this._write('SYN', null, noop)
  this.cork()
}

// private
PostMessageStream.prototype._onMessage = function (event) {
  var msg = event.data

  // validate message
  if (this._origin !== '*' && event.origin !== this._origin) return
  if (event.source !== this._targetWindow) return
  if (typeof msg !== 'object') return
  if (msg.target !== this._name) return
  if (!msg.data) return

  if (!this._init) {
    if (msg.data === 'SYN') {
      this._haveSyn = true
      this._write('ACK', null, noop)
    } else if (msg.data === 'ACK') {
      this._init = true
      if (!this._haveSyn) {
        this._write('ACK', null, noop)
      }
      this.uncork()
    }
  } else {
    // forward message
    try {
      this.push(msg.data)
    } catch (err) {
      this.emit('error', err)
    }
  }
}

// stream plumbing
PostMessageStream.prototype._read = noop

PostMessageStream.prototype._write = function (data, encoding, cb) {
  var message = {
    target: this._target,
    data: data,
  }
  this._targetWindow.postMessage(message, this._origin)
  cb()
}

// util

function noop () {}

},{"readable-stream":"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/readable-browser.js","util":"/opt/panxf/metamask-extension/node_modules/_util@0.10.3@util/util.js"}],"/opt/panxf/metamask-extension/node_modules/_process-nextick-args@2.0.0@process-nextick-args/index.js":[function(_dereq_,module,exports){
(function (process){
'use strict';

if (!process.version ||
    process.version.indexOf('v0.') === 0 ||
    process.version.indexOf('v1.') === 0 && process.version.indexOf('v1.8.') !== 0) {
  module.exports = { nextTick: nextTick };
} else {
  module.exports = process
}

function nextTick(fn, arg1, arg2, arg3) {
  if (typeof fn !== 'function') {
    throw new TypeError('"callback" argument must be a function');
  }
  var len = arguments.length;
  var args, i;
  switch (len) {
  case 0:
  case 1:
    return process.nextTick(fn);
  case 2:
    return process.nextTick(function afterTickOne() {
      fn.call(null, arg1);
    });
  case 3:
    return process.nextTick(function afterTickTwo() {
      fn.call(null, arg1, arg2);
    });
  case 4:
    return process.nextTick(function afterTickThree() {
      fn.call(null, arg1, arg2, arg3);
    });
  default:
    args = new Array(len - 1);
    i = 0;
    while (i < args.length) {
      args[i++] = arguments[i];
    }
    return process.nextTick(function afterTick() {
      fn.apply(null, args);
    });
  }
}


}).call(this,_dereq_('_process'))

},{"_process":"/opt/panxf/metamask-extension/node_modules/_process@0.11.10@process/browser.js"}],"/opt/panxf/metamask-extension/node_modules/_process@0.11.10@process/browser.js":[function(_dereq_,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],"/opt/panxf/metamask-extension/node_modules/_pump@3.0.0@pump/index.js":[function(_dereq_,module,exports){
(function (process){
var once = _dereq_('once')
var eos = _dereq_('end-of-stream')
var fs = _dereq_('fs') // we only need fs to get the ReadStream and WriteStream prototypes

var noop = function () {}
var ancient = /^v?\.0/.test(process.version)

var isFn = function (fn) {
  return typeof fn === 'function'
}

var isFS = function (stream) {
  if (!ancient) return false // newer node version do not need to care about fs is a special way
  if (!fs) return false // browser
  return (stream instanceof (fs.ReadStream || noop) || stream instanceof (fs.WriteStream || noop)) && isFn(stream.close)
}

var isRequest = function (stream) {
  return stream.setHeader && isFn(stream.abort)
}

var destroyer = function (stream, reading, writing, callback) {
  callback = once(callback)

  var closed = false
  stream.on('close', function () {
    closed = true
  })

  eos(stream, {readable: reading, writable: writing}, function (err) {
    if (err) return callback(err)
    closed = true
    callback()
  })

  var destroyed = false
  return function (err) {
    if (closed) return
    if (destroyed) return
    destroyed = true

    if (isFS(stream)) return stream.close(noop) // use close for fs streams to avoid fd leaks
    if (isRequest(stream)) return stream.abort() // request.destroy just do .end - .abort is what we want

    if (isFn(stream.destroy)) return stream.destroy()

    callback(err || new Error('stream was destroyed'))
  }
}

var call = function (fn) {
  fn()
}

var pipe = function (from, to) {
  return from.pipe(to)
}

var pump = function () {
  var streams = Array.prototype.slice.call(arguments)
  var callback = isFn(streams[streams.length - 1] || noop) && streams.pop() || noop

  if (Array.isArray(streams[0])) streams = streams[0]
  if (streams.length < 2) throw new Error('pump requires two streams per minimum')

  var error
  var destroys = streams.map(function (stream, i) {
    var reading = i < streams.length - 1
    var writing = i > 0
    return destroyer(stream, reading, writing, function (err) {
      if (!error) error = err
      if (err) destroys.forEach(call)
      if (reading) return
      destroys.forEach(call)
      callback(error)
    })
  })

  return streams.reduce(pipe)
}

module.exports = pump

}).call(this,_dereq_('_process'))

},{"_process":"/opt/panxf/metamask-extension/node_modules/_process@0.11.10@process/browser.js","end-of-stream":"/opt/panxf/metamask-extension/node_modules/_end-of-stream@1.4.1@end-of-stream/index.js","fs":"/opt/panxf/metamask-extension/node_modules/_browser-resolve@1.11.2@browser-resolve/empty.js","once":"/opt/panxf/metamask-extension/node_modules/_once@1.4.0@once/once.js"}],"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/duplex-browser.js":[function(_dereq_,module,exports){
module.exports = _dereq_('./lib/_stream_duplex.js');

},{"./lib/_stream_duplex.js":"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/lib/_stream_duplex.js"}],"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/lib/_stream_duplex.js":[function(_dereq_,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

'use strict';

/*<replacement>*/

var pna = _dereq_('process-nextick-args');
/*</replacement>*/

/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    keys.push(key);
  }return keys;
};
/*</replacement>*/

module.exports = Duplex;

/*<replacement>*/
var util = _dereq_('core-util-is');
util.inherits = _dereq_('inherits');
/*</replacement>*/

var Readable = _dereq_('./_stream_readable');
var Writable = _dereq_('./_stream_writable');

util.inherits(Duplex, Readable);

{
  // avoid scope creep, the keys array can then be collected
  var keys = objectKeys(Writable.prototype);
  for (var v = 0; v < keys.length; v++) {
    var method = keys[v];
    if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
  }
}

function Duplex(options) {
  if (!(this instanceof Duplex)) return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false) this.readable = false;

  if (options && options.writable === false) this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false) this.allowHalfOpen = false;

  this.once('end', onend);
}

Object.defineProperty(Duplex.prototype, 'writableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function () {
    return this._writableState.highWaterMark;
  }
});

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended) return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  pna.nextTick(onEndNT, this);
}

function onEndNT(self) {
  self.end();
}

Object.defineProperty(Duplex.prototype, 'destroyed', {
  get: function () {
    if (this._readableState === undefined || this._writableState === undefined) {
      return false;
    }
    return this._readableState.destroyed && this._writableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (this._readableState === undefined || this._writableState === undefined) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._readableState.destroyed = value;
    this._writableState.destroyed = value;
  }
});

Duplex.prototype._destroy = function (err, cb) {
  this.push(null);
  this.end();

  pna.nextTick(cb, err);
};
},{"./_stream_readable":"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/lib/_stream_readable.js","./_stream_writable":"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/lib/_stream_writable.js","core-util-is":"/opt/panxf/metamask-extension/node_modules/_core-util-is@1.0.2@core-util-is/lib/util.js","inherits":"/opt/panxf/metamask-extension/node_modules/_inherits@2.0.3@inherits/inherits_browser.js","process-nextick-args":"/opt/panxf/metamask-extension/node_modules/_process-nextick-args@2.0.0@process-nextick-args/index.js"}],"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/lib/_stream_passthrough.js":[function(_dereq_,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

'use strict';

module.exports = PassThrough;

var Transform = _dereq_('./_stream_transform');

/*<replacement>*/
var util = _dereq_('core-util-is');
util.inherits = _dereq_('inherits');
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough)) return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function (chunk, encoding, cb) {
  cb(null, chunk);
};
},{"./_stream_transform":"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/lib/_stream_transform.js","core-util-is":"/opt/panxf/metamask-extension/node_modules/_core-util-is@1.0.2@core-util-is/lib/util.js","inherits":"/opt/panxf/metamask-extension/node_modules/_inherits@2.0.3@inherits/inherits_browser.js"}],"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/lib/_stream_readable.js":[function(_dereq_,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

/*<replacement>*/

var pna = _dereq_('process-nextick-args');
/*</replacement>*/

module.exports = Readable;

/*<replacement>*/
var isArray = _dereq_('isarray');
/*</replacement>*/

/*<replacement>*/
var Duplex;
/*</replacement>*/

Readable.ReadableState = ReadableState;

/*<replacement>*/
var EE = _dereq_('events').EventEmitter;

var EElistenerCount = function (emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

/*<replacement>*/
var Stream = _dereq_('./internal/streams/stream');
/*</replacement>*/

/*<replacement>*/

var Buffer = _dereq_('safe-buffer').Buffer;
var OurUint8Array = global.Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}
function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}

/*</replacement>*/

/*<replacement>*/
var util = _dereq_('core-util-is');
util.inherits = _dereq_('inherits');
/*</replacement>*/

/*<replacement>*/
var debugUtil = _dereq_('util');
var debug = void 0;
if (debugUtil && debugUtil.debuglog) {
  debug = debugUtil.debuglog('stream');
} else {
  debug = function () {};
}
/*</replacement>*/

var BufferList = _dereq_('./internal/streams/BufferList');
var destroyImpl = _dereq_('./internal/streams/destroy');
var StringDecoder;

util.inherits(Readable, Stream);

var kProxyEvents = ['error', 'close', 'destroy', 'pause', 'resume'];

function prependListener(emitter, event, fn) {
  // Sadly this is not cacheable as some libraries bundle their own
  // event emitter implementation with them.
  if (typeof emitter.prependListener === 'function') return emitter.prependListener(event, fn);

  // This is a hack to make sure that our error handler is attached before any
  // userland ones.  NEVER DO THIS. This is here only because this code needs
  // to continue to work with older versions of Node.js that do not include
  // the prependListener() method. The goal is to eventually remove this hack.
  if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);else if (isArray(emitter._events[event])) emitter._events[event].unshift(fn);else emitter._events[event] = [fn, emitter._events[event]];
}

function ReadableState(options, stream) {
  Duplex = Duplex || _dereq_('./_stream_duplex');

  options = options || {};

  // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream.
  // These options can be provided separately as readableXXX and writableXXX.
  var isDuplex = stream instanceof Duplex;

  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  if (isDuplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  var readableHwm = options.readableHighWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;

  if (hwm || hwm === 0) this.highWaterMark = hwm;else if (isDuplex && (readableHwm || readableHwm === 0)) this.highWaterMark = readableHwm;else this.highWaterMark = defaultHwm;

  // cast to ints.
  this.highWaterMark = Math.floor(this.highWaterMark);

  // A linked list is used to store data chunks instead of an array because the
  // linked list can remove elements from the beginning faster than
  // array.shift()
  this.buffer = new BufferList();
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the event 'readable'/'data' is emitted
  // immediately, or on a later tick.  We set this to true at first, because
  // any actions that shouldn't happen until "later" should generally also
  // not happen before the first read call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;
  this.resumeScheduled = false;

  // has it been destroyed
  this.destroyed = false;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder) StringDecoder = _dereq_('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  Duplex = Duplex || _dereq_('./_stream_duplex');

  if (!(this instanceof Readable)) return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  if (options) {
    if (typeof options.read === 'function') this._read = options.read;

    if (typeof options.destroy === 'function') this._destroy = options.destroy;
  }

  Stream.call(this);
}

Object.defineProperty(Readable.prototype, 'destroyed', {
  get: function () {
    if (this._readableState === undefined) {
      return false;
    }
    return this._readableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._readableState) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._readableState.destroyed = value;
  }
});

Readable.prototype.destroy = destroyImpl.destroy;
Readable.prototype._undestroy = destroyImpl.undestroy;
Readable.prototype._destroy = function (err, cb) {
  this.push(null);
  cb(err);
};

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function (chunk, encoding) {
  var state = this._readableState;
  var skipChunkCheck;

  if (!state.objectMode) {
    if (typeof chunk === 'string') {
      encoding = encoding || state.defaultEncoding;
      if (encoding !== state.encoding) {
        chunk = Buffer.from(chunk, encoding);
        encoding = '';
      }
      skipChunkCheck = true;
    }
  } else {
    skipChunkCheck = true;
  }

  return readableAddChunk(this, chunk, encoding, false, skipChunkCheck);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function (chunk) {
  return readableAddChunk(this, chunk, null, true, false);
};

function readableAddChunk(stream, chunk, encoding, addToFront, skipChunkCheck) {
  var state = stream._readableState;
  if (chunk === null) {
    state.reading = false;
    onEofChunk(stream, state);
  } else {
    var er;
    if (!skipChunkCheck) er = chunkInvalid(state, chunk);
    if (er) {
      stream.emit('error', er);
    } else if (state.objectMode || chunk && chunk.length > 0) {
      if (typeof chunk !== 'string' && !state.objectMode && Object.getPrototypeOf(chunk) !== Buffer.prototype) {
        chunk = _uint8ArrayToBuffer(chunk);
      }

      if (addToFront) {
        if (state.endEmitted) stream.emit('error', new Error('stream.unshift() after end event'));else addChunk(stream, state, chunk, true);
      } else if (state.ended) {
        stream.emit('error', new Error('stream.push() after EOF'));
      } else {
        state.reading = false;
        if (state.decoder && !encoding) {
          chunk = state.decoder.write(chunk);
          if (state.objectMode || chunk.length !== 0) addChunk(stream, state, chunk, false);else maybeReadMore(stream, state);
        } else {
          addChunk(stream, state, chunk, false);
        }
      }
    } else if (!addToFront) {
      state.reading = false;
    }
  }

  return needMoreData(state);
}

function addChunk(stream, state, chunk, addToFront) {
  if (state.flowing && state.length === 0 && !state.sync) {
    stream.emit('data', chunk);
    stream.read(0);
  } else {
    // update the buffer info.
    state.length += state.objectMode ? 1 : chunk.length;
    if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);

    if (state.needReadable) emitReadable(stream);
  }
  maybeReadMore(stream, state);
}

function chunkInvalid(state, chunk) {
  var er;
  if (!_isUint8Array(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}

// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
}

Readable.prototype.isPaused = function () {
  return this._readableState.flowing === false;
};

// backwards compatibility.
Readable.prototype.setEncoding = function (enc) {
  if (!StringDecoder) StringDecoder = _dereq_('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
  return this;
};

// Don't raise the hwm > 8MB
var MAX_HWM = 0x800000;
function computeNewHighWaterMark(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2 to prevent increasing hwm excessively in
    // tiny amounts
    n--;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    n++;
  }
  return n;
}

// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function howMuchToRead(n, state) {
  if (n <= 0 || state.length === 0 && state.ended) return 0;
  if (state.objectMode) return 1;
  if (n !== n) {
    // Only flow one buffer at a time
    if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
  }
  // If we're asking for more than the current hwm, then raise the hwm.
  if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
  if (n <= state.length) return n;
  // Don't have enough
  if (!state.ended) {
    state.needReadable = true;
    return 0;
  }
  return state.length;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function (n) {
  debug('read', n);
  n = parseInt(n, 10);
  var state = this._readableState;
  var nOrig = n;

  if (n !== 0) state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0) endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  } else if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0) state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
    // If _read pushed data synchronously, then `reading` will be false,
    // and we need to re-evaluate how much data we can return to the user.
    if (!state.reading) n = howMuchToRead(nOrig, state);
  }

  var ret;
  if (n > 0) ret = fromList(n, state);else ret = null;

  if (ret === null) {
    state.needReadable = true;
    n = 0;
  } else {
    state.length -= n;
  }

  if (state.length === 0) {
    // If we have nothing in the buffer, then we want to know
    // as soon as we *do* get something into the buffer.
    if (!state.ended) state.needReadable = true;

    // If we tried to read() past the EOF, then emit end on the next tick.
    if (nOrig !== n && state.ended) endReadable(this);
  }

  if (ret !== null) this.emit('data', ret);

  return ret;
};

function onEofChunk(stream, state) {
  if (state.ended) return;
  if (state.decoder) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // emit 'readable' now to make sure it gets picked up.
  emitReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    if (state.sync) pna.nextTick(emitReadable_, stream);else emitReadable_(stream);
  }
}

function emitReadable_(stream) {
  debug('emit readable');
  stream.emit('readable');
  flow(stream);
}

// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    pna.nextTick(maybeReadMore_, stream, state);
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;else len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function (n) {
  this.emit('error', new Error('_read() is not implemented'));
};

Readable.prototype.pipe = function (dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

  var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;

  var endFn = doEnd ? onend : unpipe;
  if (state.endEmitted) pna.nextTick(endFn);else src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable, unpipeInfo) {
    debug('onunpipe');
    if (readable === src) {
      if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
        unpipeInfo.hasUnpiped = true;
        cleanup();
      }
    }
  }

  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  var cleanedUp = false;
  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', unpipe);
    src.removeListener('data', ondata);

    cleanedUp = true;

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
  }

  // If the user pushes more data while we're writing to dest then we'll end up
  // in ondata again. However, we only want to increase awaitDrain once because
  // dest will only emit one 'drain' event for the multiple writes.
  // => Introduce a guard on increasing awaitDrain.
  var increasedAwaitDrain = false;
  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    increasedAwaitDrain = false;
    var ret = dest.write(chunk);
    if (false === ret && !increasedAwaitDrain) {
      // If the user unpiped during `dest.write()`, it is possible
      // to get stuck in a permanently paused state if that write
      // also returned false.
      // => Check whether `dest` is still a piping destination.
      if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
        debug('false write response, pause', src._readableState.awaitDrain);
        src._readableState.awaitDrain++;
        increasedAwaitDrain = true;
      }
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EElistenerCount(dest, 'error') === 0) dest.emit('error', er);
  }

  // Make sure our error handler is attached before userland ones.
  prependListener(dest, 'error', onerror);

  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }

  return dest;
};

function pipeOnDrain(src) {
  return function () {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain) state.awaitDrain--;
    if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}

Readable.prototype.unpipe = function (dest) {
  var state = this._readableState;
  var unpipeInfo = { hasUnpiped: false };

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0) return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes) return this;

    if (!dest) dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest) dest.emit('unpipe', this, unpipeInfo);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;

    for (var i = 0; i < len; i++) {
      dests[i].emit('unpipe', this, unpipeInfo);
    }return this;
  }

  // try to find the right one.
  var index = indexOf(state.pipes, dest);
  if (index === -1) return this;

  state.pipes.splice(index, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1) state.pipes = state.pipes[0];

  dest.emit('unpipe', this, unpipeInfo);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function (ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  if (ev === 'data') {
    // Start flowing on next tick if stream isn't explicitly paused
    if (this._readableState.flowing !== false) this.resume();
  } else if (ev === 'readable') {
    var state = this._readableState;
    if (!state.endEmitted && !state.readableListening) {
      state.readableListening = state.needReadable = true;
      state.emittedReadable = false;
      if (!state.reading) {
        pna.nextTick(nReadingNextTick, this);
      } else if (state.length) {
        emitReadable(this);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

function nReadingNextTick(self) {
  debug('readable nexttick read 0');
  self.read(0);
}

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function () {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    state.flowing = true;
    resume(this, state);
  }
  return this;
};

function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    pna.nextTick(resume_, stream, state);
  }
}

function resume_(stream, state) {
  if (!state.reading) {
    debug('resume read 0');
    stream.read(0);
  }

  state.resumeScheduled = false;
  state.awaitDrain = 0;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading) stream.read(0);
}

Readable.prototype.pause = function () {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (false !== this._readableState.flowing) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  return this;
};

function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  while (state.flowing && stream.read() !== null) {}
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function (stream) {
  var _this = this;

  var state = this._readableState;
  var paused = false;

  stream.on('end', function () {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length) _this.push(chunk);
    }

    _this.push(null);
  });

  stream.on('data', function (chunk) {
    debug('wrapped data');
    if (state.decoder) chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;

    var ret = _this.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (this[i] === undefined && typeof stream[i] === 'function') {
      this[i] = function (method) {
        return function () {
          return stream[method].apply(stream, arguments);
        };
      }(i);
    }
  }

  // proxy certain important events.
  for (var n = 0; n < kProxyEvents.length; n++) {
    stream.on(kProxyEvents[n], this.emit.bind(this, kProxyEvents[n]));
  }

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  this._read = function (n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return this;
};

Object.defineProperty(Readable.prototype, 'readableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function () {
    return this._readableState.highWaterMark;
  }
});

// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromList(n, state) {
  // nothing buffered
  if (state.length === 0) return null;

  var ret;
  if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
    // read it all, truncate the list
    if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.head.data;else ret = state.buffer.concat(state.length);
    state.buffer.clear();
  } else {
    // read part of list
    ret = fromListPartial(n, state.buffer, state.decoder);
  }

  return ret;
}

// Extracts only enough buffered data to satisfy the amount requested.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromListPartial(n, list, hasStrings) {
  var ret;
  if (n < list.head.data.length) {
    // slice is the same for buffers and strings
    ret = list.head.data.slice(0, n);
    list.head.data = list.head.data.slice(n);
  } else if (n === list.head.data.length) {
    // first chunk is a perfect match
    ret = list.shift();
  } else {
    // result spans more than one buffer
    ret = hasStrings ? copyFromBufferString(n, list) : copyFromBuffer(n, list);
  }
  return ret;
}

// Copies a specified amount of characters from the list of buffered data
// chunks.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function copyFromBufferString(n, list) {
  var p = list.head;
  var c = 1;
  var ret = p.data;
  n -= ret.length;
  while (p = p.next) {
    var str = p.data;
    var nb = n > str.length ? str.length : n;
    if (nb === str.length) ret += str;else ret += str.slice(0, n);
    n -= nb;
    if (n === 0) {
      if (nb === str.length) {
        ++c;
        if (p.next) list.head = p.next;else list.head = list.tail = null;
      } else {
        list.head = p;
        p.data = str.slice(nb);
      }
      break;
    }
    ++c;
  }
  list.length -= c;
  return ret;
}

// Copies a specified amount of bytes from the list of buffered data chunks.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function copyFromBuffer(n, list) {
  var ret = Buffer.allocUnsafe(n);
  var p = list.head;
  var c = 1;
  p.data.copy(ret);
  n -= p.data.length;
  while (p = p.next) {
    var buf = p.data;
    var nb = n > buf.length ? buf.length : n;
    buf.copy(ret, ret.length - n, 0, nb);
    n -= nb;
    if (n === 0) {
      if (nb === buf.length) {
        ++c;
        if (p.next) list.head = p.next;else list.head = list.tail = null;
      } else {
        list.head = p;
        p.data = buf.slice(nb);
      }
      break;
    }
    ++c;
  }
  list.length -= c;
  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0) throw new Error('"endReadable()" called on non-empty stream');

  if (!state.endEmitted) {
    state.ended = true;
    pna.nextTick(endReadableNT, state, stream);
  }
}

function endReadableNT(state, stream) {
  // Check that we didn't get one last unshift.
  if (!state.endEmitted && state.length === 0) {
    state.endEmitted = true;
    stream.readable = false;
    stream.emit('end');
  }
}

function indexOf(xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}
}).call(this,_dereq_('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./_stream_duplex":"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/lib/_stream_duplex.js","./internal/streams/BufferList":"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/lib/internal/streams/BufferList.js","./internal/streams/destroy":"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/lib/internal/streams/destroy.js","./internal/streams/stream":"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/lib/internal/streams/stream-browser.js","_process":"/opt/panxf/metamask-extension/node_modules/_process@0.11.10@process/browser.js","core-util-is":"/opt/panxf/metamask-extension/node_modules/_core-util-is@1.0.2@core-util-is/lib/util.js","events":"/opt/panxf/metamask-extension/node_modules/_events@2.1.0@events/events.js","inherits":"/opt/panxf/metamask-extension/node_modules/_inherits@2.0.3@inherits/inherits_browser.js","isarray":"/opt/panxf/metamask-extension/node_modules/_isarray@1.0.0@isarray/index.js","process-nextick-args":"/opt/panxf/metamask-extension/node_modules/_process-nextick-args@2.0.0@process-nextick-args/index.js","safe-buffer":"/opt/panxf/metamask-extension/node_modules/_safe-buffer@5.1.2@safe-buffer/index.js","string_decoder/":"/opt/panxf/metamask-extension/node_modules/_string_decoder@1.1.1@string_decoder/lib/string_decoder.js","util":"/opt/panxf/metamask-extension/node_modules/_browser-resolve@1.11.2@browser-resolve/empty.js"}],"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/lib/_stream_transform.js":[function(_dereq_,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

'use strict';

module.exports = Transform;

var Duplex = _dereq_('./_stream_duplex');

/*<replacement>*/
var util = _dereq_('core-util-is');
util.inherits = _dereq_('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);

function afterTransform(er, data) {
  var ts = this._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb) {
    return this.emit('error', new Error('write callback called multiple times'));
  }

  ts.writechunk = null;
  ts.writecb = null;

  if (data != null) // single equals check for both `null` and `undefined`
    this.push(data);

  cb(er);

  var rs = this._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    this._read(rs.highWaterMark);
  }
}

function Transform(options) {
  if (!(this instanceof Transform)) return new Transform(options);

  Duplex.call(this, options);

  this._transformState = {
    afterTransform: afterTransform.bind(this),
    needTransform: false,
    transforming: false,
    writecb: null,
    writechunk: null,
    writeencoding: null
  };

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  if (options) {
    if (typeof options.transform === 'function') this._transform = options.transform;

    if (typeof options.flush === 'function') this._flush = options.flush;
  }

  // When the writable side finishes, then flush out anything remaining.
  this.on('prefinish', prefinish);
}

function prefinish() {
  var _this = this;

  if (typeof this._flush === 'function') {
    this._flush(function (er, data) {
      done(_this, er, data);
    });
  } else {
    done(this, null, null);
  }
}

Transform.prototype.push = function (chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function (chunk, encoding, cb) {
  throw new Error('_transform() is not implemented');
};

Transform.prototype._write = function (chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function (n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};

Transform.prototype._destroy = function (err, cb) {
  var _this2 = this;

  Duplex.prototype._destroy.call(this, err, function (err2) {
    cb(err2);
    _this2.emit('close');
  });
};

function done(stream, er, data) {
  if (er) return stream.emit('error', er);

  if (data != null) // single equals check for both `null` and `undefined`
    stream.push(data);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  if (stream._writableState.length) throw new Error('Calling transform done when ws.length != 0');

  if (stream._transformState.transforming) throw new Error('Calling transform done when still transforming');

  return stream.push(null);
}
},{"./_stream_duplex":"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/lib/_stream_duplex.js","core-util-is":"/opt/panxf/metamask-extension/node_modules/_core-util-is@1.0.2@core-util-is/lib/util.js","inherits":"/opt/panxf/metamask-extension/node_modules/_inherits@2.0.3@inherits/inherits_browser.js"}],"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/lib/_stream_writable.js":[function(_dereq_,module,exports){
(function (process,global,setImmediate){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, encoding, cb), and it'll handle all
// the drain event emission and buffering.

'use strict';

/*<replacement>*/

var pna = _dereq_('process-nextick-args');
/*</replacement>*/

module.exports = Writable;

/* <replacement> */
function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
  this.next = null;
}

// It seems a linked list but it is not
// there will be only 2 of these for each stream
function CorkedRequest(state) {
  var _this = this;

  this.next = null;
  this.entry = null;
  this.finish = function () {
    onCorkedFinish(_this, state);
  };
}
/* </replacement> */

/*<replacement>*/
var asyncWrite = !process.browser && ['v0.10', 'v0.9.'].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : pna.nextTick;
/*</replacement>*/

/*<replacement>*/
var Duplex;
/*</replacement>*/

Writable.WritableState = WritableState;

/*<replacement>*/
var util = _dereq_('core-util-is');
util.inherits = _dereq_('inherits');
/*</replacement>*/

/*<replacement>*/
var internalUtil = {
  deprecate: _dereq_('util-deprecate')
};
/*</replacement>*/

/*<replacement>*/
var Stream = _dereq_('./internal/streams/stream');
/*</replacement>*/

/*<replacement>*/

var Buffer = _dereq_('safe-buffer').Buffer;
var OurUint8Array = global.Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}
function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}

/*</replacement>*/

var destroyImpl = _dereq_('./internal/streams/destroy');

util.inherits(Writable, Stream);

function nop() {}

function WritableState(options, stream) {
  Duplex = Duplex || _dereq_('./_stream_duplex');

  options = options || {};

  // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream.
  // These options can be provided separately as readableXXX and writableXXX.
  var isDuplex = stream instanceof Duplex;

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  if (isDuplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  var writableHwm = options.writableHighWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;

  if (hwm || hwm === 0) this.highWaterMark = hwm;else if (isDuplex && (writableHwm || writableHwm === 0)) this.highWaterMark = writableHwm;else this.highWaterMark = defaultHwm;

  // cast to ints.
  this.highWaterMark = Math.floor(this.highWaterMark);

  // if _final has been called
  this.finalCalled = false;

  // drain event flag.
  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // has it been destroyed
  this.destroyed = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function (er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.bufferedRequest = null;
  this.lastBufferedRequest = null;

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;

  // count buffered requests
  this.bufferedRequestCount = 0;

  // allocate the first CorkedRequest, there is always
  // one allocated and free to use, and we maintain at most two
  this.corkedRequestsFree = new CorkedRequest(this);
}

WritableState.prototype.getBuffer = function getBuffer() {
  var current = this.bufferedRequest;
  var out = [];
  while (current) {
    out.push(current);
    current = current.next;
  }
  return out;
};

(function () {
  try {
    Object.defineProperty(WritableState.prototype, 'buffer', {
      get: internalUtil.deprecate(function () {
        return this.getBuffer();
      }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.', 'DEP0003')
    });
  } catch (_) {}
})();

// Test _writableState for inheritance to account for Duplex streams,
// whose prototype chain only points to Readable.
var realHasInstance;
if (typeof Symbol === 'function' && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] === 'function') {
  realHasInstance = Function.prototype[Symbol.hasInstance];
  Object.defineProperty(Writable, Symbol.hasInstance, {
    value: function (object) {
      if (realHasInstance.call(this, object)) return true;
      if (this !== Writable) return false;

      return object && object._writableState instanceof WritableState;
    }
  });
} else {
  realHasInstance = function (object) {
    return object instanceof this;
  };
}

function Writable(options) {
  Duplex = Duplex || _dereq_('./_stream_duplex');

  // Writable ctor is applied to Duplexes, too.
  // `realHasInstance` is necessary because using plain `instanceof`
  // would return false, as no `_writableState` property is attached.

  // Trying to use the custom `instanceof` for Writable here will also break the
  // Node.js LazyTransform implementation, which has a non-trivial getter for
  // `_writableState` that would lead to infinite recursion.
  if (!realHasInstance.call(Writable, this) && !(this instanceof Duplex)) {
    return new Writable(options);
  }

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  if (options) {
    if (typeof options.write === 'function') this._write = options.write;

    if (typeof options.writev === 'function') this._writev = options.writev;

    if (typeof options.destroy === 'function') this._destroy = options.destroy;

    if (typeof options.final === 'function') this._final = options.final;
  }

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function () {
  this.emit('error', new Error('Cannot pipe, not readable'));
};

function writeAfterEnd(stream, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  pna.nextTick(cb, er);
}

// Checks that a user-supplied chunk is valid, especially for the particular
// mode the stream is in. Currently this means that `null` is never accepted
// and undefined/non-string values are only allowed in object mode.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  var er = false;

  if (chunk === null) {
    er = new TypeError('May not write null values to stream');
  } else if (typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  if (er) {
    stream.emit('error', er);
    pna.nextTick(cb, er);
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function (chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;
  var isBuf = !state.objectMode && _isUint8Array(chunk);

  if (isBuf && !Buffer.isBuffer(chunk)) {
    chunk = _uint8ArrayToBuffer(chunk);
  }

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (isBuf) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;

  if (typeof cb !== 'function') cb = nop;

  if (state.ended) writeAfterEnd(this, cb);else if (isBuf || validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, isBuf, chunk, encoding, cb);
  }

  return ret;
};

Writable.prototype.cork = function () {
  var state = this._writableState;

  state.corked++;
};

Writable.prototype.uncork = function () {
  var state = this._writableState;

  if (state.corked) {
    state.corked--;

    if (!state.writing && !state.corked && !state.finished && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
  }
};

Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
  // node::ParseEncoding() requires lower case.
  if (typeof encoding === 'string') encoding = encoding.toLowerCase();
  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new TypeError('Unknown encoding: ' + encoding);
  this._writableState.defaultEncoding = encoding;
  return this;
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
    chunk = Buffer.from(chunk, encoding);
  }
  return chunk;
}

Object.defineProperty(Writable.prototype, 'writableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function () {
    return this._writableState.highWaterMark;
  }
});

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, isBuf, chunk, encoding, cb) {
  if (!isBuf) {
    var newChunk = decodeChunk(state, chunk, encoding);
    if (chunk !== newChunk) {
      isBuf = true;
      encoding = 'buffer';
      chunk = newChunk;
    }
  }
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret) state.needDrain = true;

  if (state.writing || state.corked) {
    var last = state.lastBufferedRequest;
    state.lastBufferedRequest = {
      chunk: chunk,
      encoding: encoding,
      isBuf: isBuf,
      callback: cb,
      next: null
    };
    if (last) {
      last.next = state.lastBufferedRequest;
    } else {
      state.bufferedRequest = state.lastBufferedRequest;
    }
    state.bufferedRequestCount += 1;
  } else {
    doWrite(stream, state, false, len, chunk, encoding, cb);
  }

  return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  --state.pendingcb;

  if (sync) {
    // defer the callback if we are being called synchronously
    // to avoid piling up things on the stack
    pna.nextTick(cb, er);
    // this can emit finish, and it will always happen
    // after error
    pna.nextTick(finishMaybe, stream, state);
    stream._writableState.errorEmitted = true;
    stream.emit('error', er);
  } else {
    // the caller expect this to happen before if
    // it is async
    cb(er);
    stream._writableState.errorEmitted = true;
    stream.emit('error', er);
    // this can emit finish, but finish must
    // always follow error
    finishMaybe(stream, state);
  }
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er) onwriteError(stream, state, sync, er, cb);else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(state);

    if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
      clearBuffer(stream, state);
    }

    if (sync) {
      /*<replacement>*/
      asyncWrite(afterWrite, stream, state, finished, cb);
      /*</replacement>*/
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished) onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}

// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;
  var entry = state.bufferedRequest;

  if (stream._writev && entry && entry.next) {
    // Fast case, write everything using _writev()
    var l = state.bufferedRequestCount;
    var buffer = new Array(l);
    var holder = state.corkedRequestsFree;
    holder.entry = entry;

    var count = 0;
    var allBuffers = true;
    while (entry) {
      buffer[count] = entry;
      if (!entry.isBuf) allBuffers = false;
      entry = entry.next;
      count += 1;
    }
    buffer.allBuffers = allBuffers;

    doWrite(stream, state, true, state.length, buffer, '', holder.finish);

    // doWrite is almost always async, defer these to save a bit of time
    // as the hot path ends with doWrite
    state.pendingcb++;
    state.lastBufferedRequest = null;
    if (holder.next) {
      state.corkedRequestsFree = holder.next;
      holder.next = null;
    } else {
      state.corkedRequestsFree = new CorkedRequest(state);
    }
    state.bufferedRequestCount = 0;
  } else {
    // Slow case, write chunks one-by-one
    while (entry) {
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;

      doWrite(stream, state, false, len, chunk, encoding, cb);
      entry = entry.next;
      state.bufferedRequestCount--;
      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        break;
      }
    }

    if (entry === null) state.lastBufferedRequest = null;
  }

  state.bufferedRequest = entry;
  state.bufferProcessing = false;
}

Writable.prototype._write = function (chunk, encoding, cb) {
  cb(new Error('_write() is not implemented'));
};

Writable.prototype._writev = null;

Writable.prototype.end = function (chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished) endWritable(this, state, cb);
};

function needFinish(state) {
  return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
}
function callFinal(stream, state) {
  stream._final(function (err) {
    state.pendingcb--;
    if (err) {
      stream.emit('error', err);
    }
    state.prefinished = true;
    stream.emit('prefinish');
    finishMaybe(stream, state);
  });
}
function prefinish(stream, state) {
  if (!state.prefinished && !state.finalCalled) {
    if (typeof stream._final === 'function') {
      state.pendingcb++;
      state.finalCalled = true;
      pna.nextTick(callFinal, stream, state);
    } else {
      state.prefinished = true;
      stream.emit('prefinish');
    }
  }
}

function finishMaybe(stream, state) {
  var need = needFinish(state);
  if (need) {
    prefinish(stream, state);
    if (state.pendingcb === 0) {
      state.finished = true;
      stream.emit('finish');
    }
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished) pna.nextTick(cb);else stream.once('finish', cb);
  }
  state.ended = true;
  stream.writable = false;
}

function onCorkedFinish(corkReq, state, err) {
  var entry = corkReq.entry;
  corkReq.entry = null;
  while (entry) {
    var cb = entry.callback;
    state.pendingcb--;
    cb(err);
    entry = entry.next;
  }
  if (state.corkedRequestsFree) {
    state.corkedRequestsFree.next = corkReq;
  } else {
    state.corkedRequestsFree = corkReq;
  }
}

Object.defineProperty(Writable.prototype, 'destroyed', {
  get: function () {
    if (this._writableState === undefined) {
      return false;
    }
    return this._writableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._writableState) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._writableState.destroyed = value;
  }
});

Writable.prototype.destroy = destroyImpl.destroy;
Writable.prototype._undestroy = destroyImpl.undestroy;
Writable.prototype._destroy = function (err, cb) {
  this.end();
  cb(err);
};
}).call(this,_dereq_('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},_dereq_("timers").setImmediate)

},{"./_stream_duplex":"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/lib/_stream_duplex.js","./internal/streams/destroy":"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/lib/internal/streams/destroy.js","./internal/streams/stream":"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/lib/internal/streams/stream-browser.js","_process":"/opt/panxf/metamask-extension/node_modules/_process@0.11.10@process/browser.js","core-util-is":"/opt/panxf/metamask-extension/node_modules/_core-util-is@1.0.2@core-util-is/lib/util.js","inherits":"/opt/panxf/metamask-extension/node_modules/_inherits@2.0.3@inherits/inherits_browser.js","process-nextick-args":"/opt/panxf/metamask-extension/node_modules/_process-nextick-args@2.0.0@process-nextick-args/index.js","safe-buffer":"/opt/panxf/metamask-extension/node_modules/_safe-buffer@5.1.2@safe-buffer/index.js","timers":"/opt/panxf/metamask-extension/node_modules/_timers-browserify@1.4.2@timers-browserify/main.js","util-deprecate":"/opt/panxf/metamask-extension/node_modules/_util-deprecate@1.0.2@util-deprecate/browser.js"}],"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/lib/internal/streams/BufferList.js":[function(_dereq_,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Buffer = _dereq_('safe-buffer').Buffer;
var util = _dereq_('util');

function copyBuffer(src, target, offset) {
  src.copy(target, offset);
}

module.exports = function () {
  function BufferList() {
    _classCallCheck(this, BufferList);

    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  BufferList.prototype.push = function push(v) {
    var entry = { data: v, next: null };
    if (this.length > 0) this.tail.next = entry;else this.head = entry;
    this.tail = entry;
    ++this.length;
  };

  BufferList.prototype.unshift = function unshift(v) {
    var entry = { data: v, next: this.head };
    if (this.length === 0) this.tail = entry;
    this.head = entry;
    ++this.length;
  };

  BufferList.prototype.shift = function shift() {
    if (this.length === 0) return;
    var ret = this.head.data;
    if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
    --this.length;
    return ret;
  };

  BufferList.prototype.clear = function clear() {
    this.head = this.tail = null;
    this.length = 0;
  };

  BufferList.prototype.join = function join(s) {
    if (this.length === 0) return '';
    var p = this.head;
    var ret = '' + p.data;
    while (p = p.next) {
      ret += s + p.data;
    }return ret;
  };

  BufferList.prototype.concat = function concat(n) {
    if (this.length === 0) return Buffer.alloc(0);
    if (this.length === 1) return this.head.data;
    var ret = Buffer.allocUnsafe(n >>> 0);
    var p = this.head;
    var i = 0;
    while (p) {
      copyBuffer(p.data, ret, i);
      i += p.data.length;
      p = p.next;
    }
    return ret;
  };

  return BufferList;
}();

if (util && util.inspect && util.inspect.custom) {
  module.exports.prototype[util.inspect.custom] = function () {
    var obj = util.inspect({ length: this.length });
    return this.constructor.name + ' ' + obj;
  };
}
},{"safe-buffer":"/opt/panxf/metamask-extension/node_modules/_safe-buffer@5.1.2@safe-buffer/index.js","util":"/opt/panxf/metamask-extension/node_modules/_browser-resolve@1.11.2@browser-resolve/empty.js"}],"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/lib/internal/streams/destroy.js":[function(_dereq_,module,exports){
'use strict';

/*<replacement>*/

var pna = _dereq_('process-nextick-args');
/*</replacement>*/

// undocumented cb() API, needed for core, not for public API
function destroy(err, cb) {
  var _this = this;

  var readableDestroyed = this._readableState && this._readableState.destroyed;
  var writableDestroyed = this._writableState && this._writableState.destroyed;

  if (readableDestroyed || writableDestroyed) {
    if (cb) {
      cb(err);
    } else if (err && (!this._writableState || !this._writableState.errorEmitted)) {
      pna.nextTick(emitErrorNT, this, err);
    }
    return this;
  }

  // we set destroyed to true before firing error callbacks in order
  // to make it re-entrance safe in case destroy() is called within callbacks

  if (this._readableState) {
    this._readableState.destroyed = true;
  }

  // if this is a duplex stream mark the writable part as destroyed as well
  if (this._writableState) {
    this._writableState.destroyed = true;
  }

  this._destroy(err || null, function (err) {
    if (!cb && err) {
      pna.nextTick(emitErrorNT, _this, err);
      if (_this._writableState) {
        _this._writableState.errorEmitted = true;
      }
    } else if (cb) {
      cb(err);
    }
  });

  return this;
}

function undestroy() {
  if (this._readableState) {
    this._readableState.destroyed = false;
    this._readableState.reading = false;
    this._readableState.ended = false;
    this._readableState.endEmitted = false;
  }

  if (this._writableState) {
    this._writableState.destroyed = false;
    this._writableState.ended = false;
    this._writableState.ending = false;
    this._writableState.finished = false;
    this._writableState.errorEmitted = false;
  }
}

function emitErrorNT(self, err) {
  self.emit('error', err);
}

module.exports = {
  destroy: destroy,
  undestroy: undestroy
};
},{"process-nextick-args":"/opt/panxf/metamask-extension/node_modules/_process-nextick-args@2.0.0@process-nextick-args/index.js"}],"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/lib/internal/streams/stream-browser.js":[function(_dereq_,module,exports){
module.exports = _dereq_('events').EventEmitter;

},{"events":"/opt/panxf/metamask-extension/node_modules/_events@2.1.0@events/events.js"}],"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/passthrough.js":[function(_dereq_,module,exports){
module.exports = _dereq_('./readable').PassThrough

},{"./readable":"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/readable-browser.js"}],"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/readable-browser.js":[function(_dereq_,module,exports){
exports = module.exports = _dereq_('./lib/_stream_readable.js');
exports.Stream = exports;
exports.Readable = exports;
exports.Writable = _dereq_('./lib/_stream_writable.js');
exports.Duplex = _dereq_('./lib/_stream_duplex.js');
exports.Transform = _dereq_('./lib/_stream_transform.js');
exports.PassThrough = _dereq_('./lib/_stream_passthrough.js');

},{"./lib/_stream_duplex.js":"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/lib/_stream_duplex.js","./lib/_stream_passthrough.js":"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/lib/_stream_passthrough.js","./lib/_stream_readable.js":"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/lib/_stream_readable.js","./lib/_stream_transform.js":"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/lib/_stream_transform.js","./lib/_stream_writable.js":"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/lib/_stream_writable.js"}],"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/transform.js":[function(_dereq_,module,exports){
module.exports = _dereq_('./readable').Transform

},{"./readable":"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/readable-browser.js"}],"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/writable-browser.js":[function(_dereq_,module,exports){
module.exports = _dereq_('./lib/_stream_writable.js');

},{"./lib/_stream_writable.js":"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/lib/_stream_writable.js"}],"/opt/panxf/metamask-extension/node_modules/_safe-buffer@5.1.2@safe-buffer/index.js":[function(_dereq_,module,exports){
/* eslint-disable node/no-deprecated-api */
var buffer = _dereq_('buffer')
var Buffer = buffer.Buffer

// alternative to using Object.keys for old browsers
function copyProps (src, dst) {
  for (var key in src) {
    dst[key] = src[key]
  }
}
if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
  module.exports = buffer
} else {
  // Copy properties from require('buffer')
  copyProps(buffer, exports)
  exports.Buffer = SafeBuffer
}

function SafeBuffer (arg, encodingOrOffset, length) {
  return Buffer(arg, encodingOrOffset, length)
}

// Copy static methods from Buffer
copyProps(Buffer, SafeBuffer)

SafeBuffer.from = function (arg, encodingOrOffset, length) {
  if (typeof arg === 'number') {
    throw new TypeError('Argument must not be a number')
  }
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.alloc = function (size, fill, encoding) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  var buf = Buffer(size)
  if (fill !== undefined) {
    if (typeof encoding === 'string') {
      buf.fill(fill, encoding)
    } else {
      buf.fill(fill)
    }
  } else {
    buf.fill(0)
  }
  return buf
}

SafeBuffer.allocUnsafe = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return Buffer(size)
}

SafeBuffer.allocUnsafeSlow = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return buffer.SlowBuffer(size)
}

},{"buffer":"/opt/panxf/metamask-extension/node_modules/_buffer@5.1.0@buffer/index.js"}],"/opt/panxf/metamask-extension/node_modules/_stream-browserify@2.0.1@stream-browserify/index.js":[function(_dereq_,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Stream;

var EE = _dereq_('events').EventEmitter;
var inherits = _dereq_('inherits');

inherits(Stream, EE);
Stream.Readable = _dereq_('readable-stream/readable.js');
Stream.Writable = _dereq_('readable-stream/writable.js');
Stream.Duplex = _dereq_('readable-stream/duplex.js');
Stream.Transform = _dereq_('readable-stream/transform.js');
Stream.PassThrough = _dereq_('readable-stream/passthrough.js');

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"events":"/opt/panxf/metamask-extension/node_modules/_events@2.1.0@events/events.js","inherits":"/opt/panxf/metamask-extension/node_modules/_inherits@2.0.3@inherits/inherits_browser.js","readable-stream/duplex.js":"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/duplex-browser.js","readable-stream/passthrough.js":"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/passthrough.js","readable-stream/readable.js":"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/readable-browser.js","readable-stream/transform.js":"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/transform.js","readable-stream/writable.js":"/opt/panxf/metamask-extension/node_modules/_readable-stream@2.3.6@readable-stream/writable-browser.js"}],"/opt/panxf/metamask-extension/node_modules/_string_decoder@1.1.1@string_decoder/lib/string_decoder.js":[function(_dereq_,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

/*<replacement>*/

var Buffer = _dereq_('safe-buffer').Buffer;
/*</replacement>*/

var isEncoding = Buffer.isEncoding || function (encoding) {
  encoding = '' + encoding;
  switch (encoding && encoding.toLowerCase()) {
    case 'hex':case 'utf8':case 'utf-8':case 'ascii':case 'binary':case 'base64':case 'ucs2':case 'ucs-2':case 'utf16le':case 'utf-16le':case 'raw':
      return true;
    default:
      return false;
  }
};

function _normalizeEncoding(enc) {
  if (!enc) return 'utf8';
  var retried;
  while (true) {
    switch (enc) {
      case 'utf8':
      case 'utf-8':
        return 'utf8';
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return 'utf16le';
      case 'latin1':
      case 'binary':
        return 'latin1';
      case 'base64':
      case 'ascii':
      case 'hex':
        return enc;
      default:
        if (retried) return; // undefined
        enc = ('' + enc).toLowerCase();
        retried = true;
    }
  }
};

// Do not cache `Buffer.isEncoding` when checking encoding names as some
// modules monkey-patch it to support additional encodings
function normalizeEncoding(enc) {
  var nenc = _normalizeEncoding(enc);
  if (typeof nenc !== 'string' && (Buffer.isEncoding === isEncoding || !isEncoding(enc))) throw new Error('Unknown encoding: ' + enc);
  return nenc || enc;
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters.
exports.StringDecoder = StringDecoder;
function StringDecoder(encoding) {
  this.encoding = normalizeEncoding(encoding);
  var nb;
  switch (this.encoding) {
    case 'utf16le':
      this.text = utf16Text;
      this.end = utf16End;
      nb = 4;
      break;
    case 'utf8':
      this.fillLast = utf8FillLast;
      nb = 4;
      break;
    case 'base64':
      this.text = base64Text;
      this.end = base64End;
      nb = 3;
      break;
    default:
      this.write = simpleWrite;
      this.end = simpleEnd;
      return;
  }
  this.lastNeed = 0;
  this.lastTotal = 0;
  this.lastChar = Buffer.allocUnsafe(nb);
}

StringDecoder.prototype.write = function (buf) {
  if (buf.length === 0) return '';
  var r;
  var i;
  if (this.lastNeed) {
    r = this.fillLast(buf);
    if (r === undefined) return '';
    i = this.lastNeed;
    this.lastNeed = 0;
  } else {
    i = 0;
  }
  if (i < buf.length) return r ? r + this.text(buf, i) : this.text(buf, i);
  return r || '';
};

StringDecoder.prototype.end = utf8End;

// Returns only complete characters in a Buffer
StringDecoder.prototype.text = utf8Text;

// Attempts to complete a partial non-UTF-8 character using bytes from a Buffer
StringDecoder.prototype.fillLast = function (buf) {
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
  this.lastNeed -= buf.length;
};

// Checks the type of a UTF-8 byte, whether it's ASCII, a leading byte, or a
// continuation byte. If an invalid byte is detected, -2 is returned.
function utf8CheckByte(byte) {
  if (byte <= 0x7F) return 0;else if (byte >> 5 === 0x06) return 2;else if (byte >> 4 === 0x0E) return 3;else if (byte >> 3 === 0x1E) return 4;
  return byte >> 6 === 0x02 ? -1 : -2;
}

// Checks at most 3 bytes at the end of a Buffer in order to detect an
// incomplete multi-byte UTF-8 character. The total number of bytes (2, 3, or 4)
// needed to complete the UTF-8 character (if applicable) are returned.
function utf8CheckIncomplete(self, buf, i) {
  var j = buf.length - 1;
  if (j < i) return 0;
  var nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 1;
    return nb;
  }
  if (--j < i || nb === -2) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 2;
    return nb;
  }
  if (--j < i || nb === -2) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) {
      if (nb === 2) nb = 0;else self.lastNeed = nb - 3;
    }
    return nb;
  }
  return 0;
}

// Validates as many continuation bytes for a multi-byte UTF-8 character as
// needed or are available. If we see a non-continuation byte where we expect
// one, we "replace" the validated continuation bytes we've seen so far with
// a single UTF-8 replacement character ('\ufffd'), to match v8's UTF-8 decoding
// behavior. The continuation byte check is included three times in the case
// where all of the continuation bytes for a character exist in the same buffer.
// It is also done this way as a slight performance increase instead of using a
// loop.
function utf8CheckExtraBytes(self, buf, p) {
  if ((buf[0] & 0xC0) !== 0x80) {
    self.lastNeed = 0;
    return '\ufffd';
  }
  if (self.lastNeed > 1 && buf.length > 1) {
    if ((buf[1] & 0xC0) !== 0x80) {
      self.lastNeed = 1;
      return '\ufffd';
    }
    if (self.lastNeed > 2 && buf.length > 2) {
      if ((buf[2] & 0xC0) !== 0x80) {
        self.lastNeed = 2;
        return '\ufffd';
      }
    }
  }
}

// Attempts to complete a multi-byte UTF-8 character using bytes from a Buffer.
function utf8FillLast(buf) {
  var p = this.lastTotal - this.lastNeed;
  var r = utf8CheckExtraBytes(this, buf, p);
  if (r !== undefined) return r;
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, p, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, p, 0, buf.length);
  this.lastNeed -= buf.length;
}

// Returns all complete UTF-8 characters in a Buffer. If the Buffer ended on a
// partial character, the character's bytes are buffered until the required
// number of bytes are available.
function utf8Text(buf, i) {
  var total = utf8CheckIncomplete(this, buf, i);
  if (!this.lastNeed) return buf.toString('utf8', i);
  this.lastTotal = total;
  var end = buf.length - (total - this.lastNeed);
  buf.copy(this.lastChar, 0, end);
  return buf.toString('utf8', i, end);
}

// For UTF-8, a replacement character is added when ending on a partial
// character.
function utf8End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + '\ufffd';
  return r;
}

// UTF-16LE typically needs two bytes per character, but even if we have an even
// number of bytes available, we need to check if we end on a leading/high
// surrogate. In that case, we need to wait for the next two bytes in order to
// decode the last character properly.
function utf16Text(buf, i) {
  if ((buf.length - i) % 2 === 0) {
    var r = buf.toString('utf16le', i);
    if (r) {
      var c = r.charCodeAt(r.length - 1);
      if (c >= 0xD800 && c <= 0xDBFF) {
        this.lastNeed = 2;
        this.lastTotal = 4;
        this.lastChar[0] = buf[buf.length - 2];
        this.lastChar[1] = buf[buf.length - 1];
        return r.slice(0, -1);
      }
    }
    return r;
  }
  this.lastNeed = 1;
  this.lastTotal = 2;
  this.lastChar[0] = buf[buf.length - 1];
  return buf.toString('utf16le', i, buf.length - 1);
}

// For UTF-16LE we do not explicitly append special replacement characters if we
// end on a partial character, we simply let v8 handle that.
function utf16End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) {
    var end = this.lastTotal - this.lastNeed;
    return r + this.lastChar.toString('utf16le', 0, end);
  }
  return r;
}

function base64Text(buf, i) {
  var n = (buf.length - i) % 3;
  if (n === 0) return buf.toString('base64', i);
  this.lastNeed = 3 - n;
  this.lastTotal = 3;
  if (n === 1) {
    this.lastChar[0] = buf[buf.length - 1];
  } else {
    this.lastChar[0] = buf[buf.length - 2];
    this.lastChar[1] = buf[buf.length - 1];
  }
  return buf.toString('base64', i, buf.length - n);
}

function base64End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + this.lastChar.toString('base64', 0, 3 - this.lastNeed);
  return r;
}

// Pass bytes on through for single-byte encodings (e.g. ascii, latin1, hex)
function simpleWrite(buf) {
  return buf.toString(this.encoding);
}

function simpleEnd(buf) {
  return buf && buf.length ? this.write(buf) : '';
}
},{"safe-buffer":"/opt/panxf/metamask-extension/node_modules/_safe-buffer@5.1.2@safe-buffer/index.js"}],"/opt/panxf/metamask-extension/node_modules/_timers-browserify@1.4.2@timers-browserify/main.js":[function(_dereq_,module,exports){
(function (setImmediate,clearImmediate){
var nextTick = _dereq_('process/browser.js').nextTick;
var apply = Function.prototype.apply;
var slice = Array.prototype.slice;
var immediateIds = {};
var nextImmediateId = 0;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) { timeout.close(); };

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(window, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// That's not how node.js implements it but the exposed api is the same.
exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
  var id = nextImmediateId++;
  var args = arguments.length < 2 ? false : slice.call(arguments, 1);

  immediateIds[id] = true;

  nextTick(function onNextTick() {
    if (immediateIds[id]) {
      // fn.call() is faster so we optimize for the common use-case
      // @see http://jsperf.com/call-apply-segu
      if (args) {
        fn.apply(null, args);
      } else {
        fn.call(null);
      }
      // Prevent ids from leaking
      exports.clearImmediate(id);
    }
  });

  return id;
};

exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
  delete immediateIds[id];
};
}).call(this,_dereq_("timers").setImmediate,_dereq_("timers").clearImmediate)

},{"process/browser.js":"/opt/panxf/metamask-extension/node_modules/_process@0.11.10@process/browser.js","timers":"/opt/panxf/metamask-extension/node_modules/_timers-browserify@1.4.2@timers-browserify/main.js"}],"/opt/panxf/metamask-extension/node_modules/_util-deprecate@1.0.2@util-deprecate/browser.js":[function(_dereq_,module,exports){
(function (global){

/**
 * Module exports.
 */

module.exports = deprecate;

/**
 * Mark that a method should not be used.
 * Returns a modified function which warns once by default.
 *
 * If `localStorage.noDeprecation = true` is set, then it is a no-op.
 *
 * If `localStorage.throwDeprecation = true` is set, then deprecated functions
 * will throw an Error when invoked.
 *
 * If `localStorage.traceDeprecation = true` is set, then deprecated functions
 * will invoke `console.trace()` instead of `console.error()`.
 *
 * @param {Function} fn - the function to deprecate
 * @param {String} msg - the string to print to the console when `fn` is invoked
 * @returns {Function} a new "deprecated" version of `fn`
 * @api public
 */

function deprecate (fn, msg) {
  if (config('noDeprecation')) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (config('throwDeprecation')) {
        throw new Error(msg);
      } else if (config('traceDeprecation')) {
        console.trace(msg);
      } else {
        console.warn(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
}

/**
 * Checks `localStorage` for boolean values for the given `name`.
 *
 * @param {String} name
 * @returns {Boolean}
 * @api private
 */

function config (name) {
  // accessing global.localStorage can trigger a DOMException in sandboxed iframes
  try {
    if (!global.localStorage) return false;
  } catch (_) {
    return false;
  }
  var val = global.localStorage[name];
  if (null == val) return false;
  return String(val).toLowerCase() === 'true';
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],"/opt/panxf/metamask-extension/node_modules/_util@0.10.3@util/support/isBufferBrowser.js":[function(_dereq_,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],"/opt/panxf/metamask-extension/node_modules/_util@0.10.3@util/util.js":[function(_dereq_,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = _dereq_('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = _dereq_('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,_dereq_('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./support/isBuffer":"/opt/panxf/metamask-extension/node_modules/_util@0.10.3@util/support/isBufferBrowser.js","_process":"/opt/panxf/metamask-extension/node_modules/_process@0.11.10@process/browser.js","inherits":"/opt/panxf/metamask-extension/node_modules/_inherits@2.0.1@inherits/inherits_browser.js"}],"/opt/panxf/metamask-extension/node_modules/_web3@0.20.6@web3/dist/web3.min.js":[function(_dereq_,module,exports){
(function (global,Buffer){
_dereq_=function(){return function t(e,r,n){function o(a,s){if(!r[a]){if(!e[a]){var c="function"==typeof _dereq_&&_dereq_;if(!s&&c)return c(a,!0);if(i)return i(a,!0);var u=new Error("Cannot find module '"+a+"'");throw u.code="MODULE_NOT_FOUND",u}var f=r[a]={exports:{}};e[a][0].call(f.exports,function(t){var r=e[a][1][t];return o(r||t)},f,f.exports,t,e,r,n)}return r[a].exports}for(var i="function"==typeof _dereq_&&_dereq_,a=0;a<n.length;a++)o(n[a]);return o}}()({1:[function(t,e,r){e.exports=[{constant:!0,inputs:[{name:"_owner",type:"address"}],name:"name",outputs:[{name:"o_name",type:"bytes32"}],type:"function"},{constant:!0,inputs:[{name:"_name",type:"bytes32"}],name:"owner",outputs:[{name:"",type:"address"}],type:"function"},{constant:!0,inputs:[{name:"_name",type:"bytes32"}],name:"content",outputs:[{name:"",type:"bytes32"}],type:"function"},{constant:!0,inputs:[{name:"_name",type:"bytes32"}],name:"addr",outputs:[{name:"",type:"address"}],type:"function"},{constant:!1,inputs:[{name:"_name",type:"bytes32"}],name:"reserve",outputs:[],type:"function"},{constant:!0,inputs:[{name:"_name",type:"bytes32"}],name:"subRegistrar",outputs:[{name:"",type:"address"}],type:"function"},{constant:!1,inputs:[{name:"_name",type:"bytes32"},{name:"_newOwner",type:"address"}],name:"transfer",outputs:[],type:"function"},{constant:!1,inputs:[{name:"_name",type:"bytes32"},{name:"_registrar",type:"address"}],name:"setSubRegistrar",outputs:[],type:"function"},{constant:!1,inputs:[],name:"Registrar",outputs:[],type:"function"},{constant:!1,inputs:[{name:"_name",type:"bytes32"},{name:"_a",type:"address"},{name:"_primary",type:"bool"}],name:"setAddress",outputs:[],type:"function"},{constant:!1,inputs:[{name:"_name",type:"bytes32"},{name:"_content",type:"bytes32"}],name:"setContent",outputs:[],type:"function"},{constant:!1,inputs:[{name:"_name",type:"bytes32"}],name:"disown",outputs:[],type:"function"},{anonymous:!1,inputs:[{indexed:!0,name:"_name",type:"bytes32"},{indexed:!1,name:"_winner",type:"address"}],name:"AuctionEnded",type:"event"},{anonymous:!1,inputs:[{indexed:!0,name:"_name",type:"bytes32"},{indexed:!1,name:"_bidder",type:"address"},{indexed:!1,name:"_value",type:"uint256"}],name:"NewBid",type:"event"},{anonymous:!1,inputs:[{indexed:!0,name:"name",type:"bytes32"}],name:"Changed",type:"event"},{anonymous:!1,inputs:[{indexed:!0,name:"name",type:"bytes32"},{indexed:!0,name:"addr",type:"address"}],name:"PrimaryChanged",type:"event"}]},{}],2:[function(t,e,r){e.exports=[{constant:!0,inputs:[{name:"_name",type:"bytes32"}],name:"owner",outputs:[{name:"",type:"address"}],type:"function"},{constant:!1,inputs:[{name:"_name",type:"bytes32"},{name:"_refund",type:"address"}],name:"disown",outputs:[],type:"function"},{constant:!0,inputs:[{name:"_name",type:"bytes32"}],name:"addr",outputs:[{name:"",type:"address"}],type:"function"},{constant:!1,inputs:[{name:"_name",type:"bytes32"}],name:"reserve",outputs:[],type:"function"},{constant:!1,inputs:[{name:"_name",type:"bytes32"},{name:"_newOwner",type:"address"}],name:"transfer",outputs:[],type:"function"},{constant:!1,inputs:[{name:"_name",type:"bytes32"},{name:"_a",type:"address"}],name:"setAddr",outputs:[],type:"function"},{anonymous:!1,inputs:[{indexed:!0,name:"name",type:"bytes32"}],name:"Changed",type:"event"}]},{}],3:[function(t,e,r){e.exports=[{constant:!1,inputs:[{name:"from",type:"bytes32"},{name:"to",type:"address"},{name:"value",type:"uint256"}],name:"transfer",outputs:[],type:"function"},{constant:!1,inputs:[{name:"from",type:"bytes32"},{name:"to",type:"address"},{name:"indirectId",type:"bytes32"},{name:"value",type:"uint256"}],name:"icapTransfer",outputs:[],type:"function"},{constant:!1,inputs:[{name:"to",type:"bytes32"}],name:"deposit",outputs:[],payable:!0,type:"function"},{anonymous:!1,inputs:[{indexed:!0,name:"from",type:"address"},{indexed:!1,name:"value",type:"uint256"}],name:"AnonymousDeposit",type:"event"},{anonymous:!1,inputs:[{indexed:!0,name:"from",type:"address"},{indexed:!0,name:"to",type:"bytes32"},{indexed:!1,name:"value",type:"uint256"}],name:"Deposit",type:"event"},{anonymous:!1,inputs:[{indexed:!0,name:"from",type:"bytes32"},{indexed:!0,name:"to",type:"address"},{indexed:!1,name:"value",type:"uint256"}],name:"Transfer",type:"event"},{anonymous:!1,inputs:[{indexed:!0,name:"from",type:"bytes32"},{indexed:!0,name:"to",type:"address"},{indexed:!1,name:"indirectId",type:"bytes32"},{indexed:!1,name:"value",type:"uint256"}],name:"IcapTransfer",type:"event"}]},{}],4:[function(t,e,r){var n=t("./formatters"),o=t("./type"),i=function(){this._inputFormatter=n.formatInputInt,this._outputFormatter=n.formatOutputAddress};(i.prototype=new o({})).constructor=i,i.prototype.isType=function(t){return!!t.match(/address(\[([0-9]*)\])?/)},e.exports=i},{"./formatters":9,"./type":14}],5:[function(t,e,r){var n=t("./formatters"),o=t("./type"),i=function(){this._inputFormatter=n.formatInputBool,this._outputFormatter=n.formatOutputBool};(i.prototype=new o({})).constructor=i,i.prototype.isType=function(t){return!!t.match(/^bool(\[([0-9]*)\])*$/)},e.exports=i},{"./formatters":9,"./type":14}],6:[function(t,e,r){var n=t("./formatters"),o=t("./type"),i=function(){this._inputFormatter=n.formatInputBytes,this._outputFormatter=n.formatOutputBytes};(i.prototype=new o({})).constructor=i,i.prototype.isType=function(t){return!!t.match(/^bytes([0-9]{1,})(\[([0-9]*)\])*$/)},e.exports=i},{"./formatters":9,"./type":14}],7:[function(t,e,r){var n=t("./formatters"),o=t("./address"),i=t("./bool"),a=t("./int"),s=t("./uint"),c=t("./dynamicbytes"),u=t("./string"),f=t("./real"),l=t("./ureal"),p=t("./bytes"),h=function(t,e){return t.isDynamicType(e)||t.isDynamicArray(e)},d=function(t){this._types=t};d.prototype._requireType=function(t){var e=this._types.filter(function(e){return e.isType(t)})[0];if(!e)throw Error("invalid solidity type!: "+t);return e},d.prototype.encodeParam=function(t,e){return this.encodeParams([t],[e])},d.prototype.encodeParams=function(t,e){var r=this.getSolidityTypes(t),n=r.map(function(r,n){return r.encode(e[n],t[n])}),o=r.reduce(function(e,n,o){var i=n.staticPartLength(t[o]),a=32*Math.floor((i+31)/32);return e+(h(r[o],t[o])?32:a)},0);return this.encodeMultiWithOffset(t,r,n,o)},d.prototype.encodeMultiWithOffset=function(t,e,r,o){var i="",a=this;return t.forEach(function(s,c){if(h(e[c],t[c])){i+=n.formatInputInt(o).encode();var u=a.encodeWithOffset(t[c],e[c],r[c],o);o+=u.length/2}else i+=a.encodeWithOffset(t[c],e[c],r[c],o)}),t.forEach(function(n,s){if(h(e[s],t[s])){var c=a.encodeWithOffset(t[s],e[s],r[s],o);o+=c.length/2,i+=c}}),i},d.prototype.encodeWithOffset=function(t,e,r,o){var i=1,a=2,s=3,c=e.isDynamicArray(t)?i:e.isStaticArray(t)?a:s;if(c!==s){var u=e.nestedName(t),f=e.staticPartLength(u),l=c===i?r[0]:"";if(e.isDynamicArray(u))for(var p=c===i?2:0,h=0;h<r.length;h++)c===i?p+=+r[h-1][0]||0:c===a&&(p+=+(r[h-1]||[])[0]||0),l+=n.formatInputInt(o+h*f+32*p).encode();for(var d=c===i?r.length-1:r.length,m=0;m<d;m++){var y=l/2;c===i?l+=this.encodeWithOffset(u,e,r[m+1],o+y):c===a&&(l+=this.encodeWithOffset(u,e,r[m],o+y))}return l}return r},d.prototype.decodeParam=function(t,e){return this.decodeParams([t],e)[0]},d.prototype.decodeParams=function(t,e){var r=this.getSolidityTypes(t),n=this.getOffsets(t,r);return r.map(function(r,o){return r.decode(e,n[o],t[o],o)})},d.prototype.getOffsets=function(t,e){for(var r=e.map(function(e,r){return e.staticPartLength(t[r])}),n=1;n<r.length;n++)r[n]+=r[n-1];return r.map(function(r,n){return r-e[n].staticPartLength(t[n])})},d.prototype.getSolidityTypes=function(t){var e=this;return t.map(function(t){return e._requireType(t)})};var m=new d([new o,new i,new a,new s,new c,new p,new u,new f,new l]);e.exports=m},{"./address":4,"./bool":5,"./bytes":6,"./dynamicbytes":8,"./formatters":9,"./int":10,"./real":12,"./string":13,"./uint":15,"./ureal":16}],8:[function(t,e,r){var n=t("./formatters"),o=t("./type"),i=function(){this._inputFormatter=n.formatInputDynamicBytes,this._outputFormatter=n.formatOutputDynamicBytes};(i.prototype=new o({})).constructor=i,i.prototype.isType=function(t){return!!t.match(/^bytes(\[([0-9]*)\])*$/)},i.prototype.isDynamicType=function(){return!0},e.exports=i},{"./formatters":9,"./type":14}],9:[function(t,e,r){var n=t("bignumber.js"),o=t("../utils/utils"),i=t("../utils/config"),a=t("./param"),s=function(t){n.config(i.ETH_BIGNUMBER_ROUNDING_MODE);var e=o.padLeft(o.toTwosComplement(t).toString(16),64);return new a(e)},c=function(t){var e=t.staticPart()||"0";return"1"===new n(e.substr(0,1),16).toString(2).substr(0,1)?new n(e,16).minus(new n("ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",16)).minus(1):new n(e,16)},u=function(t){var e=t.staticPart()||"0";return new n(e,16)};e.exports={formatInputInt:s,formatInputBytes:function(t){var e=o.toHex(t).substr(2),r=Math.floor((e.length+63)/64);return e=o.padRight(e,64*r),new a(e)},formatInputDynamicBytes:function(t){var e=o.toHex(t).substr(2),r=e.length/2,n=Math.floor((e.length+63)/64);return e=o.padRight(e,64*n),new a(s(r).value+e)},formatInputString:function(t){var e=o.fromUtf8(t).substr(2),r=e.length/2,n=Math.floor((e.length+63)/64);return e=o.padRight(e,64*n),new a(s(r).value+e)},formatInputBool:function(t){return new a("000000000000000000000000000000000000000000000000000000000000000"+(t?"1":"0"))},formatInputReal:function(t){return s(new n(t).times(new n(2).pow(128)))},formatOutputInt:c,formatOutputUInt:u,formatOutputReal:function(t){return c(t).dividedBy(new n(2).pow(128))},formatOutputUReal:function(t){return u(t).dividedBy(new n(2).pow(128))},formatOutputBool:function(t){return"0000000000000000000000000000000000000000000000000000000000000001"===t.staticPart()},formatOutputBytes:function(t,e){var r=e.match(/^bytes([0-9]*)/),n=parseInt(r[1]);return"0x"+t.staticPart().slice(0,2*n)},formatOutputDynamicBytes:function(t){var e=2*new n(t.dynamicPart().slice(0,64),16).toNumber();return"0x"+t.dynamicPart().substr(64,e)},formatOutputString:function(t){var e=2*new n(t.dynamicPart().slice(0,64),16).toNumber();return o.toUtf8(t.dynamicPart().substr(64,e))},formatOutputAddress:function(t){var e=t.staticPart();return"0x"+e.slice(e.length-40,e.length)}}},{"../utils/config":18,"../utils/utils":20,"./param":11,"bignumber.js":"bignumber.js"}],10:[function(t,e,r){var n=t("./formatters"),o=t("./type"),i=function(){this._inputFormatter=n.formatInputInt,this._outputFormatter=n.formatOutputInt};(i.prototype=new o({})).constructor=i,i.prototype.isType=function(t){return!!t.match(/^int([0-9]*)?(\[([0-9]*)\])*$/)},e.exports=i},{"./formatters":9,"./type":14}],11:[function(t,e,r){var n=t("../utils/utils"),o=function(t,e){this.value=t||"",this.offset=e};o.prototype.dynamicPartLength=function(){return this.dynamicPart().length/2},o.prototype.withOffset=function(t){return new o(this.value,t)},o.prototype.combine=function(t){return new o(this.value+t.value)},o.prototype.isDynamic=function(){return void 0!==this.offset},o.prototype.offsetAsBytes=function(){return this.isDynamic()?n.padLeft(n.toTwosComplement(this.offset).toString(16),64):""},o.prototype.staticPart=function(){return this.isDynamic()?this.offsetAsBytes():this.value},o.prototype.dynamicPart=function(){return this.isDynamic()?this.value:""},o.prototype.encode=function(){return this.staticPart()+this.dynamicPart()},o.encodeList=function(t){var e=32*t.length,r=t.map(function(t){if(!t.isDynamic())return t;var r=e;return e+=t.dynamicPartLength(),t.withOffset(r)});return r.reduce(function(t,e){return t+e.dynamicPart()},r.reduce(function(t,e){return t+e.staticPart()},""))},e.exports=o},{"../utils/utils":20}],12:[function(t,e,r){var n=t("./formatters"),o=t("./type"),i=function(){this._inputFormatter=n.formatInputReal,this._outputFormatter=n.formatOutputReal};(i.prototype=new o({})).constructor=i,i.prototype.isType=function(t){return!!t.match(/real([0-9]*)?(\[([0-9]*)\])?/)},e.exports=i},{"./formatters":9,"./type":14}],13:[function(t,e,r){var n=t("./formatters"),o=t("./type"),i=function(){this._inputFormatter=n.formatInputString,this._outputFormatter=n.formatOutputString};(i.prototype=new o({})).constructor=i,i.prototype.isType=function(t){return!!t.match(/^string(\[([0-9]*)\])*$/)},i.prototype.isDynamicType=function(){return!0},e.exports=i},{"./formatters":9,"./type":14}],14:[function(t,e,r){var n=t("./formatters"),o=t("./param"),i=function(t){this._inputFormatter=t.inputFormatter,this._outputFormatter=t.outputFormatter};i.prototype.isType=function(t){throw"this method should be overrwritten for type "+t},i.prototype.staticPartLength=function(t){return(this.nestedTypes(t)||["[1]"]).map(function(t){return parseInt(t.slice(1,-1),10)||1}).reduce(function(t,e){return t*e},32)},i.prototype.isDynamicArray=function(t){var e=this.nestedTypes(t);return!!e&&!e[e.length-1].match(/[0-9]{1,}/g)},i.prototype.isStaticArray=function(t){var e=this.nestedTypes(t);return!!e&&!!e[e.length-1].match(/[0-9]{1,}/g)},i.prototype.staticArrayLength=function(t){var e=this.nestedTypes(t);return e?parseInt(e[e.length-1].match(/[0-9]{1,}/g)||1):1},i.prototype.nestedName=function(t){var e=this.nestedTypes(t);return e?t.substr(0,t.length-e[e.length-1].length):t},i.prototype.isDynamicType=function(){return!1},i.prototype.nestedTypes=function(t){return t.match(/(\[[0-9]*\])/g)},i.prototype.encode=function(t,e){var r,o,i,a=this;return this.isDynamicArray(e)?(r=t.length,o=a.nestedName(e),(i=[]).push(n.formatInputInt(r).encode()),t.forEach(function(t){i.push(a.encode(t,o))}),i):this.isStaticArray(e)?function(){for(var r=a.staticArrayLength(e),n=a.nestedName(e),o=[],i=0;i<r;i++)o.push(a.encode(t[i],n));return o}():this._inputFormatter(t,e).encode()},i.prototype.decode=function(t,e,r){var n,i,a,s,c=this;if(this.isDynamicArray(r))return function(){for(var n=parseInt("0x"+t.substr(2*e,64)),o=parseInt("0x"+t.substr(2*n,64)),i=n+32,a=c.nestedName(r),s=c.staticPartLength(a),u=32*Math.floor((s+31)/32),f=[],l=0;l<o*u;l+=u)f.push(c.decode(t,i+l,a));return f}();if(this.isStaticArray(r))return function(){for(var n=c.staticArrayLength(r),o=e,i=c.nestedName(r),a=c.staticPartLength(i),s=32*Math.floor((a+31)/32),u=[],f=0;f<n*s;f+=s)u.push(c.decode(t,o+f,i));return u}();if(this.isDynamicType(r))return n=parseInt("0x"+t.substr(2*e,64)),i=parseInt("0x"+t.substr(2*n,64)),a=Math.floor((i+31)/32),s=new o(t.substr(2*n,64*(1+a)),0),c._outputFormatter(s,r);var u=this.staticPartLength(r),f=new o(t.substr(2*e,2*u));return this._outputFormatter(f,r)},e.exports=i},{"./formatters":9,"./param":11}],15:[function(t,e,r){var n=t("./formatters"),o=t("./type"),i=function(){this._inputFormatter=n.formatInputInt,this._outputFormatter=n.formatOutputUInt};(i.prototype=new o({})).constructor=i,i.prototype.isType=function(t){return!!t.match(/^uint([0-9]*)?(\[([0-9]*)\])*$/)},e.exports=i},{"./formatters":9,"./type":14}],16:[function(t,e,r){var n=t("./formatters"),o=t("./type"),i=function(){this._inputFormatter=n.formatInputReal,this._outputFormatter=n.formatOutputUReal};(i.prototype=new o({})).constructor=i,i.prototype.isType=function(t){return!!t.match(/^ureal([0-9]*)?(\[([0-9]*)\])*$/)},e.exports=i},{"./formatters":9,"./type":14}],17:[function(t,e,r){"use strict";"undefined"==typeof XMLHttpRequest?r.XMLHttpRequest={}:r.XMLHttpRequest=XMLHttpRequest},{}],18:[function(t,e,r){var n=t("bignumber.js");e.exports={ETH_PADDING:32,ETH_SIGNATURE_LENGTH:4,ETH_UNITS:["wei","kwei","Mwei","Gwei","szabo","finney","femtoether","picoether","nanoether","microether","milliether","nano","micro","milli","ether","grand","Mether","Gether","Tether","Pether","Eether","Zether","Yether","Nether","Dether","Vether","Uether"],ETH_BIGNUMBER_ROUNDING_MODE:{ROUNDING_MODE:n.ROUND_DOWN},ETH_POLLING_TIMEOUT:500,defaultBlock:"latest",defaultAccount:void 0}},{"bignumber.js":"bignumber.js"}],19:[function(t,e,r){var n=t("crypto-js"),o=t("crypto-js/sha3");e.exports=function(t,e){return e&&"hex"===e.encoding&&(t.length>2&&"0x"===t.substr(0,2)&&(t=t.substr(2)),t=n.enc.Hex.parse(t)),o(t,{outputLength:256}).toString()}},{"crypto-js":58,"crypto-js/sha3":79}],20:[function(t,e,r){var n=t("bignumber.js"),o=t("./sha3.js"),i=t("utf8"),a={noether:"0",wei:"1",kwei:"1000",Kwei:"1000",babbage:"1000",femtoether:"1000",mwei:"1000000",Mwei:"1000000",lovelace:"1000000",picoether:"1000000",gwei:"1000000000",Gwei:"1000000000",shannon:"1000000000",nanoether:"1000000000",nano:"1000000000",szabo:"1000000000000",microether:"1000000000000",micro:"1000000000000",finney:"1000000000000000",milliether:"1000000000000000",milli:"1000000000000000",ether:"1000000000000000000",kether:"1000000000000000000000",grand:"1000000000000000000000",mether:"1000000000000000000000000",gether:"1000000000000000000000000000",tether:"1000000000000000000000000000000"},s=function(t,e,r){return new Array(e-t.length+1).join(r||"0")+t},c=function(t,e){t=i.encode(t);for(var r="",n=0;n<t.length;n++){var o=t.charCodeAt(n);if(0===o){if(!e)break;r+="00"}else{var a=o.toString(16);r+=a.length<2?"0"+a:a}}return"0x"+r},u=function(t){var e=p(t),r=e.toString(16);return e.lessThan(0)?"-0x"+r.substr(1):"0x"+r},f=function(t){if(g(t))return u(+t);if(m(t))return u(t);if("object"==typeof t)return c(JSON.stringify(t));if(y(t)){if(0===t.indexOf("-0x"))return u(t);if(0===t.indexOf("0x"))return t;if(!isFinite(t))return c(t,1)}return u(t)},l=function(t){t=t?t.toLowerCase():"ether";var e=a[t];if(void 0===e)throw new Error("This unit doesn't exists, please use the one of the following units"+JSON.stringify(a,null,2));return new n(e,10)},p=function(t){return m(t=t||0)?t:!y(t)||0!==t.indexOf("0x")&&0!==t.indexOf("-0x")?new n(t.toString(10),10):new n(t.replace("0x",""),16)},h=function(t){return/^0x[0-9a-f]{40}$/i.test(t)},d=function(t){t=t.replace("0x","");for(var e=o(t.toLowerCase()),r=0;r<40;r++)if(parseInt(e[r],16)>7&&t[r].toUpperCase()!==t[r]||parseInt(e[r],16)<=7&&t[r].toLowerCase()!==t[r])return!1;return!0},m=function(t){return t instanceof n||t&&t.constructor&&"BigNumber"===t.constructor.name},y=function(t){return"string"==typeof t||t&&t.constructor&&"String"===t.constructor.name},g=function(t){return"boolean"==typeof t};e.exports={padLeft:s,padRight:function(t,e,r){return t+new Array(e-t.length+1).join(r||"0")},toHex:f,toDecimal:function(t){return p(t).toNumber()},fromDecimal:u,toUtf8:function(t){var e="",r=0,n=t.length;for("0x"===t.substring(0,2)&&(r=2);r<n;r+=2){var o=parseInt(t.substr(r,2),16);if(0===o)break;e+=String.fromCharCode(o)}return i.decode(e)},toAscii:function(t){var e="",r=0,n=t.length;for("0x"===t.substring(0,2)&&(r=2);r<n;r+=2){var o=parseInt(t.substr(r,2),16);e+=String.fromCharCode(o)}return e},fromUtf8:c,fromAscii:function(t){for(var e="",r=0;r<t.length;r++){var n=t.charCodeAt(r).toString(16);e+=n.length<2?"0"+n:n}return"0x"+e},transformToFullName:function(t){if(-1!==t.name.indexOf("("))return t.name;var e=t.inputs.map(function(t){return t.type}).join();return t.name+"("+e+")"},extractDisplayName:function(t){var e=t.indexOf("("),r=t.indexOf(")");return-1!==e&&-1!==r?t.substr(0,e):t},extractTypeName:function(t){var e=t.indexOf("("),r=t.indexOf(")");return-1!==e&&-1!==r?t.substr(e+1,r-e-1).replace(" ",""):""},toWei:function(t,e){var r=p(t).times(l(e));return m(t)?r:r.toString(10)},fromWei:function(t,e){var r=p(t).dividedBy(l(e));return m(t)?r:r.toString(10)},toBigNumber:p,toTwosComplement:function(t){var e=p(t).round();return e.lessThan(0)?new n("ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",16).plus(e).plus(1):e},toAddress:function(t){return h(t)?t:/^[0-9a-f]{40}$/.test(t)?"0x"+t:"0x"+s(f(t).substr(2),40)},isBigNumber:m,isStrictAddress:h,isAddress:function(t){return!!/^(0x)?[0-9a-f]{40}$/i.test(t)&&(!(!/^(0x)?[0-9a-f]{40}$/.test(t)&&!/^(0x)?[0-9A-F]{40}$/.test(t))||d(t))},isChecksumAddress:d,toChecksumAddress:function(t){if(void 0===t)return"";t=t.toLowerCase().replace("0x","");for(var e=o(t),r="0x",n=0;n<t.length;n++)parseInt(e[n],16)>7?r+=t[n].toUpperCase():r+=t[n];return r},isFunction:function(t){return"function"==typeof t},isString:y,isObject:function(t){return null!==t&&!Array.isArray(t)&&"object"==typeof t},isBoolean:g,isArray:function(t){return Array.isArray(t)},isJson:function(t){try{return!!JSON.parse(t)}catch(t){return!1}},isBloom:function(t){return!(!/^(0x)?[0-9a-f]{512}$/i.test(t)||!/^(0x)?[0-9a-f]{512}$/.test(t)&&!/^(0x)?[0-9A-F]{512}$/.test(t))},isTopic:function(t){return!(!/^(0x)?[0-9a-f]{64}$/i.test(t)||!/^(0x)?[0-9a-f]{64}$/.test(t)&&!/^(0x)?[0-9A-F]{64}$/.test(t))}}},{"./sha3.js":19,"bignumber.js":"bignumber.js",utf8:84}],21:[function(t,e,r){e.exports={version:"0.20.6"}},{}],22:[function(t,e,r){var n=t("./web3/requestmanager"),o=t("./web3/iban"),i=t("./web3/methods/eth"),a=t("./web3/methods/db"),s=t("./web3/methods/shh"),c=t("./web3/methods/net"),u=t("./web3/methods/personal"),f=t("./web3/methods/swarm"),l=t("./web3/settings"),p=t("./version.json"),h=t("./utils/utils"),d=t("./utils/sha3"),m=t("./web3/extend"),y=t("./web3/batch"),g=t("./web3/property"),v=t("./web3/httpprovider"),b=t("./web3/ipcprovider"),_=t("bignumber.js");function w(t){this._requestManager=new n(t),this.currentProvider=t,this.eth=new i(this),this.db=new a(this),this.shh=new s(this),this.net=new c(this),this.personal=new u(this),this.bzz=new f(this),this.settings=new l,this.version={api:p.version},this.providers={HttpProvider:v,IpcProvider:b},this._extend=m(this),this._extend({properties:x()})}w.providers={HttpProvider:v,IpcProvider:b},w.prototype.setProvider=function(t){this._requestManager.setProvider(t),this.currentProvider=t},w.prototype.reset=function(t){this._requestManager.reset(t),this.settings=new l},w.prototype.BigNumber=_,w.prototype.toHex=h.toHex,w.prototype.toAscii=h.toAscii,w.prototype.toUtf8=h.toUtf8,w.prototype.fromAscii=h.fromAscii,w.prototype.fromUtf8=h.fromUtf8,w.prototype.toDecimal=h.toDecimal,w.prototype.fromDecimal=h.fromDecimal,w.prototype.toBigNumber=h.toBigNumber,w.prototype.toWei=h.toWei,w.prototype.fromWei=h.fromWei,w.prototype.isAddress=h.isAddress,w.prototype.isChecksumAddress=h.isChecksumAddress,w.prototype.toChecksumAddress=h.toChecksumAddress,w.prototype.isIBAN=h.isIBAN,w.prototype.padLeft=h.padLeft,w.prototype.padRight=h.padRight,w.prototype.sha3=function(t,e){return"0x"+d(t,e)},w.prototype.fromICAP=function(t){return new o(t).address()};var x=function(){return[new g({name:"version.node",getter:"web3_clientVersion"}),new g({name:"version.network",getter:"net_version",inputFormatter:h.toDecimal}),new g({name:"version.ethereum",getter:"eth_protocolVersion",inputFormatter:h.toDecimal}),new g({name:"version.whisper",getter:"shh_version",inputFormatter:h.toDecimal})]};w.prototype.isConnected=function(){return this.currentProvider&&this.currentProvider.isConnected()},w.prototype.createBatch=function(){return new y(this)},e.exports=w},{"./utils/sha3":19,"./utils/utils":20,"./version.json":21,"./web3/batch":24,"./web3/extend":28,"./web3/httpprovider":32,"./web3/iban":33,"./web3/ipcprovider":34,"./web3/methods/db":37,"./web3/methods/eth":38,"./web3/methods/net":39,"./web3/methods/personal":40,"./web3/methods/shh":41,"./web3/methods/swarm":42,"./web3/property":45,"./web3/requestmanager":46,"./web3/settings":47,"bignumber.js":"bignumber.js"}],23:[function(t,e,r){var n=t("../utils/sha3"),o=t("./event"),i=t("./formatters"),a=t("../utils/utils"),s=t("./filter"),c=t("./methods/watches"),u=function(t,e,r){this._requestManager=t,this._json=e,this._address=r};u.prototype.encode=function(t){t=t||{};var e={};return["fromBlock","toBlock"].filter(function(e){return void 0!==t[e]}).forEach(function(r){e[r]=i.inputBlockNumberFormatter(t[r])}),e.address=this._address,e},u.prototype.decode=function(t){t.data=t.data||"";var e=a.isArray(t.topics)&&a.isString(t.topics[0])?t.topics[0].slice(2):"",r=this._json.filter(function(t){return e===n(a.transformToFullName(t))})[0];return r?new o(this._requestManager,r,this._address).decode(t):i.outputLogFormatter(t)},u.prototype.execute=function(t,e){a.isFunction(arguments[arguments.length-1])&&(e=arguments[arguments.length-1],1===arguments.length&&(t=null));var r=this.encode(t),n=this.decode.bind(this);return new s(r,"eth",this._requestManager,c.eth(),n,e)},u.prototype.attachToContract=function(t){var e=this.execute.bind(this);t.allEvents=e},e.exports=u},{"../utils/sha3":19,"../utils/utils":20,"./event":27,"./filter":29,"./formatters":30,"./methods/watches":43}],24:[function(t,e,r){var n=t("./jsonrpc"),o=t("./errors"),i=function(t){this.requestManager=t._requestManager,this.requests=[]};i.prototype.add=function(t){this.requests.push(t)},i.prototype.execute=function(){var t=this.requests;this.requestManager.sendBatch(t,function(e,r){r=r||[],t.map(function(t,e){return r[e]||{}}).forEach(function(e,r){if(t[r].callback){if(!n.isValidResponse(e))return t[r].callback(o.InvalidResponse(e));t[r].callback(null,t[r].format?t[r].format(e.result):e.result)}})})},e.exports=i},{"./errors":26,"./jsonrpc":35}],25:[function(t,e,r){var n=t("../utils/utils"),o=t("../solidity/coder"),i=t("./event"),a=t("./function"),s=t("./allevents"),c=function(t,e){return t.filter(function(t){return"constructor"===t.type&&t.inputs.length===e.length}).map(function(t){return t.inputs.map(function(t){return t.type})}).map(function(t){return o.encodeParams(t,e)})[0]||""},u=function(t){t.abi.filter(function(t){return"function"===t.type}).map(function(e){return new a(t._eth,e,t.address)}).forEach(function(e){e.attachToContract(t)})},f=function(t){var e=t.abi.filter(function(t){return"event"===t.type});new s(t._eth._requestManager,e,t.address).attachToContract(t),e.map(function(e){return new i(t._eth._requestManager,e,t.address)}).forEach(function(e){e.attachToContract(t)})},l=function(t,e){var r=0,n=!1,o=t._eth.filter("latest",function(i){if(!i&&!n)if(++r>50){if(o.stopWatching(function(){}),n=!0,!e)throw new Error("Contract transaction couldn't be found after 50 blocks");e(new Error("Contract transaction couldn't be found after 50 blocks"))}else t._eth.getTransactionReceipt(t.transactionHash,function(r,i){i&&i.blockHash&&!n&&t._eth.getCode(i.contractAddress,function(r,a){if(!n&&a)if(o.stopWatching(function(){}),n=!0,a.length>3)t.address=i.contractAddress,u(t),f(t),e&&e(null,t);else{if(!e)throw new Error("The contract code couldn't be stored, please check your gas amount.");e(new Error("The contract code couldn't be stored, please check your gas amount."))}})})})},p=function(t,e){this.eth=t,this.abi=e,this.new=function(){var t,r=new h(this.eth,this.abi),o={},i=Array.prototype.slice.call(arguments);n.isFunction(i[i.length-1])&&(t=i.pop());var a=i[i.length-1];if((n.isObject(a)&&!n.isArray(a)&&(o=i.pop()),o.value>0)&&!(e.filter(function(t){return"constructor"===t.type&&t.inputs.length===i.length})[0]||{}).payable)throw new Error("Cannot send value to non-payable constructor");var s=c(this.abi,i);if(o.data+=s,t)this.eth.sendTransaction(o,function(e,n){e?t(e):(r.transactionHash=n,t(null,r),l(r,t))});else{var u=this.eth.sendTransaction(o);r.transactionHash=u,l(r)}return r},this.new.getData=this.getData.bind(this)};p.prototype.at=function(t,e){var r=new h(this.eth,this.abi,t);return u(r),f(r),e&&e(null,r),r},p.prototype.getData=function(){var t={},e=Array.prototype.slice.call(arguments),r=e[e.length-1];n.isObject(r)&&!n.isArray(r)&&(t=e.pop());var o=c(this.abi,e);return t.data+=o,t.data};var h=function(t,e,r){this._eth=t,this.transactionHash=null,this.address=r,this.abi=e};e.exports=p},{"../solidity/coder":7,"../utils/utils":20,"./allevents":23,"./event":27,"./function":31}],26:[function(t,e,r){e.exports={InvalidNumberOfSolidityArgs:function(){return new Error("Invalid number of arguments to Solidity function")},InvalidNumberOfRPCParams:function(){return new Error("Invalid number of input parameters to RPC method")},InvalidConnection:function(t){return new Error("CONNECTION ERROR: Couldn't connect to node "+t+".")},InvalidProvider:function(){return new Error("Provider not set or invalid")},InvalidResponse:function(t){var e=t&&t.error&&t.error.message?t.error.message:"Invalid JSON RPC response: "+JSON.stringify(t);return new Error(e)},ConnectionTimeout:function(t){return new Error("CONNECTION TIMEOUT: timeout of "+t+" ms achived")}}},{}],27:[function(t,e,r){var n=t("../utils/utils"),o=t("../solidity/coder"),i=t("./formatters"),a=t("../utils/sha3"),s=t("./filter"),c=t("./methods/watches"),u=function(t,e,r){this._requestManager=t,this._params=e.inputs,this._name=n.transformToFullName(e),this._address=r,this._anonymous=e.anonymous};u.prototype.types=function(t){return this._params.filter(function(e){return e.indexed===t}).map(function(t){return t.type})},u.prototype.displayName=function(){return n.extractDisplayName(this._name)},u.prototype.typeName=function(){return n.extractTypeName(this._name)},u.prototype.signature=function(){return a(this._name)},u.prototype.encode=function(t,e){t=t||{},e=e||{};var r={};["fromBlock","toBlock"].filter(function(t){return void 0!==e[t]}).forEach(function(t){r[t]=i.inputBlockNumberFormatter(e[t])}),r.topics=[],r.address=this._address,this._anonymous||r.topics.push("0x"+this.signature());var a=this._params.filter(function(t){return!0===t.indexed}).map(function(e){var r=t[e.name];return null==r?null:n.isArray(r)?r.map(function(t){return"0x"+o.encodeParam(e.type,t)}):"0x"+o.encodeParam(e.type,r)});return r.topics=r.topics.concat(a),r},u.prototype.decode=function(t){t.data=t.data||"",t.topics=t.topics||[];var e=(this._anonymous?t.topics:t.topics.slice(1)).map(function(t){return t.slice(2)}).join(""),r=o.decodeParams(this.types(!0),e),n=t.data.slice(2),a=o.decodeParams(this.types(!1),n),s=i.outputLogFormatter(t);return s.event=this.displayName(),s.address=t.address,s.args=this._params.reduce(function(t,e){return t[e.name]=e.indexed?r.shift():a.shift(),t},{}),delete s.data,delete s.topics,s},u.prototype.execute=function(t,e,r){n.isFunction(arguments[arguments.length-1])&&(r=arguments[arguments.length-1],2===arguments.length&&(e=null),1===arguments.length&&(e=null,t={}));var o=this.encode(t,e),i=this.decode.bind(this);return new s(o,"eth",this._requestManager,c.eth(),i,r)},u.prototype.attachToContract=function(t){var e=this.execute.bind(this),r=this.displayName();t[r]||(t[r]=e),t[r][this.typeName()]=this.execute.bind(this,t)},e.exports=u},{"../solidity/coder":7,"../utils/sha3":19,"../utils/utils":20,"./filter":29,"./formatters":30,"./methods/watches":43}],28:[function(t,e,r){var n=t("./formatters"),o=t("./../utils/utils"),i=t("./method"),a=t("./property");e.exports=function(t){var e=function(e){var r;e.property?(t[e.property]||(t[e.property]={}),r=t[e.property]):r=t,e.methods&&e.methods.forEach(function(e){e.attachToObject(r),e.setRequestManager(t._requestManager)}),e.properties&&e.properties.forEach(function(e){e.attachToObject(r),e.setRequestManager(t._requestManager)})};return e.formatters=n,e.utils=o,e.Method=i,e.Property=a,e}},{"./../utils/utils":20,"./formatters":30,"./method":36,"./property":45}],29:[function(t,e,r){var n=t("./formatters"),o=t("../utils/utils"),i=function(t){return null==t?null:0===(t=String(t)).indexOf("0x")?t:o.fromUtf8(t)},a=function(t,e){o.isString(t.options)||t.get(function(t,r){t&&e(t),o.isArray(r)&&r.forEach(function(t){e(null,t)})})},s=function(t){t.requestManager.startPolling({method:t.implementation.poll.call,params:[t.filterId]},t.filterId,function(e,r){if(e)return t.callbacks.forEach(function(t){t(e)});o.isArray(r)&&r.forEach(function(e){e=t.formatter?t.formatter(e):e,t.callbacks.forEach(function(t){t(null,e)})})},t.stopWatching.bind(t))},c=function(t,e,r,c,u,f,l){var p=this,h={};return c.forEach(function(t){t.setRequestManager(r),t.attachToObject(h)}),this.requestManager=r,this.options=function(t,e){if(o.isString(t))return t;switch(t=t||{},e){case"eth":return t.topics=t.topics||[],t.topics=t.topics.map(function(t){return o.isArray(t)?t.map(i):i(t)}),{topics:t.topics,from:t.from,to:t.to,address:t.address,fromBlock:n.inputBlockNumberFormatter(t.fromBlock),toBlock:n.inputBlockNumberFormatter(t.toBlock)};case"shh":return t}}(t,e),this.implementation=h,this.filterId=null,this.callbacks=[],this.getLogsCallbacks=[],this.pollFilters=[],this.formatter=u,this.implementation.newFilter(this.options,function(t,e){if(t)p.callbacks.forEach(function(e){e(t)}),"function"==typeof l&&l(t);else if(p.filterId=e,p.getLogsCallbacks.forEach(function(t){p.get(t)}),p.getLogsCallbacks=[],p.callbacks.forEach(function(t){a(p,t)}),p.callbacks.length>0&&s(p),"function"==typeof f)return p.watch(f)}),this};c.prototype.watch=function(t){return this.callbacks.push(t),this.filterId&&(a(this,t),s(this)),this},c.prototype.stopWatching=function(t){if(this.requestManager.stopPolling(this.filterId),this.callbacks=[],!t)return this.implementation.uninstallFilter(this.filterId);this.implementation.uninstallFilter(this.filterId,t)},c.prototype.get=function(t){var e=this;if(!o.isFunction(t)){if(null===this.filterId)throw new Error("Filter ID Error: filter().get() can't be chained synchronous, please provide a callback for the get() method.");return this.implementation.getLogs(this.filterId).map(function(t){return e.formatter?e.formatter(t):t})}return null===this.filterId?this.getLogsCallbacks.push(t):this.implementation.getLogs(this.filterId,function(r,n){r?t(r):t(null,n.map(function(t){return e.formatter?e.formatter(t):t}))}),this},e.exports=c},{"../utils/utils":20,"./formatters":30}],30:[function(t,e,r){"use strict";var n=t("../utils/utils"),o=t("../utils/config"),i=t("./iban"),a=function(t){var e;if(void 0!==t)return"latest"===(e=t)||"pending"===e||"earliest"===e?t:n.toHex(t)},s=function(t){return null!==t.blockNumber&&(t.blockNumber=n.toDecimal(t.blockNumber)),null!==t.transactionIndex&&(t.transactionIndex=n.toDecimal(t.transactionIndex)),t.nonce=n.toDecimal(t.nonce),t.gas=n.toDecimal(t.gas),t.gasPrice=n.toBigNumber(t.gasPrice),t.value=n.toBigNumber(t.value),t},c=function(t){return t.blockNumber&&(t.blockNumber=n.toDecimal(t.blockNumber)),t.transactionIndex&&(t.transactionIndex=n.toDecimal(t.transactionIndex)),t.logIndex&&(t.logIndex=n.toDecimal(t.logIndex)),t},u=function(t){var e=new i(t);if(e.isValid()&&e.isDirect())return"0x"+e.address();if(n.isStrictAddress(t))return t;if(n.isAddress(t))return"0x"+t;throw new Error("invalid address")};e.exports={inputDefaultBlockNumberFormatter:function(t){return void 0===t?o.defaultBlock:a(t)},inputBlockNumberFormatter:a,inputCallFormatter:function(t){return t.from=t.from||o.defaultAccount,t.from&&(t.from=u(t.from)),t.to&&(t.to=u(t.to)),["gasPrice","gas","value","nonce"].filter(function(e){return void 0!==t[e]}).forEach(function(e){t[e]=n.fromDecimal(t[e])}),t},inputTransactionFormatter:function(t){return t.from=t.from||o.defaultAccount,t.from=u(t.from),t.to&&(t.to=u(t.to)),["gasPrice","gas","value","nonce"].filter(function(e){return void 0!==t[e]}).forEach(function(e){t[e]=n.fromDecimal(t[e])}),t},inputAddressFormatter:u,inputPostFormatter:function(t){return t.ttl=n.fromDecimal(t.ttl),t.workToProve=n.fromDecimal(t.workToProve),t.priority=n.fromDecimal(t.priority),n.isArray(t.topics)||(t.topics=t.topics?[t.topics]:[]),t.topics=t.topics.map(function(t){return 0===t.indexOf("0x")?t:n.fromUtf8(t)}),t},outputBigNumberFormatter:function(t){return n.toBigNumber(t)},outputTransactionFormatter:s,outputTransactionReceiptFormatter:function(t){return null!==t.blockNumber&&(t.blockNumber=n.toDecimal(t.blockNumber)),null!==t.transactionIndex&&(t.transactionIndex=n.toDecimal(t.transactionIndex)),t.cumulativeGasUsed=n.toDecimal(t.cumulativeGasUsed),t.gasUsed=n.toDecimal(t.gasUsed),n.isArray(t.logs)&&(t.logs=t.logs.map(function(t){return c(t)})),t},outputBlockFormatter:function(t){return t.gasLimit=n.toDecimal(t.gasLimit),t.gasUsed=n.toDecimal(t.gasUsed),t.size=n.toDecimal(t.size),t.timestamp=n.toDecimal(t.timestamp),null!==t.number&&(t.number=n.toDecimal(t.number)),t.difficulty=n.toBigNumber(t.difficulty),t.totalDifficulty=n.toBigNumber(t.totalDifficulty),n.isArray(t.transactions)&&t.transactions.forEach(function(t){if(!n.isString(t))return s(t)}),t},outputLogFormatter:c,outputPostFormatter:function(t){return t.expiry=n.toDecimal(t.expiry),t.sent=n.toDecimal(t.sent),t.ttl=n.toDecimal(t.ttl),t.workProved=n.toDecimal(t.workProved),t.topics||(t.topics=[]),t.topics=t.topics.map(function(t){return n.toAscii(t)}),t},outputSyncingFormatter:function(t){return t?(t.startingBlock=n.toDecimal(t.startingBlock),t.currentBlock=n.toDecimal(t.currentBlock),t.highestBlock=n.toDecimal(t.highestBlock),t.knownStates&&(t.knownStates=n.toDecimal(t.knownStates),t.pulledStates=n.toDecimal(t.pulledStates)),t):t}}},{"../utils/config":18,"../utils/utils":20,"./iban":33}],31:[function(t,e,r){var n=t("../solidity/coder"),o=t("../utils/utils"),i=t("./errors"),a=t("./formatters"),s=t("../utils/sha3"),c=function(t,e,r){this._eth=t,this._inputTypes=e.inputs.map(function(t){return t.type}),this._outputTypes=e.outputs.map(function(t){return t.type}),this._constant=e.constant,this._payable=e.payable,this._name=o.transformToFullName(e),this._address=r};c.prototype.extractCallback=function(t){if(o.isFunction(t[t.length-1]))return t.pop()},c.prototype.extractDefaultBlock=function(t){if(t.length>this._inputTypes.length&&!o.isObject(t[t.length-1]))return a.inputDefaultBlockNumberFormatter(t.pop())},c.prototype.validateArgs=function(t){if(t.filter(function(t){return!(!0===o.isObject(t)&&!1===o.isArray(t)&&!1===o.isBigNumber(t))}).length!==this._inputTypes.length)throw i.InvalidNumberOfSolidityArgs()},c.prototype.toPayload=function(t){var e={};return t.length>this._inputTypes.length&&o.isObject(t[t.length-1])&&(e=t[t.length-1]),this.validateArgs(t),e.to=this._address,e.data="0x"+this.signature()+n.encodeParams(this._inputTypes,t),e},c.prototype.signature=function(){return s(this._name).slice(0,8)},c.prototype.unpackOutput=function(t){if(t){t=t.length>=2?t.slice(2):t;var e=n.decodeParams(this._outputTypes,t);return 1===e.length?e[0]:e}},c.prototype.call=function(){var t=Array.prototype.slice.call(arguments).filter(function(t){return void 0!==t}),e=this.extractCallback(t),r=this.extractDefaultBlock(t),n=this.toPayload(t);if(!e){var o=this._eth.call(n,r);return this.unpackOutput(o)}var i=this;this._eth.call(n,r,function(t,r){if(t)return e(t,null);var n=null;try{n=i.unpackOutput(r)}catch(e){t=e}e(t,n)})},c.prototype.sendTransaction=function(){var t=Array.prototype.slice.call(arguments).filter(function(t){return void 0!==t}),e=this.extractCallback(t),r=this.toPayload(t);if(r.value>0&&!this._payable)throw new Error("Cannot send value to non-payable function");if(!e)return this._eth.sendTransaction(r);this._eth.sendTransaction(r,e)},c.prototype.estimateGas=function(){var t=Array.prototype.slice.call(arguments),e=this.extractCallback(t),r=this.toPayload(t);if(!e)return this._eth.estimateGas(r);this._eth.estimateGas(r,e)},c.prototype.getData=function(){var t=Array.prototype.slice.call(arguments);return this.toPayload(t).data},c.prototype.displayName=function(){return o.extractDisplayName(this._name)},c.prototype.typeName=function(){return o.extractTypeName(this._name)},c.prototype.request=function(){var t=Array.prototype.slice.call(arguments),e=this.extractCallback(t),r=this.toPayload(t),n=this.unpackOutput.bind(this);return{method:this._constant?"eth_call":"eth_sendTransaction",callback:e,params:[r],format:n}},c.prototype.execute=function(){return!this._constant?this.sendTransaction.apply(this,Array.prototype.slice.call(arguments)):this.call.apply(this,Array.prototype.slice.call(arguments))},c.prototype.attachToContract=function(t){var e=this.execute.bind(this);e.request=this.request.bind(this),e.call=this.call.bind(this),e.sendTransaction=this.sendTransaction.bind(this),e.estimateGas=this.estimateGas.bind(this),e.getData=this.getData.bind(this);var r=this.displayName();t[r]||(t[r]=e),t[r][this.typeName()]=e},e.exports=c},{"../solidity/coder":7,"../utils/sha3":19,"../utils/utils":20,"./errors":26,"./formatters":30}],32:[function(t,e,r){var n=t("./errors");"undefined"!=typeof window&&window.XMLHttpRequest?XMLHttpRequest=window.XMLHttpRequest:XMLHttpRequest=t("xmlhttprequest").XMLHttpRequest;var o=t("xhr2"),i=function(t,e,r,n,o){this.host=t||"http://localhost:8545",this.timeout=e||0,this.user=r,this.password=n,this.headers=o};i.prototype.prepareRequest=function(t){var e;if(t?(e=new o).timeout=this.timeout:e=new XMLHttpRequest,e.open("POST",this.host,t),this.user&&this.password){var r="Basic "+new Buffer(this.user+":"+this.password).toString("base64");e.setRequestHeader("Authorization",r)}return e.setRequestHeader("Content-Type","application/json"),this.headers&&this.headers.forEach(function(t){e.setRequestHeader(t.name,t.value)}),e},i.prototype.send=function(t){var e=this.prepareRequest(!1);try{e.send(JSON.stringify(t))}catch(t){throw n.InvalidConnection(this.host)}var r=e.responseText;try{r=JSON.parse(r)}catch(t){throw n.InvalidResponse(e.responseText)}return r},i.prototype.sendAsync=function(t,e){var r=this.prepareRequest(!0);r.onreadystatechange=function(){if(4===r.readyState&&1!==r.timeout){var t=r.responseText,o=null;try{t=JSON.parse(t)}catch(t){o=n.InvalidResponse(r.responseText)}e(o,t)}},r.ontimeout=function(){e(n.ConnectionTimeout(this.timeout))};try{r.send(JSON.stringify(t))}catch(t){e(n.InvalidConnection(this.host))}},i.prototype.isConnected=function(){try{return this.send({id:9999999999,jsonrpc:"2.0",method:"net_listening",params:[]}),!0}catch(t){return!1}},e.exports=i},{"./errors":26,xhr2:85,xmlhttprequest:17}],33:[function(t,e,r){var n=t("bignumber.js"),o=function(t,e){for(var r=t;r.length<2*e;)r="0"+r;return r},i=function(t){var e="A".charCodeAt(0),r="Z".charCodeAt(0);return(t=(t=t.toUpperCase()).substr(4)+t.substr(0,4)).split("").map(function(t){var n=t.charCodeAt(0);return n>=e&&n<=r?n-e+10:t}).join("")},a=function(t){for(var e,r=t;r.length>2;)e=r.slice(0,9),r=parseInt(e,10)%97+r.slice(e.length);return parseInt(r,10)%97},s=function(t){this._iban=t};s.fromAddress=function(t){var e=new n(t,16).toString(36),r=o(e,15);return s.fromBban(r.toUpperCase())},s.fromBban=function(t){var e=("0"+(98-a(i("XE00"+t)))).slice(-2);return new s("XE"+e+t)},s.createIndirect=function(t){return s.fromBban("ETH"+t.institution+t.identifier)},s.isValid=function(t){return new s(t).isValid()},s.prototype.isValid=function(){return/^XE[0-9]{2}(ETH[0-9A-Z]{13}|[0-9A-Z]{30,31})$/.test(this._iban)&&1===a(i(this._iban))},s.prototype.isDirect=function(){return 34===this._iban.length||35===this._iban.length},s.prototype.isIndirect=function(){return 20===this._iban.length},s.prototype.checksum=function(){return this._iban.substr(2,2)},s.prototype.institution=function(){return this.isIndirect()?this._iban.substr(7,4):""},s.prototype.client=function(){return this.isIndirect()?this._iban.substr(11):""},s.prototype.address=function(){if(this.isDirect()){var t=this._iban.substr(4),e=new n(t,36);return o(e.toString(16),20)}return""},s.prototype.toString=function(){return this._iban},e.exports=s},{"bignumber.js":"bignumber.js"}],34:[function(t,e,r){"use strict";var n=t("../utils/utils"),o=t("./errors"),i=function(t,e){var r=this;this.responseCallbacks={},this.path=t,this.connection=e.connect({path:this.path}),this.connection.on("error",function(t){console.error("IPC Connection Error",t),r._timeout()}),this.connection.on("end",function(){r._timeout()}),this.connection.on("data",function(t){r._parseResponse(t.toString()).forEach(function(t){var e=null;n.isArray(t)?t.forEach(function(t){r.responseCallbacks[t.id]&&(e=t.id)}):e=t.id,r.responseCallbacks[e]&&(r.responseCallbacks[e](null,t),delete r.responseCallbacks[e])})})};i.prototype._parseResponse=function(t){var e=this,r=[];return t.replace(/\}[\n\r]?\{/g,"}|--|{").replace(/\}\][\n\r]?\[\{/g,"}]|--|[{").replace(/\}[\n\r]?\[\{/g,"}|--|[{").replace(/\}\][\n\r]?\{/g,"}]|--|{").split("|--|").forEach(function(t){e.lastChunk&&(t=e.lastChunk+t);var n=null;try{n=JSON.parse(t)}catch(r){return e.lastChunk=t,clearTimeout(e.lastChunkTimeout),void(e.lastChunkTimeout=setTimeout(function(){throw e._timeout(),o.InvalidResponse(t)},15e3))}clearTimeout(e.lastChunkTimeout),e.lastChunk=null,n&&r.push(n)}),r},i.prototype._addResponseCallback=function(t,e){var r=t.id||t[0].id,n=t.method||t[0].method;this.responseCallbacks[r]=e,this.responseCallbacks[r].method=n},i.prototype._timeout=function(){for(var t in this.responseCallbacks)this.responseCallbacks.hasOwnProperty(t)&&(this.responseCallbacks[t](o.InvalidConnection("on IPC")),delete this.responseCallbacks[t])},i.prototype.isConnected=function(){return this.connection.writable||this.connection.connect({path:this.path}),!!this.connection.writable},i.prototype.send=function(t){if(this.connection.writeSync){var e;this.connection.writable||this.connection.connect({path:this.path});var r=this.connection.writeSync(JSON.stringify(t));try{e=JSON.parse(r)}catch(t){throw o.InvalidResponse(r)}return e}throw new Error('You tried to send "'+t.method+'" synchronously. Synchronous requests are not supported by the IPC provider.')},i.prototype.sendAsync=function(t,e){this.connection.writable||this.connection.connect({path:this.path}),this.connection.write(JSON.stringify(t)),this._addResponseCallback(t,e)},e.exports=i},{"../utils/utils":20,"./errors":26}],35:[function(t,e,r){var n={messageId:0,toPayload:function(t,e){return t||console.error("jsonrpc method should be specified!"),n.messageId++,{jsonrpc:"2.0",id:n.messageId,method:t,params:e||[]}},isValidResponse:function(t){return Array.isArray(t)?t.every(e):e(t);function e(t){return!!t&&!t.error&&"2.0"===t.jsonrpc&&"number"==typeof t.id&&void 0!==t.result}},toBatchPayload:function(t){return t.map(function(t){return n.toPayload(t.method,t.params)})}};e.exports=n},{}],36:[function(t,e,r){var n=t("../utils/utils"),o=t("./errors"),i=function(t){this.name=t.name,this.call=t.call,this.params=t.params||0,this.inputFormatter=t.inputFormatter,this.outputFormatter=t.outputFormatter,this.requestManager=null};i.prototype.setRequestManager=function(t){this.requestManager=t},i.prototype.getCall=function(t){return n.isFunction(this.call)?this.call(t):this.call},i.prototype.extractCallback=function(t){if(n.isFunction(t[t.length-1]))return t.pop()},i.prototype.validateArgs=function(t){if(t.length!==this.params)throw o.InvalidNumberOfRPCParams()},i.prototype.formatInput=function(t){return this.inputFormatter?this.inputFormatter.map(function(e,r){return e?e(t[r]):t[r]}):t},i.prototype.formatOutput=function(t){return this.outputFormatter&&t?this.outputFormatter(t):t},i.prototype.toPayload=function(t){var e=this.getCall(t),r=this.extractCallback(t),n=this.formatInput(t);return this.validateArgs(n),{method:e,params:n,callback:r}},i.prototype.attachToObject=function(t){var e=this.buildCall();e.call=this.call;var r=this.name.split(".");r.length>1?(t[r[0]]=t[r[0]]||{},t[r[0]][r[1]]=e):t[r[0]]=e},i.prototype.buildCall=function(){var t=this,e=function(){var e=t.toPayload(Array.prototype.slice.call(arguments));return e.callback?t.requestManager.sendAsync(e,function(r,n){e.callback(r,t.formatOutput(n))}):t.formatOutput(t.requestManager.send(e))};return e.request=this.request.bind(this),e},i.prototype.request=function(){var t=this.toPayload(Array.prototype.slice.call(arguments));return t.format=this.formatOutput.bind(this),t},e.exports=i},{"../utils/utils":20,"./errors":26}],37:[function(t,e,r){var n=t("../method"),o=function(){return[new n({name:"putString",call:"db_putString",params:3}),new n({name:"getString",call:"db_getString",params:2}),new n({name:"putHex",call:"db_putHex",params:3}),new n({name:"getHex",call:"db_getHex",params:2})]};e.exports=function(t){this._requestManager=t._requestManager;var e=this;o().forEach(function(r){r.attachToObject(e),r.setRequestManager(t._requestManager)})}},{"../method":36}],38:[function(t,e,r){"use strict";var n=t("../formatters"),o=t("../../utils/utils"),i=t("../method"),a=t("../property"),s=t("../../utils/config"),c=t("../contract"),u=t("./watches"),f=t("../filter"),l=t("../syncing"),p=t("../namereg"),h=t("../iban"),d=t("../transfer"),m=function(t){return o.isString(t[0])&&0===t[0].indexOf("0x")?"eth_getBlockByHash":"eth_getBlockByNumber"},y=function(t){return o.isString(t[0])&&0===t[0].indexOf("0x")?"eth_getTransactionByBlockHashAndIndex":"eth_getTransactionByBlockNumberAndIndex"},g=function(t){return o.isString(t[0])&&0===t[0].indexOf("0x")?"eth_getUncleByBlockHashAndIndex":"eth_getUncleByBlockNumberAndIndex"},v=function(t){return o.isString(t[0])&&0===t[0].indexOf("0x")?"eth_getBlockTransactionCountByHash":"eth_getBlockTransactionCountByNumber"},b=function(t){return o.isString(t[0])&&0===t[0].indexOf("0x")?"eth_getUncleCountByBlockHash":"eth_getUncleCountByBlockNumber"};function _(t){this._requestManager=t._requestManager;var e=this;w().forEach(function(t){t.attachToObject(e),t.setRequestManager(e._requestManager)}),x().forEach(function(t){t.attachToObject(e),t.setRequestManager(e._requestManager)}),this.iban=h,this.sendIBANTransaction=d.bind(null,this)}Object.defineProperty(_.prototype,"defaultBlock",{get:function(){return s.defaultBlock},set:function(t){return s.defaultBlock=t,t}}),Object.defineProperty(_.prototype,"defaultAccount",{get:function(){return s.defaultAccount},set:function(t){return s.defaultAccount=t,t}});var w=function(){var t=new i({name:"getBalance",call:"eth_getBalance",params:2,inputFormatter:[n.inputAddressFormatter,n.inputDefaultBlockNumberFormatter],outputFormatter:n.outputBigNumberFormatter}),e=new i({name:"getStorageAt",call:"eth_getStorageAt",params:3,inputFormatter:[null,o.toHex,n.inputDefaultBlockNumberFormatter]}),r=new i({name:"getCode",call:"eth_getCode",params:2,inputFormatter:[n.inputAddressFormatter,n.inputDefaultBlockNumberFormatter]}),a=new i({name:"getBlock",call:m,params:2,inputFormatter:[n.inputBlockNumberFormatter,function(t){return!!t}],outputFormatter:n.outputBlockFormatter}),s=new i({name:"getUncle",call:g,params:2,inputFormatter:[n.inputBlockNumberFormatter,o.toHex],outputFormatter:n.outputBlockFormatter}),c=new i({name:"getCompilers",call:"eth_getCompilers",params:0}),u=new i({name:"getBlockTransactionCount",call:v,params:1,inputFormatter:[n.inputBlockNumberFormatter],outputFormatter:o.toDecimal}),f=new i({name:"getBlockUncleCount",call:b,params:1,inputFormatter:[n.inputBlockNumberFormatter],outputFormatter:o.toDecimal}),l=new i({name:"getTransaction",call:"eth_getTransactionByHash",params:1,outputFormatter:n.outputTransactionFormatter}),p=new i({name:"getTransactionFromBlock",call:y,params:2,inputFormatter:[n.inputBlockNumberFormatter,o.toHex],outputFormatter:n.outputTransactionFormatter}),h=new i({name:"getTransactionReceipt",call:"eth_getTransactionReceipt",params:1,outputFormatter:n.outputTransactionReceiptFormatter}),d=new i({name:"getTransactionCount",call:"eth_getTransactionCount",params:2,inputFormatter:[null,n.inputDefaultBlockNumberFormatter],outputFormatter:o.toDecimal}),_=new i({name:"sendRawTransaction",call:"eth_sendRawTransaction",params:1,inputFormatter:[null]}),w=new i({name:"sendTransaction",call:"eth_sendTransaction",params:1,inputFormatter:[n.inputTransactionFormatter]}),x=new i({name:"signTransaction",call:"eth_signTransaction",params:1,inputFormatter:[n.inputTransactionFormatter]}),k=new i({name:"sign",call:"eth_sign",params:2,inputFormatter:[n.inputAddressFormatter,null]});return[t,e,r,a,s,c,u,f,l,p,h,d,new i({name:"call",call:"eth_call",params:2,inputFormatter:[n.inputCallFormatter,n.inputDefaultBlockNumberFormatter]}),new i({name:"estimateGas",call:"eth_estimateGas",params:1,inputFormatter:[n.inputCallFormatter],outputFormatter:o.toDecimal}),_,x,w,k,new i({name:"compile.solidity",call:"eth_compileSolidity",params:1}),new i({name:"compile.lll",call:"eth_compileLLL",params:1}),new i({name:"compile.serpent",call:"eth_compileSerpent",params:1}),new i({name:"submitWork",call:"eth_submitWork",params:3}),new i({name:"getWork",call:"eth_getWork",params:0})]},x=function(){return[new a({name:"coinbase",getter:"eth_coinbase"}),new a({name:"mining",getter:"eth_mining"}),new a({name:"hashrate",getter:"eth_hashrate",outputFormatter:o.toDecimal}),new a({name:"syncing",getter:"eth_syncing",outputFormatter:n.outputSyncingFormatter}),new a({name:"gasPrice",getter:"eth_gasPrice",outputFormatter:n.outputBigNumberFormatter}),new a({name:"accounts",getter:"eth_accounts"}),new a({name:"blockNumber",getter:"eth_blockNumber",outputFormatter:o.toDecimal}),new a({name:"protocolVersion",getter:"eth_protocolVersion"})]};_.prototype.contract=function(t){return new c(this,t)},_.prototype.filter=function(t,e,r){return new f(t,"eth",this._requestManager,u.eth(),n.outputLogFormatter,e,r)},_.prototype.namereg=function(){return this.contract(p.global.abi).at(p.global.address)},_.prototype.icapNamereg=function(){return this.contract(p.icap.abi).at(p.icap.address)},_.prototype.isSyncing=function(t){return new l(this._requestManager,t)},e.exports=_},{"../../utils/config":18,"../../utils/utils":20,"../contract":25,"../filter":29,"../formatters":30,"../iban":33,"../method":36,"../namereg":44,"../property":45,"../syncing":48,"../transfer":49,"./watches":43}],39:[function(t,e,r){var n=t("../../utils/utils"),o=t("../property"),i=function(){return[new o({name:"listening",getter:"net_listening"}),new o({name:"peerCount",getter:"net_peerCount",outputFormatter:n.toDecimal})]};e.exports=function(t){this._requestManager=t._requestManager;var e=this;i().forEach(function(r){r.attachToObject(e),r.setRequestManager(t._requestManager)})}},{"../../utils/utils":20,"../property":45}],40:[function(t,e,r){"use strict";var n=t("../method"),o=t("../property"),i=t("../formatters");var a=function(){var t=new n({name:"newAccount",call:"personal_newAccount",params:1,inputFormatter:[null]}),e=new n({name:"importRawKey",call:"personal_importRawKey",params:2}),r=new n({name:"sign",call:"personal_sign",params:3,inputFormatter:[null,i.inputAddressFormatter,null]}),o=new n({name:"ecRecover",call:"personal_ecRecover",params:2});return[t,e,new n({name:"unlockAccount",call:"personal_unlockAccount",params:3,inputFormatter:[i.inputAddressFormatter,null,null]}),o,r,new n({name:"sendTransaction",call:"personal_sendTransaction",params:2,inputFormatter:[i.inputTransactionFormatter,null]}),new n({name:"lockAccount",call:"personal_lockAccount",params:1,inputFormatter:[i.inputAddressFormatter]})]},s=function(){return[new o({name:"listAccounts",getter:"personal_listAccounts"})]};e.exports=function(t){this._requestManager=t._requestManager;var e=this;a().forEach(function(t){t.attachToObject(e),t.setRequestManager(e._requestManager)}),s().forEach(function(t){t.attachToObject(e),t.setRequestManager(e._requestManager)})}},{"../formatters":30,"../method":36,"../property":45}],41:[function(t,e,r){var n=t("../method"),o=t("../filter"),i=t("./watches"),a=function(t){this._requestManager=t._requestManager;var e=this;s().forEach(function(t){t.attachToObject(e),t.setRequestManager(e._requestManager)})};a.prototype.newMessageFilter=function(t,e,r){return new o(t,"shh",this._requestManager,i.shh(),null,e,r)};var s=function(){return[new n({name:"version",call:"shh_version",params:0}),new n({name:"info",call:"shh_info",params:0}),new n({name:"setMaxMessageSize",call:"shh_setMaxMessageSize",params:1}),new n({name:"setMinPoW",call:"shh_setMinPoW",params:1}),new n({name:"markTrustedPeer",call:"shh_markTrustedPeer",params:1}),new n({name:"newKeyPair",call:"shh_newKeyPair",params:0}),new n({name:"addPrivateKey",call:"shh_addPrivateKey",params:1}),new n({name:"deleteKeyPair",call:"shh_deleteKeyPair",params:1}),new n({name:"hasKeyPair",call:"shh_hasKeyPair",params:1}),new n({name:"getPublicKey",call:"shh_getPublicKey",params:1}),new n({name:"getPrivateKey",call:"shh_getPrivateKey",params:1}),new n({name:"newSymKey",call:"shh_newSymKey",params:0}),new n({name:"addSymKey",call:"shh_addSymKey",params:1}),new n({name:"generateSymKeyFromPassword",call:"shh_generateSymKeyFromPassword",params:1}),new n({name:"hasSymKey",call:"shh_hasSymKey",params:1}),new n({name:"getSymKey",call:"shh_getSymKey",params:1}),new n({name:"deleteSymKey",call:"shh_deleteSymKey",params:1}),new n({name:"post",call:"shh_post",params:1,inputFormatter:[null]})]};e.exports=a},{"../filter":29,"../method":36,"./watches":43}],42:[function(t,e,r){"use strict";var n=t("../method"),o=t("../property");var i=function(){return[new n({name:"blockNetworkRead",call:"bzz_blockNetworkRead",params:1,inputFormatter:[null]}),new n({name:"syncEnabled",call:"bzz_syncEnabled",params:1,inputFormatter:[null]}),new n({name:"swapEnabled",call:"bzz_swapEnabled",params:1,inputFormatter:[null]}),new n({name:"download",call:"bzz_download",params:2,inputFormatter:[null,null]}),new n({name:"upload",call:"bzz_upload",params:2,inputFormatter:[null,null]}),new n({name:"retrieve",call:"bzz_retrieve",params:1,inputFormatter:[null]}),new n({name:"store",call:"bzz_store",params:2,inputFormatter:[null,null]}),new n({name:"get",call:"bzz_get",params:1,inputFormatter:[null]}),new n({name:"put",call:"bzz_put",params:2,inputFormatter:[null,null]}),new n({name:"modify",call:"bzz_modify",params:4,inputFormatter:[null,null,null,null]})]},a=function(){return[new o({name:"hive",getter:"bzz_hive"}),new o({name:"info",getter:"bzz_info"})]};e.exports=function(t){this._requestManager=t._requestManager;var e=this;i().forEach(function(t){t.attachToObject(e),t.setRequestManager(e._requestManager)}),a().forEach(function(t){t.attachToObject(e),t.setRequestManager(e._requestManager)})}},{"../method":36,"../property":45}],43:[function(t,e,r){var n=t("../method");e.exports={eth:function(){return[new n({name:"newFilter",call:function(t){switch(t[0]){case"latest":return t.shift(),this.params=0,"eth_newBlockFilter";case"pending":return t.shift(),this.params=0,"eth_newPendingTransactionFilter";default:return"eth_newFilter"}},params:1}),new n({name:"uninstallFilter",call:"eth_uninstallFilter",params:1}),new n({name:"getLogs",call:"eth_getFilterLogs",params:1}),new n({name:"poll",call:"eth_getFilterChanges",params:1})]},shh:function(){return[new n({name:"newFilter",call:"shh_newMessageFilter",params:1}),new n({name:"uninstallFilter",call:"shh_deleteMessageFilter",params:1}),new n({name:"getLogs",call:"shh_getFilterMessages",params:1}),new n({name:"poll",call:"shh_getFilterMessages",params:1})]}}},{"../method":36}],44:[function(t,e,r){var n=t("../contracts/GlobalRegistrar.json"),o=t("../contracts/ICAPRegistrar.json");e.exports={global:{abi:n,address:"0xc6d9d2cd449a754c494264e1809c50e34d64562b"},icap:{abi:o,address:"0xa1a111bc074c9cfa781f0c38e63bd51c91b8af00"}}},{"../contracts/GlobalRegistrar.json":1,"../contracts/ICAPRegistrar.json":2}],45:[function(t,e,r){var n=t("../utils/utils"),o=function(t){this.name=t.name,this.getter=t.getter,this.setter=t.setter,this.outputFormatter=t.outputFormatter,this.inputFormatter=t.inputFormatter,this.requestManager=null};o.prototype.setRequestManager=function(t){this.requestManager=t},o.prototype.formatInput=function(t){return this.inputFormatter?this.inputFormatter(t):t},o.prototype.formatOutput=function(t){return this.outputFormatter&&null!=t?this.outputFormatter(t):t},o.prototype.extractCallback=function(t){if(n.isFunction(t[t.length-1]))return t.pop()},o.prototype.attachToObject=function(t){var e={get:this.buildGet(),enumerable:!0},r=this.name.split("."),n=r[0];r.length>1&&(t[r[0]]=t[r[0]]||{},t=t[r[0]],n=r[1]),Object.defineProperty(t,n,e),t[i(n)]=this.buildAsyncGet()};var i=function(t){return"get"+t.charAt(0).toUpperCase()+t.slice(1)};o.prototype.buildGet=function(){var t=this;return function(){return t.formatOutput(t.requestManager.send({method:t.getter}))}},o.prototype.buildAsyncGet=function(){var t=this,e=function(e){t.requestManager.sendAsync({method:t.getter},function(r,n){e(r,t.formatOutput(n))})};return e.request=this.request.bind(this),e},o.prototype.request=function(){var t={method:this.getter,params:[],callback:this.extractCallback(Array.prototype.slice.call(arguments))};return t.format=this.formatOutput.bind(this),t},e.exports=o},{"../utils/utils":20}],46:[function(t,e,r){var n=t("./jsonrpc"),o=t("../utils/utils"),i=t("../utils/config"),a=t("./errors"),s=function(t){this.provider=t,this.polls={},this.timeout=null};s.prototype.send=function(t){if(!this.provider)return console.error(a.InvalidProvider()),null;var e=n.toPayload(t.method,t.params),r=this.provider.send(e);if(!n.isValidResponse(r))throw a.InvalidResponse(r);return r.result},s.prototype.sendAsync=function(t,e){if(!this.provider)return e(a.InvalidProvider());var r=n.toPayload(t.method,t.params);this.provider.sendAsync(r,function(t,r){return t?e(t):n.isValidResponse(r)?void e(null,r.result):e(a.InvalidResponse(r))})},s.prototype.sendBatch=function(t,e){if(!this.provider)return e(a.InvalidProvider());var r=n.toBatchPayload(t);this.provider.sendAsync(r,function(t,r){return t?e(t):o.isArray(r)?void e(t,r):e(a.InvalidResponse(r))})},s.prototype.setProvider=function(t){this.provider=t},s.prototype.startPolling=function(t,e,r,n){this.polls[e]={data:t,id:e,callback:r,uninstall:n},this.timeout||this.poll()},s.prototype.stopPolling=function(t){delete this.polls[t],0===Object.keys(this.polls).length&&this.timeout&&(clearTimeout(this.timeout),this.timeout=null)},s.prototype.reset=function(t){for(var e in this.polls)t&&-1!==e.indexOf("syncPoll_")||(this.polls[e].uninstall(),delete this.polls[e]);0===Object.keys(this.polls).length&&this.timeout&&(clearTimeout(this.timeout),this.timeout=null)},s.prototype.poll=function(){if(this.timeout=setTimeout(this.poll.bind(this),i.ETH_POLLING_TIMEOUT),0!==Object.keys(this.polls).length)if(this.provider){var t=[],e=[];for(var r in this.polls)t.push(this.polls[r].data),e.push(r);if(0!==t.length){var s=n.toBatchPayload(t),c={};s.forEach(function(t,r){c[t.id]=e[r]});var u=this;this.provider.sendAsync(s,function(t,e){if(!t){if(!o.isArray(e))throw a.InvalidResponse(e);e.map(function(t){var e=c[t.id];return!!u.polls[e]&&(t.callback=u.polls[e].callback,t)}).filter(function(t){return!!t}).filter(function(t){var e=n.isValidResponse(t);return e||t.callback(a.InvalidResponse(t)),e}).forEach(function(t){t.callback(null,t.result)})}})}}else console.error(a.InvalidProvider())},e.exports=s},{"../utils/config":18,"../utils/utils":20,"./errors":26,"./jsonrpc":35}],47:[function(t,e,r){e.exports=function(){this.defaultBlock="latest",this.defaultAccount=void 0}},{}],48:[function(t,e,r){var n=t("./formatters"),o=t("../utils/utils"),i=1,a=function(t,e){var r;return this.requestManager=t,this.pollId="syncPoll_"+i++,this.callbacks=[],this.addCallback(e),this.lastSyncState=!1,(r=this).requestManager.startPolling({method:"eth_syncing",params:[]},r.pollId,function(t,e){if(t)return r.callbacks.forEach(function(e){e(t)});o.isObject(e)&&e.startingBlock&&(e=n.outputSyncingFormatter(e)),r.callbacks.forEach(function(t){r.lastSyncState!==e&&(!r.lastSyncState&&o.isObject(e)&&t(null,!0),setTimeout(function(){t(null,e)},0),r.lastSyncState=e)})},r.stopWatching.bind(r)),this};a.prototype.addCallback=function(t){return t&&this.callbacks.push(t),this},a.prototype.stopWatching=function(){this.requestManager.stopPolling(this.pollId),this.callbacks=[]},e.exports=a},{"../utils/utils":20,"./formatters":30}],49:[function(t,e,r){var n=t("./iban"),o=t("../contracts/SmartExchange.json"),i=function(t,e,r,n,o){return t.sendTransaction({address:r,from:e,value:n},o)},a=function(t,e,r,n,i,a){var s=o;return t.contract(s).at(r).deposit(i,{from:e,value:n},a)};e.exports=function(t,e,r,o,s){var c=new n(r);if(!c.isValid())throw new Error("invalid iban address");if(c.isDirect())return i(t,e,c.address(),o,s);if(!s){var u=t.icapNamereg().addr(c.institution());return a(t,e,u,o,c.client())}t.icapNamereg().addr(c.institution(),function(r,n){return a(t,e,n,o,c.client(),s)})}},{"../contracts/SmartExchange.json":3,"./iban":33}],50:[function(t,e,r){var n,o;n=this,o=function(t){return function(){var e=t,r=e.lib.BlockCipher,n=e.algo,o=[],i=[],a=[],s=[],c=[],u=[],f=[],l=[],p=[],h=[];!function(){for(var t=[],e=0;e<256;e++)t[e]=e<128?e<<1:e<<1^283;var r=0,n=0;for(e=0;e<256;e++){var d=n^n<<1^n<<2^n<<3^n<<4;d=d>>>8^255&d^99,o[r]=d,i[d]=r;var m=t[r],y=t[m],g=t[y],v=257*t[d]^16843008*d;a[r]=v<<24|v>>>8,s[r]=v<<16|v>>>16,c[r]=v<<8|v>>>24,u[r]=v;v=16843009*g^65537*y^257*m^16843008*r;f[d]=v<<24|v>>>8,l[d]=v<<16|v>>>16,p[d]=v<<8|v>>>24,h[d]=v,r?(r=m^t[t[t[g^m]]],n^=t[t[n]]):r=n=1}}();var d=[0,1,2,4,8,16,32,64,128,27,54],m=n.AES=r.extend({_doReset:function(){if(!this._nRounds||this._keyPriorReset!==this._key){for(var t=this._keyPriorReset=this._key,e=t.words,r=t.sigBytes/4,n=4*((this._nRounds=r+6)+1),i=this._keySchedule=[],a=0;a<n;a++)if(a<r)i[a]=e[a];else{var s=i[a-1];a%r?r>6&&a%r==4&&(s=o[s>>>24]<<24|o[s>>>16&255]<<16|o[s>>>8&255]<<8|o[255&s]):(s=o[(s=s<<8|s>>>24)>>>24]<<24|o[s>>>16&255]<<16|o[s>>>8&255]<<8|o[255&s],s^=d[a/r|0]<<24),i[a]=i[a-r]^s}for(var c=this._invKeySchedule=[],u=0;u<n;u++){a=n-u;if(u%4)s=i[a];else s=i[a-4];c[u]=u<4||a<=4?s:f[o[s>>>24]]^l[o[s>>>16&255]]^p[o[s>>>8&255]]^h[o[255&s]]}}},encryptBlock:function(t,e){this._doCryptBlock(t,e,this._keySchedule,a,s,c,u,o)},decryptBlock:function(t,e){var r=t[e+1];t[e+1]=t[e+3],t[e+3]=r,this._doCryptBlock(t,e,this._invKeySchedule,f,l,p,h,i);r=t[e+1];t[e+1]=t[e+3],t[e+3]=r},_doCryptBlock:function(t,e,r,n,o,i,a,s){for(var c=this._nRounds,u=t[e]^r[0],f=t[e+1]^r[1],l=t[e+2]^r[2],p=t[e+3]^r[3],h=4,d=1;d<c;d++){var m=n[u>>>24]^o[f>>>16&255]^i[l>>>8&255]^a[255&p]^r[h++],y=n[f>>>24]^o[l>>>16&255]^i[p>>>8&255]^a[255&u]^r[h++],g=n[l>>>24]^o[p>>>16&255]^i[u>>>8&255]^a[255&f]^r[h++],v=n[p>>>24]^o[u>>>16&255]^i[f>>>8&255]^a[255&l]^r[h++];u=m,f=y,l=g,p=v}m=(s[u>>>24]<<24|s[f>>>16&255]<<16|s[l>>>8&255]<<8|s[255&p])^r[h++],y=(s[f>>>24]<<24|s[l>>>16&255]<<16|s[p>>>8&255]<<8|s[255&u])^r[h++],g=(s[l>>>24]<<24|s[p>>>16&255]<<16|s[u>>>8&255]<<8|s[255&f])^r[h++],v=(s[p>>>24]<<24|s[u>>>16&255]<<16|s[f>>>8&255]<<8|s[255&l])^r[h++];t[e]=m,t[e+1]=y,t[e+2]=g,t[e+3]=v},keySize:8});e.AES=r._createHelper(m)}(),t.AES},"object"==typeof r?e.exports=r=o(t("./core"),t("./enc-base64"),t("./md5"),t("./evpkdf"),t("./cipher-core")):"function"==typeof define&&define.amd?define(["./core","./enc-base64","./md5","./evpkdf","./cipher-core"],o):o(n.CryptoJS)},{"./cipher-core":51,"./core":52,"./enc-base64":53,"./evpkdf":55,"./md5":60}],51:[function(t,e,r){var n,o;n=this,o=function(t){var e,r,n,o,i,a,s,c,u,f,l,p,h,d,m,y,g,v,b;t.lib.Cipher||(n=(r=t).lib,o=n.Base,i=n.WordArray,a=n.BufferedBlockAlgorithm,(s=r.enc).Utf8,c=s.Base64,u=r.algo.EvpKDF,f=n.Cipher=a.extend({cfg:o.extend(),createEncryptor:function(t,e){return this.create(this._ENC_XFORM_MODE,t,e)},createDecryptor:function(t,e){return this.create(this._DEC_XFORM_MODE,t,e)},init:function(t,e,r){this.cfg=this.cfg.extend(r),this._xformMode=t,this._key=e,this.reset()},reset:function(){a.reset.call(this),this._doReset()},process:function(t){return this._append(t),this._process()},finalize:function(t){return t&&this._append(t),this._doFinalize()},keySize:4,ivSize:4,_ENC_XFORM_MODE:1,_DEC_XFORM_MODE:2,_createHelper:function(){function t(t){return"string"==typeof t?b:g}return function(e){return{encrypt:function(r,n,o){return t(n).encrypt(e,r,n,o)},decrypt:function(r,n,o){return t(n).decrypt(e,r,n,o)}}}}()}),n.StreamCipher=f.extend({_doFinalize:function(){return this._process(!0)},blockSize:1}),l=r.mode={},p=n.BlockCipherMode=o.extend({createEncryptor:function(t,e){return this.Encryptor.create(t,e)},createDecryptor:function(t,e){return this.Decryptor.create(t,e)},init:function(t,e){this._cipher=t,this._iv=e}}),h=l.CBC=function(){var t=p.extend();function r(t,r,n){var o=this._iv;if(o){var i=o;this._iv=e}else i=this._prevBlock;for(var a=0;a<n;a++)t[r+a]^=i[a]}return t.Encryptor=t.extend({processBlock:function(t,e){var n=this._cipher,o=n.blockSize;r.call(this,t,e,o),n.encryptBlock(t,e),this._prevBlock=t.slice(e,e+o)}}),t.Decryptor=t.extend({processBlock:function(t,e){var n=this._cipher,o=n.blockSize,i=t.slice(e,e+o);n.decryptBlock(t,e),r.call(this,t,e,o),this._prevBlock=i}}),t}(),d=(r.pad={}).Pkcs7={pad:function(t,e){for(var r=4*e,n=r-t.sigBytes%r,o=n<<24|n<<16|n<<8|n,a=[],s=0;s<n;s+=4)a.push(o);var c=i.create(a,n);t.concat(c)},unpad:function(t){var e=255&t.words[t.sigBytes-1>>>2];t.sigBytes-=e}},n.BlockCipher=f.extend({cfg:f.cfg.extend({mode:h,padding:d}),reset:function(){f.reset.call(this);var t=this.cfg,e=t.iv,r=t.mode;if(this._xformMode==this._ENC_XFORM_MODE)var n=r.createEncryptor;else{n=r.createDecryptor;this._minBufferSize=1}this._mode=n.call(r,this,e&&e.words)},_doProcessBlock:function(t,e){this._mode.processBlock(t,e)},_doFinalize:function(){var t=this.cfg.padding;if(this._xformMode==this._ENC_XFORM_MODE){t.pad(this._data,this.blockSize);var e=this._process(!0)}else{e=this._process(!0);t.unpad(e)}return e},blockSize:4}),m=n.CipherParams=o.extend({init:function(t){this.mixIn(t)},toString:function(t){return(t||this.formatter).stringify(this)}}),y=(r.format={}).OpenSSL={stringify:function(t){var e=t.ciphertext,r=t.salt;if(r)var n=i.create([1398893684,1701076831]).concat(r).concat(e);else n=e;return n.toString(c)},parse:function(t){var e=c.parse(t),r=e.words;if(1398893684==r[0]&&1701076831==r[1]){var n=i.create(r.slice(2,4));r.splice(0,4),e.sigBytes-=16}return m.create({ciphertext:e,salt:n})}},g=n.SerializableCipher=o.extend({cfg:o.extend({format:y}),encrypt:function(t,e,r,n){n=this.cfg.extend(n);var o=t.createEncryptor(r,n),i=o.finalize(e),a=o.cfg;return m.create({ciphertext:i,key:r,iv:a.iv,algorithm:t,mode:a.mode,padding:a.padding,blockSize:t.blockSize,formatter:n.format})},decrypt:function(t,e,r,n){return n=this.cfg.extend(n),e=this._parse(e,n.format),t.createDecryptor(r,n).finalize(e.ciphertext)},_parse:function(t,e){return"string"==typeof t?e.parse(t,this):t}}),v=(r.kdf={}).OpenSSL={execute:function(t,e,r,n){n||(n=i.random(8));var o=u.create({keySize:e+r}).compute(t,n),a=i.create(o.words.slice(e),4*r);return o.sigBytes=4*e,m.create({key:o,iv:a,salt:n})}},b=n.PasswordBasedCipher=g.extend({cfg:g.cfg.extend({kdf:v}),encrypt:function(t,e,r,n){var o=(n=this.cfg.extend(n)).kdf.execute(r,t.keySize,t.ivSize);n.iv=o.iv;var i=g.encrypt.call(this,t,e,o.key,n);return i.mixIn(o),i},decrypt:function(t,e,r,n){n=this.cfg.extend(n),e=this._parse(e,n.format);var o=n.kdf.execute(r,t.keySize,t.ivSize,e.salt);return n.iv=o.iv,g.decrypt.call(this,t,e,o.key,n)}}))},"object"==typeof r?e.exports=r=o(t("./core")):"function"==typeof define&&define.amd?define(["./core"],o):o(n.CryptoJS)},{"./core":52}],52:[function(t,e,r){var n,o;n=this,o=function(){var t,e,r,n,o,i,a,s,c,u,f,l,p=p||(t=Math,e=Object.create||function(){function t(){}return function(e){var r;return t.prototype=e,r=new t,t.prototype=null,r}}(),n=(r={}).lib={},o=n.Base={extend:function(t){var r=e(this);return t&&r.mixIn(t),r.hasOwnProperty("init")&&this.init!==r.init||(r.init=function(){r.$super.init.apply(this,arguments)}),r.init.prototype=r,r.$super=this,r},create:function(){var t=this.extend();return t.init.apply(t,arguments),t},init:function(){},mixIn:function(t){for(var e in t)t.hasOwnProperty(e)&&(this[e]=t[e]);t.hasOwnProperty("toString")&&(this.toString=t.toString)},clone:function(){return this.init.prototype.extend(this)}},i=n.WordArray=o.extend({init:function(t,e){t=this.words=t||[],this.sigBytes=null!=e?e:4*t.length},toString:function(t){return(t||s).stringify(this)},concat:function(t){var e=this.words,r=t.words,n=this.sigBytes,o=t.sigBytes;if(this.clamp(),n%4)for(var i=0;i<o;i++){var a=r[i>>>2]>>>24-i%4*8&255;e[n+i>>>2]|=a<<24-(n+i)%4*8}else for(i=0;i<o;i+=4)e[n+i>>>2]=r[i>>>2];return this.sigBytes+=o,this},clamp:function(){var e=this.words,r=this.sigBytes;e[r>>>2]&=4294967295<<32-r%4*8,e.length=t.ceil(r/4)},clone:function(){var t=o.clone.call(this);return t.words=this.words.slice(0),t},random:function(e){for(var r,n=[],o=function(e){e=e;var r=987654321,n=4294967295;return function(){var o=((r=36969*(65535&r)+(r>>16)&n)<<16)+(e=18e3*(65535&e)+(e>>16)&n)&n;return o/=4294967296,(o+=.5)*(t.random()>.5?1:-1)}},a=0;a<e;a+=4){var s=o(4294967296*(r||t.random()));r=987654071*s(),n.push(4294967296*s()|0)}return new i.init(n,e)}}),a=r.enc={},s=a.Hex={stringify:function(t){for(var e=t.words,r=t.sigBytes,n=[],o=0;o<r;o++){var i=e[o>>>2]>>>24-o%4*8&255;n.push((i>>>4).toString(16)),n.push((15&i).toString(16))}return n.join("")},parse:function(t){for(var e=t.length,r=[],n=0;n<e;n+=2)r[n>>>3]|=parseInt(t.substr(n,2),16)<<24-n%8*4;return new i.init(r,e/2)}},c=a.Latin1={stringify:function(t){for(var e=t.words,r=t.sigBytes,n=[],o=0;o<r;o++){var i=e[o>>>2]>>>24-o%4*8&255;n.push(String.fromCharCode(i))}return n.join("")},parse:function(t){for(var e=t.length,r=[],n=0;n<e;n++)r[n>>>2]|=(255&t.charCodeAt(n))<<24-n%4*8;return new i.init(r,e)}},u=a.Utf8={stringify:function(t){try{return decodeURIComponent(escape(c.stringify(t)))}catch(t){throw new Error("Malformed UTF-8 data")}},parse:function(t){return c.parse(unescape(encodeURIComponent(t)))}},f=n.BufferedBlockAlgorithm=o.extend({reset:function(){this._data=new i.init,this._nDataBytes=0},_append:function(t){"string"==typeof t&&(t=u.parse(t)),this._data.concat(t),this._nDataBytes+=t.sigBytes},_process:function(e){var r=this._data,n=r.words,o=r.sigBytes,a=this.blockSize,s=o/(4*a),c=(s=e?t.ceil(s):t.max((0|s)-this._minBufferSize,0))*a,u=t.min(4*c,o);if(c){for(var f=0;f<c;f+=a)this._doProcessBlock(n,f);var l=n.splice(0,c);r.sigBytes-=u}return new i.init(l,u)},clone:function(){var t=o.clone.call(this);return t._data=this._data.clone(),t},_minBufferSize:0}),n.Hasher=f.extend({cfg:o.extend(),init:function(t){this.cfg=this.cfg.extend(t),this.reset()},reset:function(){f.reset.call(this),this._doReset()},update:function(t){return this._append(t),this._process(),this},finalize:function(t){return t&&this._append(t),this._doFinalize()},blockSize:16,_createHelper:function(t){return function(e,r){return new t.init(r).finalize(e)}},_createHmacHelper:function(t){return function(e,r){return new l.HMAC.init(t,r).finalize(e)}}}),l=r.algo={},r);return p},"object"==typeof r?e.exports=r=o():"function"==typeof define&&define.amd?define([],o):n.CryptoJS=o()},{}],53:[function(t,e,r){var n,o;n=this,o=function(t){return function(){var e=t,r=e.lib.WordArray;e.enc.Base64={stringify:function(t){var e=t.words,r=t.sigBytes,n=this._map;t.clamp();for(var o=[],i=0;i<r;i+=3)for(var a=(e[i>>>2]>>>24-i%4*8&255)<<16|(e[i+1>>>2]>>>24-(i+1)%4*8&255)<<8|e[i+2>>>2]>>>24-(i+2)%4*8&255,s=0;s<4&&i+.75*s<r;s++)o.push(n.charAt(a>>>6*(3-s)&63));var c=n.charAt(64);if(c)for(;o.length%4;)o.push(c);return o.join("")},parse:function(t){var e=t.length,n=this._map,o=this._reverseMap;if(!o){o=this._reverseMap=[];for(var i=0;i<n.length;i++)o[n.charCodeAt(i)]=i}var a=n.charAt(64);if(a){var s=t.indexOf(a);-1!==s&&(e=s)}return function(t,e,n){for(var o=[],i=0,a=0;a<e;a++)if(a%4){var s=n[t.charCodeAt(a-1)]<<a%4*2,c=n[t.charCodeAt(a)]>>>6-a%4*2;o[i>>>2]|=(s|c)<<24-i%4*8,i++}return r.create(o,i)}(t,e,o)},_map:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="}}(),t.enc.Base64},"object"==typeof r?e.exports=r=o(t("./core")):"function"==typeof define&&define.amd?define(["./core"],o):o(n.CryptoJS)},{"./core":52}],54:[function(t,e,r){var n,o;n=this,o=function(t){return function(){var e=t,r=e.lib.WordArray,n=e.enc;n.Utf16=n.Utf16BE={stringify:function(t){for(var e=t.words,r=t.sigBytes,n=[],o=0;o<r;o+=2){var i=e[o>>>2]>>>16-o%4*8&65535;n.push(String.fromCharCode(i))}return n.join("")},parse:function(t){for(var e=t.length,n=[],o=0;o<e;o++)n[o>>>1]|=t.charCodeAt(o)<<16-o%2*16;return r.create(n,2*e)}};function o(t){return t<<8&4278255360|t>>>8&16711935}n.Utf16LE={stringify:function(t){for(var e=t.words,r=t.sigBytes,n=[],i=0;i<r;i+=2){var a=o(e[i>>>2]>>>16-i%4*8&65535);n.push(String.fromCharCode(a))}return n.join("")},parse:function(t){for(var e=t.length,n=[],i=0;i<e;i++)n[i>>>1]|=o(t.charCodeAt(i)<<16-i%2*16);return r.create(n,2*e)}}}(),t.enc.Utf16},"object"==typeof r?e.exports=r=o(t("./core")):"function"==typeof define&&define.amd?define(["./core"],o):o(n.CryptoJS)},{"./core":52}],55:[function(t,e,r){var n,o;n=this,o=function(t){var e,r,n,o,i,a,s;return r=(e=t).lib,n=r.Base,o=r.WordArray,i=e.algo,a=i.MD5,s=i.EvpKDF=n.extend({cfg:n.extend({keySize:4,hasher:a,iterations:1}),init:function(t){this.cfg=this.cfg.extend(t)},compute:function(t,e){for(var r=this.cfg,n=r.hasher.create(),i=o.create(),a=i.words,s=r.keySize,c=r.iterations;a.length<s;){u&&n.update(u);var u=n.update(t).finalize(e);n.reset();for(var f=1;f<c;f++)u=n.finalize(u),n.reset();i.concat(u)}return i.sigBytes=4*s,i}}),e.EvpKDF=function(t,e,r){return s.create(r).compute(t,e)},t.EvpKDF},"object"==typeof r?e.exports=r=o(t("./core"),t("./sha1"),t("./hmac")):"function"==typeof define&&define.amd?define(["./core","./sha1","./hmac"],o):o(n.CryptoJS)},{"./core":52,"./hmac":57,"./sha1":76}],56:[function(t,e,r){var n,o;n=this,o=function(t){var e,r,n;return r=(e=t).lib.CipherParams,n=e.enc.Hex,e.format.Hex={stringify:function(t){return t.ciphertext.toString(n)},parse:function(t){var e=n.parse(t);return r.create({ciphertext:e})}},t.format.Hex},"object"==typeof r?e.exports=r=o(t("./core"),t("./cipher-core")):"function"==typeof define&&define.amd?define(["./core","./cipher-core"],o):o(n.CryptoJS)},{"./cipher-core":51,"./core":52}],57:[function(t,e,r){var n,o;n=this,o=function(t){var e,r,n;r=(e=t).lib.Base,n=e.enc.Utf8,e.algo.HMAC=r.extend({init:function(t,e){t=this._hasher=new t.init,"string"==typeof e&&(e=n.parse(e));var r=t.blockSize,o=4*r;e.sigBytes>o&&(e=t.finalize(e)),e.clamp();for(var i=this._oKey=e.clone(),a=this._iKey=e.clone(),s=i.words,c=a.words,u=0;u<r;u++)s[u]^=1549556828,c[u]^=909522486;i.sigBytes=a.sigBytes=o,this.reset()},reset:function(){var t=this._hasher;t.reset(),t.update(this._iKey)},update:function(t){return this._hasher.update(t),this},finalize:function(t){var e=this._hasher,r=e.finalize(t);return e.reset(),e.finalize(this._oKey.clone().concat(r))}})},"object"==typeof r?e.exports=r=o(t("./core")):"function"==typeof define&&define.amd?define(["./core"],o):o(n.CryptoJS)},{"./core":52}],58:[function(t,e,r){var n,o;n=this,o=function(t){return t},"object"==typeof r?e.exports=r=o(t("./core"),t("./x64-core"),t("./lib-typedarrays"),t("./enc-utf16"),t("./enc-base64"),t("./md5"),t("./sha1"),t("./sha256"),t("./sha224"),t("./sha512"),t("./sha384"),t("./sha3"),t("./ripemd160"),t("./hmac"),t("./pbkdf2"),t("./evpkdf"),t("./cipher-core"),t("./mode-cfb"),t("./mode-ctr"),t("./mode-ctr-gladman"),t("./mode-ofb"),t("./mode-ecb"),t("./pad-ansix923"),t("./pad-iso10126"),t("./pad-iso97971"),t("./pad-zeropadding"),t("./pad-nopadding"),t("./format-hex"),t("./aes"),t("./tripledes"),t("./rc4"),t("./rabbit"),t("./rabbit-legacy")):"function"==typeof define&&define.amd?define(["./core","./x64-core","./lib-typedarrays","./enc-utf16","./enc-base64","./md5","./sha1","./sha256","./sha224","./sha512","./sha384","./sha3","./ripemd160","./hmac","./pbkdf2","./evpkdf","./cipher-core","./mode-cfb","./mode-ctr","./mode-ctr-gladman","./mode-ofb","./mode-ecb","./pad-ansix923","./pad-iso10126","./pad-iso97971","./pad-zeropadding","./pad-nopadding","./format-hex","./aes","./tripledes","./rc4","./rabbit","./rabbit-legacy"],o):n.CryptoJS=o(n.CryptoJS)},{"./aes":50,"./cipher-core":51,"./core":52,"./enc-base64":53,"./enc-utf16":54,"./evpkdf":55,"./format-hex":56,"./hmac":57,"./lib-typedarrays":59,"./md5":60,"./mode-cfb":61,"./mode-ctr":63,"./mode-ctr-gladman":62,"./mode-ecb":64,"./mode-ofb":65,"./pad-ansix923":66,"./pad-iso10126":67,"./pad-iso97971":68,"./pad-nopadding":69,"./pad-zeropadding":70,"./pbkdf2":71,"./rabbit":73,"./rabbit-legacy":72,"./rc4":74,"./ripemd160":75,"./sha1":76,"./sha224":77,"./sha256":78,"./sha3":79,"./sha384":80,"./sha512":81,"./tripledes":82,"./x64-core":83}],59:[function(t,e,r){var n,o;n=this,o=function(t){return function(){if("function"==typeof ArrayBuffer){var e=t.lib.WordArray,r=e.init;(e.init=function(t){if(t instanceof ArrayBuffer&&(t=new Uint8Array(t)),(t instanceof Int8Array||"undefined"!=typeof Uint8ClampedArray&&t instanceof Uint8ClampedArray||t instanceof Int16Array||t instanceof Uint16Array||t instanceof Int32Array||t instanceof Uint32Array||t instanceof Float32Array||t instanceof Float64Array)&&(t=new Uint8Array(t.buffer,t.byteOffset,t.byteLength)),t instanceof Uint8Array){for(var e=t.byteLength,n=[],o=0;o<e;o++)n[o>>>2]|=t[o]<<24-o%4*8;r.call(this,n,e)}else r.apply(this,arguments)}).prototype=e}}(),t.lib.WordArray},"object"==typeof r?e.exports=r=o(t("./core")):"function"==typeof define&&define.amd?define(["./core"],o):o(n.CryptoJS)},{"./core":52}],60:[function(t,e,r){var n,o;n=this,o=function(t){return function(e){var r=t,n=r.lib,o=n.WordArray,i=n.Hasher,a=r.algo,s=[];!function(){for(var t=0;t<64;t++)s[t]=4294967296*e.abs(e.sin(t+1))|0}();var c=a.MD5=i.extend({_doReset:function(){this._hash=new o.init([1732584193,4023233417,2562383102,271733878])},_doProcessBlock:function(t,e){for(var r=0;r<16;r++){var n=e+r,o=t[n];t[n]=16711935&(o<<8|o>>>24)|4278255360&(o<<24|o>>>8)}var i=this._hash.words,a=t[e+0],c=t[e+1],h=t[e+2],d=t[e+3],m=t[e+4],y=t[e+5],g=t[e+6],v=t[e+7],b=t[e+8],_=t[e+9],w=t[e+10],x=t[e+11],k=t[e+12],B=t[e+13],S=t[e+14],A=t[e+15],C=i[0],F=i[1],O=i[2],I=i[3];F=p(F=p(F=p(F=p(F=l(F=l(F=l(F=l(F=f(F=f(F=f(F=f(F=u(F=u(F=u(F=u(F,O=u(O,I=u(I,C=u(C,F,O,I,a,7,s[0]),F,O,c,12,s[1]),C,F,h,17,s[2]),I,C,d,22,s[3]),O=u(O,I=u(I,C=u(C,F,O,I,m,7,s[4]),F,O,y,12,s[5]),C,F,g,17,s[6]),I,C,v,22,s[7]),O=u(O,I=u(I,C=u(C,F,O,I,b,7,s[8]),F,O,_,12,s[9]),C,F,w,17,s[10]),I,C,x,22,s[11]),O=u(O,I=u(I,C=u(C,F,O,I,k,7,s[12]),F,O,B,12,s[13]),C,F,S,17,s[14]),I,C,A,22,s[15]),O=f(O,I=f(I,C=f(C,F,O,I,c,5,s[16]),F,O,g,9,s[17]),C,F,x,14,s[18]),I,C,a,20,s[19]),O=f(O,I=f(I,C=f(C,F,O,I,y,5,s[20]),F,O,w,9,s[21]),C,F,A,14,s[22]),I,C,m,20,s[23]),O=f(O,I=f(I,C=f(C,F,O,I,_,5,s[24]),F,O,S,9,s[25]),C,F,d,14,s[26]),I,C,b,20,s[27]),O=f(O,I=f(I,C=f(C,F,O,I,B,5,s[28]),F,O,h,9,s[29]),C,F,v,14,s[30]),I,C,k,20,s[31]),O=l(O,I=l(I,C=l(C,F,O,I,y,4,s[32]),F,O,b,11,s[33]),C,F,x,16,s[34]),I,C,S,23,s[35]),O=l(O,I=l(I,C=l(C,F,O,I,c,4,s[36]),F,O,m,11,s[37]),C,F,v,16,s[38]),I,C,w,23,s[39]),O=l(O,I=l(I,C=l(C,F,O,I,B,4,s[40]),F,O,a,11,s[41]),C,F,d,16,s[42]),I,C,g,23,s[43]),O=l(O,I=l(I,C=l(C,F,O,I,_,4,s[44]),F,O,k,11,s[45]),C,F,A,16,s[46]),I,C,h,23,s[47]),O=p(O,I=p(I,C=p(C,F,O,I,a,6,s[48]),F,O,v,10,s[49]),C,F,S,15,s[50]),I,C,y,21,s[51]),O=p(O,I=p(I,C=p(C,F,O,I,k,6,s[52]),F,O,d,10,s[53]),C,F,w,15,s[54]),I,C,c,21,s[55]),O=p(O,I=p(I,C=p(C,F,O,I,b,6,s[56]),F,O,A,10,s[57]),C,F,g,15,s[58]),I,C,B,21,s[59]),O=p(O,I=p(I,C=p(C,F,O,I,m,6,s[60]),F,O,x,10,s[61]),C,F,h,15,s[62]),I,C,_,21,s[63]),i[0]=i[0]+C|0,i[1]=i[1]+F|0,i[2]=i[2]+O|0,i[3]=i[3]+I|0},_doFinalize:function(){var t=this._data,r=t.words,n=8*this._nDataBytes,o=8*t.sigBytes;r[o>>>5]|=128<<24-o%32;var i=e.floor(n/4294967296),a=n;r[15+(o+64>>>9<<4)]=16711935&(i<<8|i>>>24)|4278255360&(i<<24|i>>>8),r[14+(o+64>>>9<<4)]=16711935&(a<<8|a>>>24)|4278255360&(a<<24|a>>>8),t.sigBytes=4*(r.length+1),this._process();for(var s=this._hash,c=s.words,u=0;u<4;u++){var f=c[u];c[u]=16711935&(f<<8|f>>>24)|4278255360&(f<<24|f>>>8)}return s},clone:function(){var t=i.clone.call(this);return t._hash=this._hash.clone(),t}});function u(t,e,r,n,o,i,a){var s=t+(e&r|~e&n)+o+a;return(s<<i|s>>>32-i)+e}function f(t,e,r,n,o,i,a){var s=t+(e&n|r&~n)+o+a;return(s<<i|s>>>32-i)+e}function l(t,e,r,n,o,i,a){var s=t+(e^r^n)+o+a;return(s<<i|s>>>32-i)+e}function p(t,e,r,n,o,i,a){var s=t+(r^(e|~n))+o+a;return(s<<i|s>>>32-i)+e}r.MD5=i._createHelper(c),r.HmacMD5=i._createHmacHelper(c)}(Math),t.MD5},"object"==typeof r?e.exports=r=o(t("./core")):"function"==typeof define&&define.amd?define(["./core"],o):o(n.CryptoJS)},{"./core":52}],61:[function(t,e,r){var n,o;n=this,o=function(t){return t.mode.CFB=function(){var e=t.lib.BlockCipherMode.extend();function r(t,e,r,n){var o=this._iv;if(o){var i=o.slice(0);this._iv=void 0}else i=this._prevBlock;n.encryptBlock(i,0);for(var a=0;a<r;a++)t[e+a]^=i[a]}return e.Encryptor=e.extend({processBlock:function(t,e){var n=this._cipher,o=n.blockSize;r.call(this,t,e,o,n),this._prevBlock=t.slice(e,e+o)}}),e.Decryptor=e.extend({processBlock:function(t,e){var n=this._cipher,o=n.blockSize,i=t.slice(e,e+o);r.call(this,t,e,o,n),this._prevBlock=i}}),e}(),t.mode.CFB},"object"==typeof r?e.exports=r=o(t("./core"),t("./cipher-core")):"function"==typeof define&&define.amd?define(["./core","./cipher-core"],o):o(n.CryptoJS)},{"./cipher-core":51,"./core":52}],62:[function(t,e,r){var n,o;n=this,o=function(t){return t.mode.CTRGladman=function(){var e=t.lib.BlockCipherMode.extend();function r(t){if(255==(t>>24&255)){var e=t>>16&255,r=t>>8&255,n=255&t;255===e?(e=0,255===r?(r=0,255===n?n=0:++n):++r):++e,t=0,t+=e<<16,t+=r<<8,t+=n}else t+=1<<24;return t}var n=e.Encryptor=e.extend({processBlock:function(t,e){var n,o=this._cipher,i=o.blockSize,a=this._iv,s=this._counter;a&&(s=this._counter=a.slice(0),this._iv=void 0),0===((n=s)[0]=r(n[0]))&&(n[1]=r(n[1]));var c=s.slice(0);o.encryptBlock(c,0);for(var u=0;u<i;u++)t[e+u]^=c[u]}});return e.Decryptor=n,e}(),t.mode.CTRGladman},"object"==typeof r?e.exports=r=o(t("./core"),t("./cipher-core")):"function"==typeof define&&define.amd?define(["./core","./cipher-core"],o):o(n.CryptoJS)},{"./cipher-core":51,"./core":52}],63:[function(t,e,r){var n,o;n=this,o=function(t){var e,r;return t.mode.CTR=(e=t.lib.BlockCipherMode.extend(),r=e.Encryptor=e.extend({processBlock:function(t,e){var r=this._cipher,n=r.blockSize,o=this._iv,i=this._counter;o&&(i=this._counter=o.slice(0),this._iv=void 0);var a=i.slice(0);r.encryptBlock(a,0),i[n-1]=i[n-1]+1|0;for(var s=0;s<n;s++)t[e+s]^=a[s]}}),e.Decryptor=r,e),t.mode.CTR},"object"==typeof r?e.exports=r=o(t("./core"),t("./cipher-core")):"function"==typeof define&&define.amd?define(["./core","./cipher-core"],o):o(n.CryptoJS)},{"./cipher-core":51,"./core":52}],64:[function(t,e,r){var n,o;n=this,o=function(t){var e;return t.mode.ECB=((e=t.lib.BlockCipherMode.extend()).Encryptor=e.extend({processBlock:function(t,e){this._cipher.encryptBlock(t,e)}}),e.Decryptor=e.extend({processBlock:function(t,e){this._cipher.decryptBlock(t,e)}}),e),t.mode.ECB},"object"==typeof r?e.exports=r=o(t("./core"),t("./cipher-core")):"function"==typeof define&&define.amd?define(["./core","./cipher-core"],o):o(n.CryptoJS)},{"./cipher-core":51,"./core":52}],65:[function(t,e,r){var n,o;n=this,o=function(t){var e,r;return t.mode.OFB=(e=t.lib.BlockCipherMode.extend(),r=e.Encryptor=e.extend({processBlock:function(t,e){var r=this._cipher,n=r.blockSize,o=this._iv,i=this._keystream;o&&(i=this._keystream=o.slice(0),this._iv=void 0),r.encryptBlock(i,0);for(var a=0;a<n;a++)t[e+a]^=i[a]}}),e.Decryptor=r,e),t.mode.OFB},"object"==typeof r?e.exports=r=o(t("./core"),t("./cipher-core")):"function"==typeof define&&define.amd?define(["./core","./cipher-core"],o):o(n.CryptoJS)},{"./cipher-core":51,"./core":52}],66:[function(t,e,r){var n,o;n=this,o=function(t){return t.pad.AnsiX923={pad:function(t,e){var r=t.sigBytes,n=4*e,o=n-r%n,i=r+o-1;t.clamp(),t.words[i>>>2]|=o<<24-i%4*8,t.sigBytes+=o},unpad:function(t){var e=255&t.words[t.sigBytes-1>>>2];t.sigBytes-=e}},t.pad.Ansix923},"object"==typeof r?e.exports=r=o(t("./core"),t("./cipher-core")):"function"==typeof define&&define.amd?define(["./core","./cipher-core"],o):o(n.CryptoJS)},{"./cipher-core":51,"./core":52}],67:[function(t,e,r){var n,o;n=this,o=function(t){return t.pad.Iso10126={pad:function(e,r){var n=4*r,o=n-e.sigBytes%n;e.concat(t.lib.WordArray.random(o-1)).concat(t.lib.WordArray.create([o<<24],1))},unpad:function(t){var e=255&t.words[t.sigBytes-1>>>2];t.sigBytes-=e}},t.pad.Iso10126},"object"==typeof r?e.exports=r=o(t("./core"),t("./cipher-core")):"function"==typeof define&&define.amd?define(["./core","./cipher-core"],o):o(n.CryptoJS)},{"./cipher-core":51,"./core":52}],68:[function(t,e,r){var n,o;n=this,o=function(t){return t.pad.Iso97971={pad:function(e,r){e.concat(t.lib.WordArray.create([2147483648],1)),t.pad.ZeroPadding.pad(e,r)},unpad:function(e){t.pad.ZeroPadding.unpad(e),e.sigBytes--}},t.pad.Iso97971},"object"==typeof r?e.exports=r=o(t("./core"),t("./cipher-core")):"function"==typeof define&&define.amd?define(["./core","./cipher-core"],o):o(n.CryptoJS)},{"./cipher-core":51,"./core":52}],69:[function(t,e,r){var n,o;n=this,o=function(t){return t.pad.NoPadding={pad:function(){},unpad:function(){}},t.pad.NoPadding},"object"==typeof r?e.exports=r=o(t("./core"),t("./cipher-core")):"function"==typeof define&&define.amd?define(["./core","./cipher-core"],o):o(n.CryptoJS)},{"./cipher-core":51,"./core":52}],70:[function(t,e,r){var n,o;n=this,o=function(t){return t.pad.ZeroPadding={pad:function(t,e){var r=4*e;t.clamp(),t.sigBytes+=r-(t.sigBytes%r||r)},unpad:function(t){for(var e=t.words,r=t.sigBytes-1;!(e[r>>>2]>>>24-r%4*8&255);)r--;t.sigBytes=r+1}},t.pad.ZeroPadding},"object"==typeof r?e.exports=r=o(t("./core"),t("./cipher-core")):"function"==typeof define&&define.amd?define(["./core","./cipher-core"],o):o(n.CryptoJS)},{"./cipher-core":51,"./core":52}],71:[function(t,e,r){var n,o;n=this,o=function(t){var e,r,n,o,i,a,s,c;return r=(e=t).lib,n=r.Base,o=r.WordArray,i=e.algo,a=i.SHA1,s=i.HMAC,c=i.PBKDF2=n.extend({cfg:n.extend({keySize:4,hasher:a,iterations:1}),init:function(t){this.cfg=this.cfg.extend(t)},compute:function(t,e){for(var r=this.cfg,n=s.create(r.hasher,t),i=o.create(),a=o.create([1]),c=i.words,u=a.words,f=r.keySize,l=r.iterations;c.length<f;){var p=n.update(e).finalize(a);n.reset();for(var h=p.words,d=h.length,m=p,y=1;y<l;y++){m=n.finalize(m),n.reset();for(var g=m.words,v=0;v<d;v++)h[v]^=g[v]}i.concat(p),u[0]++}return i.sigBytes=4*f,i}}),e.PBKDF2=function(t,e,r){return c.create(r).compute(t,e)},t.PBKDF2},"object"==typeof r?e.exports=r=o(t("./core"),t("./sha1"),t("./hmac")):"function"==typeof define&&define.amd?define(["./core","./sha1","./hmac"],o):o(n.CryptoJS)},{"./core":52,"./hmac":57,"./sha1":76}],72:[function(t,e,r){var n,o;n=this,o=function(t){return function(){var e=t,r=e.lib.StreamCipher,n=e.algo,o=[],i=[],a=[],s=n.RabbitLegacy=r.extend({_doReset:function(){var t=this._key.words,e=this.cfg.iv,r=this._X=[t[0],t[3]<<16|t[2]>>>16,t[1],t[0]<<16|t[3]>>>16,t[2],t[1]<<16|t[0]>>>16,t[3],t[2]<<16|t[1]>>>16],n=this._C=[t[2]<<16|t[2]>>>16,4294901760&t[0]|65535&t[1],t[3]<<16|t[3]>>>16,4294901760&t[1]|65535&t[2],t[0]<<16|t[0]>>>16,4294901760&t[2]|65535&t[3],t[1]<<16|t[1]>>>16,4294901760&t[3]|65535&t[0]];this._b=0;for(var o=0;o<4;o++)c.call(this);for(o=0;o<8;o++)n[o]^=r[o+4&7];if(e){var i=e.words,a=i[0],s=i[1],u=16711935&(a<<8|a>>>24)|4278255360&(a<<24|a>>>8),f=16711935&(s<<8|s>>>24)|4278255360&(s<<24|s>>>8),l=u>>>16|4294901760&f,p=f<<16|65535&u;n[0]^=u,n[1]^=l,n[2]^=f,n[3]^=p,n[4]^=u,n[5]^=l,n[6]^=f,n[7]^=p;for(o=0;o<4;o++)c.call(this)}},_doProcessBlock:function(t,e){var r=this._X;c.call(this),o[0]=r[0]^r[5]>>>16^r[3]<<16,o[1]=r[2]^r[7]>>>16^r[5]<<16,o[2]=r[4]^r[1]>>>16^r[7]<<16,o[3]=r[6]^r[3]>>>16^r[1]<<16;for(var n=0;n<4;n++)o[n]=16711935&(o[n]<<8|o[n]>>>24)|4278255360&(o[n]<<24|o[n]>>>8),t[e+n]^=o[n]},blockSize:4,ivSize:2});function c(){for(var t=this._X,e=this._C,r=0;r<8;r++)i[r]=e[r];e[0]=e[0]+1295307597+this._b|0,e[1]=e[1]+3545052371+(e[0]>>>0<i[0]>>>0?1:0)|0,e[2]=e[2]+886263092+(e[1]>>>0<i[1]>>>0?1:0)|0,e[3]=e[3]+1295307597+(e[2]>>>0<i[2]>>>0?1:0)|0,e[4]=e[4]+3545052371+(e[3]>>>0<i[3]>>>0?1:0)|0,e[5]=e[5]+886263092+(e[4]>>>0<i[4]>>>0?1:0)|0,e[6]=e[6]+1295307597+(e[5]>>>0<i[5]>>>0?1:0)|0,e[7]=e[7]+3545052371+(e[6]>>>0<i[6]>>>0?1:0)|0,this._b=e[7]>>>0<i[7]>>>0?1:0;for(r=0;r<8;r++){var n=t[r]+e[r],o=65535&n,s=n>>>16,c=((o*o>>>17)+o*s>>>15)+s*s,u=((4294901760&n)*n|0)+((65535&n)*n|0);a[r]=c^u}t[0]=a[0]+(a[7]<<16|a[7]>>>16)+(a[6]<<16|a[6]>>>16)|0,t[1]=a[1]+(a[0]<<8|a[0]>>>24)+a[7]|0,t[2]=a[2]+(a[1]<<16|a[1]>>>16)+(a[0]<<16|a[0]>>>16)|0,t[3]=a[3]+(a[2]<<8|a[2]>>>24)+a[1]|0,t[4]=a[4]+(a[3]<<16|a[3]>>>16)+(a[2]<<16|a[2]>>>16)|0,t[5]=a[5]+(a[4]<<8|a[4]>>>24)+a[3]|0,t[6]=a[6]+(a[5]<<16|a[5]>>>16)+(a[4]<<16|a[4]>>>16)|0,t[7]=a[7]+(a[6]<<8|a[6]>>>24)+a[5]|0}e.RabbitLegacy=r._createHelper(s)}(),t.RabbitLegacy},"object"==typeof r?e.exports=r=o(t("./core"),t("./enc-base64"),t("./md5"),t("./evpkdf"),t("./cipher-core")):"function"==typeof define&&define.amd?define(["./core","./enc-base64","./md5","./evpkdf","./cipher-core"],o):o(n.CryptoJS)},{"./cipher-core":51,"./core":52,"./enc-base64":53,"./evpkdf":55,"./md5":60}],73:[function(t,e,r){var n,o;n=this,o=function(t){return function(){var e=t,r=e.lib.StreamCipher,n=e.algo,o=[],i=[],a=[],s=n.Rabbit=r.extend({_doReset:function(){for(var t=this._key.words,e=this.cfg.iv,r=0;r<4;r++)t[r]=16711935&(t[r]<<8|t[r]>>>24)|4278255360&(t[r]<<24|t[r]>>>8);var n=this._X=[t[0],t[3]<<16|t[2]>>>16,t[1],t[0]<<16|t[3]>>>16,t[2],t[1]<<16|t[0]>>>16,t[3],t[2]<<16|t[1]>>>16],o=this._C=[t[2]<<16|t[2]>>>16,4294901760&t[0]|65535&t[1],t[3]<<16|t[3]>>>16,4294901760&t[1]|65535&t[2],t[0]<<16|t[0]>>>16,4294901760&t[2]|65535&t[3],t[1]<<16|t[1]>>>16,4294901760&t[3]|65535&t[0]];this._b=0;for(r=0;r<4;r++)c.call(this);for(r=0;r<8;r++)o[r]^=n[r+4&7];if(e){var i=e.words,a=i[0],s=i[1],u=16711935&(a<<8|a>>>24)|4278255360&(a<<24|a>>>8),f=16711935&(s<<8|s>>>24)|4278255360&(s<<24|s>>>8),l=u>>>16|4294901760&f,p=f<<16|65535&u;o[0]^=u,o[1]^=l,o[2]^=f,o[3]^=p,o[4]^=u,o[5]^=l,o[6]^=f,o[7]^=p;for(r=0;r<4;r++)c.call(this)}},_doProcessBlock:function(t,e){var r=this._X;c.call(this),o[0]=r[0]^r[5]>>>16^r[3]<<16,o[1]=r[2]^r[7]>>>16^r[5]<<16,o[2]=r[4]^r[1]>>>16^r[7]<<16,o[3]=r[6]^r[3]>>>16^r[1]<<16;for(var n=0;n<4;n++)o[n]=16711935&(o[n]<<8|o[n]>>>24)|4278255360&(o[n]<<24|o[n]>>>8),t[e+n]^=o[n]},blockSize:4,ivSize:2});function c(){for(var t=this._X,e=this._C,r=0;r<8;r++)i[r]=e[r];e[0]=e[0]+1295307597+this._b|0,e[1]=e[1]+3545052371+(e[0]>>>0<i[0]>>>0?1:0)|0,e[2]=e[2]+886263092+(e[1]>>>0<i[1]>>>0?1:0)|0,e[3]=e[3]+1295307597+(e[2]>>>0<i[2]>>>0?1:0)|0,e[4]=e[4]+3545052371+(e[3]>>>0<i[3]>>>0?1:0)|0,e[5]=e[5]+886263092+(e[4]>>>0<i[4]>>>0?1:0)|0,e[6]=e[6]+1295307597+(e[5]>>>0<i[5]>>>0?1:0)|0,e[7]=e[7]+3545052371+(e[6]>>>0<i[6]>>>0?1:0)|0,this._b=e[7]>>>0<i[7]>>>0?1:0;for(r=0;r<8;r++){var n=t[r]+e[r],o=65535&n,s=n>>>16,c=((o*o>>>17)+o*s>>>15)+s*s,u=((4294901760&n)*n|0)+((65535&n)*n|0);a[r]=c^u}t[0]=a[0]+(a[7]<<16|a[7]>>>16)+(a[6]<<16|a[6]>>>16)|0,t[1]=a[1]+(a[0]<<8|a[0]>>>24)+a[7]|0,t[2]=a[2]+(a[1]<<16|a[1]>>>16)+(a[0]<<16|a[0]>>>16)|0,t[3]=a[3]+(a[2]<<8|a[2]>>>24)+a[1]|0,t[4]=a[4]+(a[3]<<16|a[3]>>>16)+(a[2]<<16|a[2]>>>16)|0,t[5]=a[5]+(a[4]<<8|a[4]>>>24)+a[3]|0,t[6]=a[6]+(a[5]<<16|a[5]>>>16)+(a[4]<<16|a[4]>>>16)|0,t[7]=a[7]+(a[6]<<8|a[6]>>>24)+a[5]|0}e.Rabbit=r._createHelper(s)}(),t.Rabbit},"object"==typeof r?e.exports=r=o(t("./core"),t("./enc-base64"),t("./md5"),t("./evpkdf"),t("./cipher-core")):"function"==typeof define&&define.amd?define(["./core","./enc-base64","./md5","./evpkdf","./cipher-core"],o):o(n.CryptoJS)},{"./cipher-core":51,"./core":52,"./enc-base64":53,"./evpkdf":55,"./md5":60}],74:[function(t,e,r){var n,o;n=this,o=function(t){return function(){var e=t,r=e.lib.StreamCipher,n=e.algo,o=n.RC4=r.extend({_doReset:function(){for(var t=this._key,e=t.words,r=t.sigBytes,n=this._S=[],o=0;o<256;o++)n[o]=o;o=0;for(var i=0;o<256;o++){var a=o%r,s=e[a>>>2]>>>24-a%4*8&255;i=(i+n[o]+s)%256;var c=n[o];n[o]=n[i],n[i]=c}this._i=this._j=0},_doProcessBlock:function(t,e){t[e]^=i.call(this)},keySize:8,ivSize:0});function i(){for(var t=this._S,e=this._i,r=this._j,n=0,o=0;o<4;o++){r=(r+t[e=(e+1)%256])%256;var i=t[e];t[e]=t[r],t[r]=i,n|=t[(t[e]+t[r])%256]<<24-8*o}return this._i=e,this._j=r,n}e.RC4=r._createHelper(o);var a=n.RC4Drop=o.extend({cfg:o.cfg.extend({drop:192}),_doReset:function(){o._doReset.call(this);for(var t=this.cfg.drop;t>0;t--)i.call(this)}});e.RC4Drop=r._createHelper(a)}(),t.RC4},"object"==typeof r?e.exports=r=o(t("./core"),t("./enc-base64"),t("./md5"),t("./evpkdf"),t("./cipher-core")):"function"==typeof define&&define.amd?define(["./core","./enc-base64","./md5","./evpkdf","./cipher-core"],o):o(n.CryptoJS)},{"./cipher-core":51,"./core":52,"./enc-base64":53,"./evpkdf":55,"./md5":60}],75:[function(t,e,r){var n,o;n=this,o=function(t){return function(e){var r=t,n=r.lib,o=n.WordArray,i=n.Hasher,a=r.algo,s=o.create([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,7,4,13,1,10,6,15,3,12,0,9,5,2,14,11,8,3,10,14,4,9,15,8,1,2,7,0,6,13,11,5,12,1,9,11,10,0,8,12,4,13,3,7,15,14,5,6,2,4,0,5,9,7,12,2,10,14,1,3,8,11,6,15,13]),c=o.create([5,14,7,0,9,2,11,4,13,6,15,8,1,10,3,12,6,11,3,7,0,13,5,10,14,15,8,12,4,9,1,2,15,5,1,3,7,14,6,9,11,8,12,2,10,0,4,13,8,6,4,1,3,11,15,0,5,12,2,13,9,7,10,14,12,15,10,4,1,5,8,7,6,2,13,14,0,3,9,11]),u=o.create([11,14,15,12,5,8,7,9,11,13,14,15,6,7,9,8,7,6,8,13,11,9,7,15,7,12,15,9,11,7,13,12,11,13,6,7,14,9,13,15,14,8,13,6,5,12,7,5,11,12,14,15,14,15,9,8,9,14,5,6,8,6,5,12,9,15,5,11,6,8,13,12,5,12,13,14,11,8,5,6]),f=o.create([8,9,9,11,13,15,15,5,7,7,8,11,14,14,12,6,9,13,15,7,12,8,9,11,7,7,12,7,6,15,13,11,9,7,15,11,8,6,6,14,12,13,5,14,13,13,7,5,15,5,8,11,14,14,6,14,6,9,12,9,12,5,15,8,8,5,12,9,12,5,14,6,8,13,6,5,15,13,11,11]),l=o.create([0,1518500249,1859775393,2400959708,2840853838]),p=o.create([1352829926,1548603684,1836072691,2053994217,0]),h=a.RIPEMD160=i.extend({_doReset:function(){this._hash=o.create([1732584193,4023233417,2562383102,271733878,3285377520])},_doProcessBlock:function(t,e){for(var r=0;r<16;r++){var n=e+r,o=t[n];t[n]=16711935&(o<<8|o>>>24)|4278255360&(o<<24|o>>>8)}var i,a,h,_,w,x,k,B,S,A,C,F=this._hash.words,O=l.words,I=p.words,N=s.words,T=c.words,P=u.words,D=f.words;x=i=F[0],k=a=F[1],B=h=F[2],S=_=F[3],A=w=F[4];for(r=0;r<80;r+=1)C=i+t[e+N[r]]|0,C+=r<16?d(a,h,_)+O[0]:r<32?m(a,h,_)+O[1]:r<48?y(a,h,_)+O[2]:r<64?g(a,h,_)+O[3]:v(a,h,_)+O[4],C=(C=b(C|=0,P[r]))+w|0,i=w,w=_,_=b(h,10),h=a,a=C,C=x+t[e+T[r]]|0,C+=r<16?v(k,B,S)+I[0]:r<32?g(k,B,S)+I[1]:r<48?y(k,B,S)+I[2]:r<64?m(k,B,S)+I[3]:d(k,B,S)+I[4],C=(C=b(C|=0,D[r]))+A|0,x=A,A=S,S=b(B,10),B=k,k=C;C=F[1]+h+S|0,F[1]=F[2]+_+A|0,F[2]=F[3]+w+x|0,F[3]=F[4]+i+k|0,F[4]=F[0]+a+B|0,F[0]=C},_doFinalize:function(){var t=this._data,e=t.words,r=8*this._nDataBytes,n=8*t.sigBytes;e[n>>>5]|=128<<24-n%32,e[14+(n+64>>>9<<4)]=16711935&(r<<8|r>>>24)|4278255360&(r<<24|r>>>8),t.sigBytes=4*(e.length+1),this._process();for(var o=this._hash,i=o.words,a=0;a<5;a++){var s=i[a];i[a]=16711935&(s<<8|s>>>24)|4278255360&(s<<24|s>>>8)}return o},clone:function(){var t=i.clone.call(this);return t._hash=this._hash.clone(),t}});function d(t,e,r){return t^e^r}function m(t,e,r){return t&e|~t&r}function y(t,e,r){return(t|~e)^r}function g(t,e,r){return t&r|e&~r}function v(t,e,r){return t^(e|~r)}function b(t,e){return t<<e|t>>>32-e}r.RIPEMD160=i._createHelper(h),r.HmacRIPEMD160=i._createHmacHelper(h)}(Math),t.RIPEMD160},"object"==typeof r?e.exports=r=o(t("./core")):"function"==typeof define&&define.amd?define(["./core"],o):o(n.CryptoJS)},{"./core":52}],76:[function(t,e,r){var n,o;n=this,o=function(t){var e,r,n,o,i,a,s;return r=(e=t).lib,n=r.WordArray,o=r.Hasher,i=e.algo,a=[],s=i.SHA1=o.extend({_doReset:function(){this._hash=new n.init([1732584193,4023233417,2562383102,271733878,3285377520])},_doProcessBlock:function(t,e){for(var r=this._hash.words,n=r[0],o=r[1],i=r[2],s=r[3],c=r[4],u=0;u<80;u++){if(u<16)a[u]=0|t[e+u];else{var f=a[u-3]^a[u-8]^a[u-14]^a[u-16];a[u]=f<<1|f>>>31}var l=(n<<5|n>>>27)+c+a[u];l+=u<20?1518500249+(o&i|~o&s):u<40?1859775393+(o^i^s):u<60?(o&i|o&s|i&s)-1894007588:(o^i^s)-899497514,c=s,s=i,i=o<<30|o>>>2,o=n,n=l}r[0]=r[0]+n|0,r[1]=r[1]+o|0,r[2]=r[2]+i|0,r[3]=r[3]+s|0,r[4]=r[4]+c|0},_doFinalize:function(){var t=this._data,e=t.words,r=8*this._nDataBytes,n=8*t.sigBytes;return e[n>>>5]|=128<<24-n%32,e[14+(n+64>>>9<<4)]=Math.floor(r/4294967296),e[15+(n+64>>>9<<4)]=r,t.sigBytes=4*e.length,this._process(),this._hash},clone:function(){var t=o.clone.call(this);return t._hash=this._hash.clone(),t}}),e.SHA1=o._createHelper(s),e.HmacSHA1=o._createHmacHelper(s),t.SHA1},"object"==typeof r?e.exports=r=o(t("./core")):"function"==typeof define&&define.amd?define(["./core"],o):o(n.CryptoJS)},{"./core":52}],77:[function(t,e,r){var n,o;n=this,o=function(t){var e,r,n,o,i;return r=(e=t).lib.WordArray,n=e.algo,o=n.SHA256,i=n.SHA224=o.extend({_doReset:function(){this._hash=new r.init([3238371032,914150663,812702999,4144912697,4290775857,1750603025,1694076839,3204075428])},_doFinalize:function(){var t=o._doFinalize.call(this);return t.sigBytes-=4,t}}),e.SHA224=o._createHelper(i),e.HmacSHA224=o._createHmacHelper(i),t.SHA224},"object"==typeof r?e.exports=r=o(t("./core"),t("./sha256")):"function"==typeof define&&define.amd?define(["./core","./sha256"],o):o(n.CryptoJS)},{"./core":52,"./sha256":78}],78:[function(t,e,r){var n,o;n=this,o=function(t){return function(e){var r=t,n=r.lib,o=n.WordArray,i=n.Hasher,a=r.algo,s=[],c=[];!function(){function t(t){for(var r=e.sqrt(t),n=2;n<=r;n++)if(!(t%n))return!1;return!0}function r(t){return 4294967296*(t-(0|t))|0}for(var n=2,o=0;o<64;)t(n)&&(o<8&&(s[o]=r(e.pow(n,.5))),c[o]=r(e.pow(n,1/3)),o++),n++}();var u=[],f=a.SHA256=i.extend({_doReset:function(){this._hash=new o.init(s.slice(0))},_doProcessBlock:function(t,e){for(var r=this._hash.words,n=r[0],o=r[1],i=r[2],a=r[3],s=r[4],f=r[5],l=r[6],p=r[7],h=0;h<64;h++){if(h<16)u[h]=0|t[e+h];else{var d=u[h-15],m=(d<<25|d>>>7)^(d<<14|d>>>18)^d>>>3,y=u[h-2],g=(y<<15|y>>>17)^(y<<13|y>>>19)^y>>>10;u[h]=m+u[h-7]+g+u[h-16]}var v=n&o^n&i^o&i,b=(n<<30|n>>>2)^(n<<19|n>>>13)^(n<<10|n>>>22),_=p+((s<<26|s>>>6)^(s<<21|s>>>11)^(s<<7|s>>>25))+(s&f^~s&l)+c[h]+u[h];p=l,l=f,f=s,s=a+_|0,a=i,i=o,o=n,n=_+(b+v)|0}r[0]=r[0]+n|0,r[1]=r[1]+o|0,r[2]=r[2]+i|0,r[3]=r[3]+a|0,r[4]=r[4]+s|0,r[5]=r[5]+f|0,r[6]=r[6]+l|0,r[7]=r[7]+p|0},_doFinalize:function(){var t=this._data,r=t.words,n=8*this._nDataBytes,o=8*t.sigBytes;return r[o>>>5]|=128<<24-o%32,r[14+(o+64>>>9<<4)]=e.floor(n/4294967296),r[15+(o+64>>>9<<4)]=n,t.sigBytes=4*r.length,this._process(),this._hash},clone:function(){var t=i.clone.call(this);return t._hash=this._hash.clone(),t}});r.SHA256=i._createHelper(f),r.HmacSHA256=i._createHmacHelper(f)}(Math),t.SHA256},"object"==typeof r?e.exports=r=o(t("./core")):"function"==typeof define&&define.amd?define(["./core"],o):o(n.CryptoJS)},{"./core":52}],79:[function(t,e,r){var n,o;n=this,o=function(t){return function(e){var r=t,n=r.lib,o=n.WordArray,i=n.Hasher,a=r.x64.Word,s=r.algo,c=[],u=[],f=[];!function(){for(var t=1,e=0,r=0;r<24;r++){c[t+5*e]=(r+1)*(r+2)/2%64;var n=(2*t+3*e)%5;t=e%5,e=n}for(t=0;t<5;t++)for(e=0;e<5;e++)u[t+5*e]=e+(2*t+3*e)%5*5;for(var o=1,i=0;i<24;i++){for(var s=0,l=0,p=0;p<7;p++){if(1&o){var h=(1<<p)-1;h<32?l^=1<<h:s^=1<<h-32}128&o?o=o<<1^113:o<<=1}f[i]=a.create(s,l)}}();var l=[];!function(){for(var t=0;t<25;t++)l[t]=a.create()}();var p=s.SHA3=i.extend({cfg:i.cfg.extend({outputLength:512}),_doReset:function(){for(var t=this._state=[],e=0;e<25;e++)t[e]=new a.init;this.blockSize=(1600-2*this.cfg.outputLength)/32},_doProcessBlock:function(t,e){for(var r=this._state,n=this.blockSize/2,o=0;o<n;o++){var i=t[e+2*o],a=t[e+2*o+1];i=16711935&(i<<8|i>>>24)|4278255360&(i<<24|i>>>8),a=16711935&(a<<8|a>>>24)|4278255360&(a<<24|a>>>8),(F=r[o]).high^=a,F.low^=i}for(var s=0;s<24;s++){for(var p=0;p<5;p++){for(var h=0,d=0,m=0;m<5;m++){h^=(F=r[p+5*m]).high,d^=F.low}var y=l[p];y.high=h,y.low=d}for(p=0;p<5;p++){var g=l[(p+4)%5],v=l[(p+1)%5],b=v.high,_=v.low;for(h=g.high^(b<<1|_>>>31),d=g.low^(_<<1|b>>>31),m=0;m<5;m++){(F=r[p+5*m]).high^=h,F.low^=d}}for(var w=1;w<25;w++){var x=(F=r[w]).high,k=F.low,B=c[w];if(B<32)h=x<<B|k>>>32-B,d=k<<B|x>>>32-B;else h=k<<B-32|x>>>64-B,d=x<<B-32|k>>>64-B;var S=l[u[w]];S.high=h,S.low=d}var A=l[0],C=r[0];A.high=C.high,A.low=C.low;for(p=0;p<5;p++)for(m=0;m<5;m++){var F=r[w=p+5*m],O=l[w],I=l[(p+1)%5+5*m],N=l[(p+2)%5+5*m];F.high=O.high^~I.high&N.high,F.low=O.low^~I.low&N.low}F=r[0];var T=f[s];F.high^=T.high,F.low^=T.low}},_doFinalize:function(){var t=this._data,r=t.words,n=(this._nDataBytes,8*t.sigBytes),i=32*this.blockSize;r[n>>>5]|=1<<24-n%32,r[(e.ceil((n+1)/i)*i>>>5)-1]|=128,t.sigBytes=4*r.length,this._process();for(var a=this._state,s=this.cfg.outputLength/8,c=s/8,u=[],f=0;f<c;f++){var l=a[f],p=l.high,h=l.low;p=16711935&(p<<8|p>>>24)|4278255360&(p<<24|p>>>8),h=16711935&(h<<8|h>>>24)|4278255360&(h<<24|h>>>8),u.push(h),u.push(p)}return new o.init(u,s)},clone:function(){for(var t=i.clone.call(this),e=t._state=this._state.slice(0),r=0;r<25;r++)e[r]=e[r].clone();return t}});r.SHA3=i._createHelper(p),r.HmacSHA3=i._createHmacHelper(p)}(Math),t.SHA3},"object"==typeof r?e.exports=r=o(t("./core"),t("./x64-core")):"function"==typeof define&&define.amd?define(["./core","./x64-core"],o):o(n.CryptoJS)},{"./core":52,"./x64-core":83}],80:[function(t,e,r){var n,o;n=this,o=function(t){var e,r,n,o,i,a,s;return r=(e=t).x64,n=r.Word,o=r.WordArray,i=e.algo,a=i.SHA512,s=i.SHA384=a.extend({_doReset:function(){this._hash=new o.init([new n.init(3418070365,3238371032),new n.init(1654270250,914150663),new n.init(2438529370,812702999),new n.init(355462360,4144912697),new n.init(1731405415,4290775857),new n.init(2394180231,1750603025),new n.init(3675008525,1694076839),new n.init(1203062813,3204075428)])},_doFinalize:function(){var t=a._doFinalize.call(this);return t.sigBytes-=16,t}}),e.SHA384=a._createHelper(s),e.HmacSHA384=a._createHmacHelper(s),t.SHA384},"object"==typeof r?e.exports=r=o(t("./core"),t("./x64-core"),t("./sha512")):"function"==typeof define&&define.amd?define(["./core","./x64-core","./sha512"],o):o(n.CryptoJS)},{"./core":52,"./sha512":81,"./x64-core":83}],81:[function(t,e,r){var n,o;n=this,o=function(t){return function(){var e=t,r=e.lib.Hasher,n=e.x64,o=n.Word,i=n.WordArray,a=e.algo;function s(){return o.create.apply(o,arguments)}var c=[s(1116352408,3609767458),s(1899447441,602891725),s(3049323471,3964484399),s(3921009573,2173295548),s(961987163,4081628472),s(1508970993,3053834265),s(2453635748,2937671579),s(2870763221,3664609560),s(3624381080,2734883394),s(310598401,1164996542),s(607225278,1323610764),s(1426881987,3590304994),s(1925078388,4068182383),s(2162078206,991336113),s(2614888103,633803317),s(3248222580,3479774868),s(3835390401,2666613458),s(4022224774,944711139),s(264347078,2341262773),s(604807628,2007800933),s(770255983,1495990901),s(1249150122,1856431235),s(1555081692,3175218132),s(1996064986,2198950837),s(2554220882,3999719339),s(2821834349,766784016),s(2952996808,2566594879),s(3210313671,3203337956),s(3336571891,1034457026),s(3584528711,2466948901),s(113926993,3758326383),s(338241895,168717936),s(666307205,1188179964),s(773529912,1546045734),s(1294757372,1522805485),s(1396182291,2643833823),s(1695183700,2343527390),s(1986661051,1014477480),s(2177026350,1206759142),s(2456956037,344077627),s(2730485921,1290863460),s(2820302411,3158454273),s(3259730800,3505952657),s(3345764771,106217008),s(3516065817,3606008344),s(3600352804,1432725776),s(4094571909,1467031594),s(275423344,851169720),s(430227734,3100823752),s(506948616,1363258195),s(659060556,3750685593),s(883997877,3785050280),s(958139571,3318307427),s(1322822218,3812723403),s(1537002063,2003034995),s(1747873779,3602036899),s(1955562222,1575990012),s(2024104815,1125592928),s(2227730452,2716904306),s(2361852424,442776044),s(2428436474,593698344),s(2756734187,3733110249),s(3204031479,2999351573),s(3329325298,3815920427),s(3391569614,3928383900),s(3515267271,566280711),s(3940187606,3454069534),s(4118630271,4000239992),s(116418474,1914138554),s(174292421,2731055270),s(289380356,3203993006),s(460393269,320620315),s(685471733,587496836),s(852142971,1086792851),s(1017036298,365543100),s(1126000580,2618297676),s(1288033470,3409855158),s(1501505948,4234509866),s(1607167915,987167468),s(1816402316,1246189591)],u=[];!function(){for(var t=0;t<80;t++)u[t]=s()}();var f=a.SHA512=r.extend({_doReset:function(){this._hash=new i.init([new o.init(1779033703,4089235720),new o.init(3144134277,2227873595),new o.init(1013904242,4271175723),new o.init(2773480762,1595750129),new o.init(1359893119,2917565137),new o.init(2600822924,725511199),new o.init(528734635,4215389547),new o.init(1541459225,327033209)])},_doProcessBlock:function(t,e){for(var r=this._hash.words,n=r[0],o=r[1],i=r[2],a=r[3],s=r[4],f=r[5],l=r[6],p=r[7],h=n.high,d=n.low,m=o.high,y=o.low,g=i.high,v=i.low,b=a.high,_=a.low,w=s.high,x=s.low,k=f.high,B=f.low,S=l.high,A=l.low,C=p.high,F=p.low,O=h,I=d,N=m,T=y,P=g,D=v,R=b,E=_,M=w,H=x,j=k,q=B,z=S,L=A,U=C,W=F,J=0;J<80;J++){var K=u[J];if(J<16)var G=K.high=0|t[e+2*J],X=K.low=0|t[e+2*J+1];else{var $=u[J-15],V=$.high,Z=$.low,Y=(V>>>1|Z<<31)^(V>>>8|Z<<24)^V>>>7,Q=(Z>>>1|V<<31)^(Z>>>8|V<<24)^(Z>>>7|V<<25),tt=u[J-2],et=tt.high,rt=tt.low,nt=(et>>>19|rt<<13)^(et<<3|rt>>>29)^et>>>6,ot=(rt>>>19|et<<13)^(rt<<3|et>>>29)^(rt>>>6|et<<26),it=u[J-7],at=it.high,st=it.low,ct=u[J-16],ut=ct.high,ft=ct.low;G=(G=(G=Y+at+((X=Q+st)>>>0<Q>>>0?1:0))+nt+((X=X+ot)>>>0<ot>>>0?1:0))+ut+((X=X+ft)>>>0<ft>>>0?1:0);K.high=G,K.low=X}var lt,pt=M&j^~M&z,ht=H&q^~H&L,dt=O&N^O&P^N&P,mt=I&T^I&D^T&D,yt=(O>>>28|I<<4)^(O<<30|I>>>2)^(O<<25|I>>>7),gt=(I>>>28|O<<4)^(I<<30|O>>>2)^(I<<25|O>>>7),vt=(M>>>14|H<<18)^(M>>>18|H<<14)^(M<<23|H>>>9),bt=(H>>>14|M<<18)^(H>>>18|M<<14)^(H<<23|M>>>9),_t=c[J],wt=_t.high,xt=_t.low,kt=U+vt+((lt=W+bt)>>>0<W>>>0?1:0),Bt=gt+mt;U=z,W=L,z=j,L=q,j=M,q=H,M=R+(kt=(kt=(kt=kt+pt+((lt=lt+ht)>>>0<ht>>>0?1:0))+wt+((lt=lt+xt)>>>0<xt>>>0?1:0))+G+((lt=lt+X)>>>0<X>>>0?1:0))+((H=E+lt|0)>>>0<E>>>0?1:0)|0,R=P,E=D,P=N,D=T,N=O,T=I,O=kt+(yt+dt+(Bt>>>0<gt>>>0?1:0))+((I=lt+Bt|0)>>>0<lt>>>0?1:0)|0}d=n.low=d+I,n.high=h+O+(d>>>0<I>>>0?1:0),y=o.low=y+T,o.high=m+N+(y>>>0<T>>>0?1:0),v=i.low=v+D,i.high=g+P+(v>>>0<D>>>0?1:0),_=a.low=_+E,a.high=b+R+(_>>>0<E>>>0?1:0),x=s.low=x+H,s.high=w+M+(x>>>0<H>>>0?1:0),B=f.low=B+q,f.high=k+j+(B>>>0<q>>>0?1:0),A=l.low=A+L,l.high=S+z+(A>>>0<L>>>0?1:0),F=p.low=F+W,p.high=C+U+(F>>>0<W>>>0?1:0)},_doFinalize:function(){var t=this._data,e=t.words,r=8*this._nDataBytes,n=8*t.sigBytes;return e[n>>>5]|=128<<24-n%32,e[30+(n+128>>>10<<5)]=Math.floor(r/4294967296),e[31+(n+128>>>10<<5)]=r,t.sigBytes=4*e.length,this._process(),this._hash.toX32()},clone:function(){var t=r.clone.call(this);return t._hash=this._hash.clone(),t},blockSize:32});e.SHA512=r._createHelper(f),e.HmacSHA512=r._createHmacHelper(f)}(),t.SHA512},"object"==typeof r?e.exports=r=o(t("./core"),t("./x64-core")):"function"==typeof define&&define.amd?define(["./core","./x64-core"],o):o(n.CryptoJS)},{"./core":52,"./x64-core":83}],82:[function(t,e,r){var n,o;n=this,o=function(t){return function(){var e=t,r=e.lib,n=r.WordArray,o=r.BlockCipher,i=e.algo,a=[57,49,41,33,25,17,9,1,58,50,42,34,26,18,10,2,59,51,43,35,27,19,11,3,60,52,44,36,63,55,47,39,31,23,15,7,62,54,46,38,30,22,14,6,61,53,45,37,29,21,13,5,28,20,12,4],s=[14,17,11,24,1,5,3,28,15,6,21,10,23,19,12,4,26,8,16,7,27,20,13,2,41,52,31,37,47,55,30,40,51,45,33,48,44,49,39,56,34,53,46,42,50,36,29,32],c=[1,2,4,6,8,10,12,14,15,17,19,21,23,25,27,28],u=[{0:8421888,268435456:32768,536870912:8421378,805306368:2,1073741824:512,1342177280:8421890,1610612736:8389122,1879048192:8388608,2147483648:514,2415919104:8389120,2684354560:33280,2952790016:8421376,3221225472:32770,3489660928:8388610,3758096384:0,4026531840:33282,134217728:0,402653184:8421890,671088640:33282,939524096:32768,1207959552:8421888,1476395008:512,1744830464:8421378,2013265920:2,2281701376:8389120,2550136832:33280,2818572288:8421376,3087007744:8389122,3355443200:8388610,3623878656:32770,3892314112:514,4160749568:8388608,1:32768,268435457:2,536870913:8421888,805306369:8388608,1073741825:8421378,1342177281:33280,1610612737:512,1879048193:8389122,2147483649:8421890,2415919105:8421376,2684354561:8388610,2952790017:33282,3221225473:514,3489660929:8389120,3758096385:32770,4026531841:0,134217729:8421890,402653185:8421376,671088641:8388608,939524097:512,1207959553:32768,1476395009:8388610,1744830465:2,2013265921:33282,2281701377:32770,2550136833:8389122,2818572289:514,3087007745:8421888,3355443201:8389120,3623878657:0,3892314113:33280,4160749569:8421378},{0:1074282512,16777216:16384,33554432:524288,50331648:1074266128,67108864:1073741840,83886080:1074282496,100663296:1073758208,117440512:16,134217728:540672,150994944:1073758224,167772160:1073741824,184549376:540688,201326592:524304,218103808:0,234881024:16400,251658240:1074266112,8388608:1073758208,25165824:540688,41943040:16,58720256:1073758224,75497472:1074282512,92274688:1073741824,109051904:524288,125829120:1074266128,142606336:524304,159383552:0,176160768:16384,192937984:1074266112,209715200:1073741840,226492416:540672,243269632:1074282496,260046848:16400,268435456:0,285212672:1074266128,301989888:1073758224,318767104:1074282496,335544320:1074266112,352321536:16,369098752:540688,385875968:16384,402653184:16400,419430400:524288,436207616:524304,452984832:1073741840,469762048:540672,486539264:1073758208,503316480:1073741824,520093696:1074282512,276824064:540688,293601280:524288,310378496:1074266112,327155712:16384,343932928:1073758208,360710144:1074282512,377487360:16,394264576:1073741824,411041792:1074282496,427819008:1073741840,444596224:1073758224,461373440:524304,478150656:0,494927872:16400,511705088:1074266128,528482304:540672},{0:260,1048576:0,2097152:67109120,3145728:65796,4194304:65540,5242880:67108868,6291456:67174660,7340032:67174400,8388608:67108864,9437184:67174656,10485760:65792,11534336:67174404,12582912:67109124,13631488:65536,14680064:4,15728640:256,524288:67174656,1572864:67174404,2621440:0,3670016:67109120,4718592:67108868,5767168:65536,6815744:65540,7864320:260,8912896:4,9961472:256,11010048:67174400,12058624:65796,13107200:65792,14155776:67109124,15204352:67174660,16252928:67108864,16777216:67174656,17825792:65540,18874368:65536,19922944:67109120,20971520:256,22020096:67174660,23068672:67108868,24117248:0,25165824:67109124,26214400:67108864,27262976:4,28311552:65792,29360128:67174400,30408704:260,31457280:65796,32505856:67174404,17301504:67108864,18350080:260,19398656:67174656,20447232:0,21495808:65540,22544384:67109120,23592960:256,24641536:67174404,25690112:65536,26738688:67174660,27787264:65796,28835840:67108868,29884416:67109124,30932992:67174400,31981568:4,33030144:65792},{0:2151682048,65536:2147487808,131072:4198464,196608:2151677952,262144:0,327680:4198400,393216:2147483712,458752:4194368,524288:2147483648,589824:4194304,655360:64,720896:2147487744,786432:2151678016,851968:4160,917504:4096,983040:2151682112,32768:2147487808,98304:64,163840:2151678016,229376:2147487744,294912:4198400,360448:2151682112,425984:0,491520:2151677952,557056:4096,622592:2151682048,688128:4194304,753664:4160,819200:2147483648,884736:4194368,950272:4198464,1015808:2147483712,1048576:4194368,1114112:4198400,1179648:2147483712,1245184:0,1310720:4160,1376256:2151678016,1441792:2151682048,1507328:2147487808,1572864:2151682112,1638400:2147483648,1703936:2151677952,1769472:4198464,1835008:2147487744,1900544:4194304,1966080:64,2031616:4096,1081344:2151677952,1146880:2151682112,1212416:0,1277952:4198400,1343488:4194368,1409024:2147483648,1474560:2147487808,1540096:64,1605632:2147483712,1671168:4096,1736704:2147487744,1802240:2151678016,1867776:4160,1933312:2151682048,1998848:4194304,2064384:4198464},{0:128,4096:17039360,8192:262144,12288:536870912,16384:537133184,20480:16777344,24576:553648256,28672:262272,32768:16777216,36864:537133056,40960:536871040,45056:553910400,49152:553910272,53248:0,57344:17039488,61440:553648128,2048:17039488,6144:553648256,10240:128,14336:17039360,18432:262144,22528:537133184,26624:553910272,30720:536870912,34816:537133056,38912:0,43008:553910400,47104:16777344,51200:536871040,55296:553648128,59392:16777216,63488:262272,65536:262144,69632:128,73728:536870912,77824:553648256,81920:16777344,86016:553910272,90112:537133184,94208:16777216,98304:553910400,102400:553648128,106496:17039360,110592:537133056,114688:262272,118784:536871040,122880:0,126976:17039488,67584:553648256,71680:16777216,75776:17039360,79872:537133184,83968:536870912,88064:17039488,92160:128,96256:553910272,100352:262272,104448:553910400,108544:0,112640:553648128,116736:16777344,120832:262144,124928:537133056,129024:536871040},{0:268435464,256:8192,512:270532608,768:270540808,1024:268443648,1280:2097152,1536:2097160,1792:268435456,2048:0,2304:268443656,2560:2105344,2816:8,3072:270532616,3328:2105352,3584:8200,3840:270540800,128:270532608,384:270540808,640:8,896:2097152,1152:2105352,1408:268435464,1664:268443648,1920:8200,2176:2097160,2432:8192,2688:268443656,2944:270532616,3200:0,3456:270540800,3712:2105344,3968:268435456,4096:268443648,4352:270532616,4608:270540808,4864:8200,5120:2097152,5376:268435456,5632:268435464,5888:2105344,6144:2105352,6400:0,6656:8,6912:270532608,7168:8192,7424:268443656,7680:270540800,7936:2097160,4224:8,4480:2105344,4736:2097152,4992:268435464,5248:268443648,5504:8200,5760:270540808,6016:270532608,6272:270540800,6528:270532616,6784:8192,7040:2105352,7296:2097160,7552:0,7808:268435456,8064:268443656},{0:1048576,16:33555457,32:1024,48:1049601,64:34604033,80:0,96:1,112:34603009,128:33555456,144:1048577,160:33554433,176:34604032,192:34603008,208:1025,224:1049600,240:33554432,8:34603009,24:0,40:33555457,56:34604032,72:1048576,88:33554433,104:33554432,120:1025,136:1049601,152:33555456,168:34603008,184:1048577,200:1024,216:34604033,232:1,248:1049600,256:33554432,272:1048576,288:33555457,304:34603009,320:1048577,336:33555456,352:34604032,368:1049601,384:1025,400:34604033,416:1049600,432:1,448:0,464:34603008,480:33554433,496:1024,264:1049600,280:33555457,296:34603009,312:1,328:33554432,344:1048576,360:1025,376:34604032,392:33554433,408:34603008,424:0,440:34604033,456:1049601,472:1024,488:33555456,504:1048577},{0:134219808,1:131072,2:134217728,3:32,4:131104,5:134350880,6:134350848,7:2048,8:134348800,9:134219776,10:133120,11:134348832,12:2080,13:0,14:134217760,15:133152,2147483648:2048,2147483649:134350880,2147483650:134219808,2147483651:134217728,2147483652:134348800,2147483653:133120,2147483654:133152,2147483655:32,2147483656:134217760,2147483657:2080,2147483658:131104,2147483659:134350848,2147483660:0,2147483661:134348832,2147483662:134219776,2147483663:131072,16:133152,17:134350848,18:32,19:2048,20:134219776,21:134217760,22:134348832,23:131072,24:0,25:131104,26:134348800,27:134219808,28:134350880,29:133120,30:2080,31:134217728,2147483664:131072,2147483665:2048,2147483666:134348832,2147483667:133152,2147483668:32,2147483669:134348800,2147483670:134217728,2147483671:134219808,2147483672:134350880,2147483673:134217760,2147483674:134219776,2147483675:0,2147483676:133120,2147483677:2080,2147483678:131104,2147483679:134350848}],f=[4160749569,528482304,33030144,2064384,129024,8064,504,2147483679],l=i.DES=o.extend({_doReset:function(){for(var t=this._key.words,e=[],r=0;r<56;r++){var n=a[r]-1;e[r]=t[n>>>5]>>>31-n%32&1}for(var o=this._subKeys=[],i=0;i<16;i++){var u=o[i]=[],f=c[i];for(r=0;r<24;r++)u[r/6|0]|=e[(s[r]-1+f)%28]<<31-r%6,u[4+(r/6|0)]|=e[28+(s[r+24]-1+f)%28]<<31-r%6;u[0]=u[0]<<1|u[0]>>>31;for(r=1;r<7;r++)u[r]=u[r]>>>4*(r-1)+3;u[7]=u[7]<<5|u[7]>>>27}var l=this._invSubKeys=[];for(r=0;r<16;r++)l[r]=o[15-r]},encryptBlock:function(t,e){this._doCryptBlock(t,e,this._subKeys)},decryptBlock:function(t,e){this._doCryptBlock(t,e,this._invSubKeys)},_doCryptBlock:function(t,e,r){this._lBlock=t[e],this._rBlock=t[e+1],p.call(this,4,252645135),p.call(this,16,65535),h.call(this,2,858993459),h.call(this,8,16711935),p.call(this,1,1431655765);for(var n=0;n<16;n++){for(var o=r[n],i=this._lBlock,a=this._rBlock,s=0,c=0;c<8;c++)s|=u[c][((a^o[c])&f[c])>>>0];this._lBlock=a,this._rBlock=i^s}var l=this._lBlock;this._lBlock=this._rBlock,this._rBlock=l,p.call(this,1,1431655765),h.call(this,8,16711935),h.call(this,2,858993459),p.call(this,16,65535),p.call(this,4,252645135),t[e]=this._lBlock,t[e+1]=this._rBlock},keySize:2,ivSize:2,blockSize:2});function p(t,e){var r=(this._lBlock>>>t^this._rBlock)&e;this._rBlock^=r,this._lBlock^=r<<t}function h(t,e){var r=(this._rBlock>>>t^this._lBlock)&e;this._lBlock^=r,this._rBlock^=r<<t}e.DES=o._createHelper(l);var d=i.TripleDES=o.extend({_doReset:function(){var t=this._key.words;this._des1=l.createEncryptor(n.create(t.slice(0,2))),this._des2=l.createEncryptor(n.create(t.slice(2,4))),this._des3=l.createEncryptor(n.create(t.slice(4,6)))},encryptBlock:function(t,e){this._des1.encryptBlock(t,e),this._des2.decryptBlock(t,e),this._des3.encryptBlock(t,e)},decryptBlock:function(t,e){this._des3.decryptBlock(t,e),this._des2.encryptBlock(t,e),this._des1.decryptBlock(t,e)},keySize:6,ivSize:2,blockSize:2});e.TripleDES=o._createHelper(d)}(),t.TripleDES},"object"==typeof r?e.exports=r=o(t("./core"),t("./enc-base64"),t("./md5"),t("./evpkdf"),t("./cipher-core")):"function"==typeof define&&define.amd?define(["./core","./enc-base64","./md5","./evpkdf","./cipher-core"],o):o(n.CryptoJS)},{"./cipher-core":51,"./core":52,"./enc-base64":53,"./evpkdf":55,"./md5":60}],83:[function(t,e,r){var n,o;n=this,o=function(t){var e,r,n,o,i;return r=(e=t).lib,n=r.Base,o=r.WordArray,(i=e.x64={}).Word=n.extend({init:function(t,e){this.high=t,this.low=e}}),i.WordArray=n.extend({init:function(t,e){t=this.words=t||[],this.sigBytes=null!=e?e:8*t.length},toX32:function(){for(var t=this.words,e=t.length,r=[],n=0;n<e;n++){var i=t[n];r.push(i.high),r.push(i.low)}return o.create(r,this.sigBytes)},clone:function(){for(var t=n.clone.call(this),e=t.words=this.words.slice(0),r=e.length,o=0;o<r;o++)e[o]=e[o].clone();return t}}),t},"object"==typeof r?e.exports=r=o(t("./core")):"function"==typeof define&&define.amd?define(["./core"],o):o(n.CryptoJS)},{"./core":52}],84:[function(t,e,r){!function(t){var n="object"==typeof r&&r,o="object"==typeof e&&e&&e.exports==n&&e,i="object"==typeof global&&global;i.global!==i&&i.window!==i||(t=i);var a,s,c,u=String.fromCharCode;function f(t){for(var e,r,n=[],o=0,i=t.length;o<i;)(e=t.charCodeAt(o++))>=55296&&e<=56319&&o<i?56320==(64512&(r=t.charCodeAt(o++)))?n.push(((1023&e)<<10)+(1023&r)+65536):(n.push(e),o--):n.push(e);return n}function l(t){if(t>=55296&&t<=57343)throw Error("Lone surrogate U+"+t.toString(16).toUpperCase()+" is not a scalar value")}function p(t,e){return u(t>>e&63|128)}function h(t){if(0==(4294967168&t))return u(t);var e="";return 0==(4294965248&t)?e=u(t>>6&31|192):0==(4294901760&t)?(l(t),e=u(t>>12&15|224),e+=p(t,6)):0==(4292870144&t)&&(e=u(t>>18&7|240),e+=p(t,12),e+=p(t,6)),e+=u(63&t|128)}function d(){if(c>=s)throw Error("Invalid byte index");var t=255&a[c];if(c++,128==(192&t))return 63&t;throw Error("Invalid continuation byte")}function m(){var t,e;if(c>s)throw Error("Invalid byte index");if(c==s)return!1;if(t=255&a[c],c++,0==(128&t))return t;if(192==(224&t)){if((e=(31&t)<<6|d())>=128)return e;throw Error("Invalid continuation byte")}if(224==(240&t)){if((e=(15&t)<<12|d()<<6|d())>=2048)return l(e),e;throw Error("Invalid continuation byte")}if(240==(248&t)&&(e=(7&t)<<18|d()<<12|d()<<6|d())>=65536&&e<=1114111)return e;throw Error("Invalid UTF-8 detected")}var y={version:"2.1.2",encode:function(t){for(var e=f(t),r=e.length,n=-1,o="";++n<r;)o+=h(e[n]);return o},decode:function(t){a=f(t),s=a.length,c=0;for(var e,r=[];!1!==(e=m());)r.push(e);return function(t){for(var e,r=t.length,n=-1,o="";++n<r;)(e=t[n])>65535&&(o+=u((e-=65536)>>>10&1023|55296),e=56320|1023&e),o+=u(e);return o}(r)}};if("function"==typeof define&&"object"==typeof define.amd&&define.amd)define(function(){return y});else if(n&&!n.nodeType)if(o)o.exports=y;else{var g={}.hasOwnProperty;for(var v in y)g.call(y,v)&&(n[v]=y[v])}else t.utf8=y}(this)},{}],85:[function(t,e,r){e.exports=XMLHttpRequest},{}],"bignumber.js":[function(t,e,r){!function(t){"use strict";var r,n=/^-?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i,o=Math.ceil,i=Math.floor,a=" not a boolean or binary digit",s="rounding mode",c="number type has more than 15 significant digits",u="0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_",f=1e14,l=14,p=9007199254740991,h=[1,10,100,1e3,1e4,1e5,1e6,1e7,1e8,1e9,1e10,1e11,1e12,1e13],d=1e7,m=1e9;function y(t){var e=0|t;return t>0||t===e?e:e-1}function g(t){for(var e,r,n=1,o=t.length,i=t[0]+"";n<o;){for(e=t[n++]+"",r=l-e.length;r--;e="0"+e);i+=e}for(o=i.length;48===i.charCodeAt(--o););return i.slice(0,o+1||1)}function v(t,e){var r,n,o=t.c,i=e.c,a=t.s,s=e.s,c=t.e,u=e.e;if(!a||!s)return null;if(r=o&&!o[0],n=i&&!i[0],r||n)return r?n?0:-s:a;if(a!=s)return a;if(r=a<0,n=c==u,!o||!i)return n?0:!o^r?1:-1;if(!n)return c>u^r?1:-1;for(s=(c=o.length)<(u=i.length)?c:u,a=0;a<s;a++)if(o[a]!=i[a])return o[a]>i[a]^r?1:-1;return c==u?0:c>u^r?1:-1}function b(t,e,r){return(t=B(t))>=e&&t<=r}function _(t){return"[object Array]"==Object.prototype.toString.call(t)}function w(t,e,r){for(var n,o,i=[0],a=0,s=t.length;a<s;){for(o=i.length;o--;i[o]*=e);for(i[n=0]+=u.indexOf(t.charAt(a++));n<i.length;n++)i[n]>r-1&&(null==i[n+1]&&(i[n+1]=0),i[n+1]+=i[n]/r|0,i[n]%=r)}return i.reverse()}function x(t,e){return(t.length>1?t.charAt(0)+"."+t.slice(1):t)+(e<0?"e":"e+")+e}function k(t,e){var r,n;if(e<0){for(n="0.";++e;n+="0");t=n+t}else if(++e>(r=t.length)){for(n="0",e-=r;--e;n+="0");t+=n}else e<r&&(t=t.slice(0,e)+"."+t.slice(e));return t}function B(t){return(t=parseFloat(t))<0?o(t):i(t)}(r=function t(e){var r,S,A,C,F,O,I,N,T,P=0,D=X.prototype,R=new X(1),E=20,M=4,H=-7,j=21,q=-1e7,z=1e7,L=!0,U=Y,W=!1,J=1,K=0,G={decimalSeparator:".",groupSeparator:",",groupSize:3,secondaryGroupSize:0,fractionGroupSeparator:" ",fractionGroupSize:0};function X(t,e){var r,o,a,s,f,h,d=this;if(!(d instanceof X))return L&&tt(26,"constructor call without new",t),new X(t,e);if(null!=e&&U(e,2,64,P,"base")){if(h=t+"",10==(e|=0))return et(d=new X(t instanceof X?t:h),E+d.e+1,M);if((s="number"==typeof t)&&0*t!=0||!new RegExp("^-?"+(r="["+u.slice(0,e)+"]+")+"(?:\\."+r+")?$",e<37?"i":"").test(h))return S(d,h,s,e);s?(d.s=1/t<0?(h=h.slice(1),-1):1,L&&h.replace(/^0\.0*|\./,"").length>15&&tt(P,c,t),s=!1):d.s=45===h.charCodeAt(0)?(h=h.slice(1),-1):1,h=$(h,10,e,d.s)}else{if(t instanceof X)return d.s=t.s,d.e=t.e,d.c=(t=t.c)?t.slice():t,void(P=0);if((s="number"==typeof t)&&0*t==0){if(d.s=1/t<0?(t=-t,-1):1,t===~~t){for(o=0,a=t;a>=10;a/=10,o++);return d.e=o,d.c=[t],void(P=0)}h=t+""}else{if(!n.test(h=t+""))return S(d,h,s);d.s=45===h.charCodeAt(0)?(h=h.slice(1),-1):1}}for((o=h.indexOf("."))>-1&&(h=h.replace(".","")),(a=h.search(/e/i))>0?(o<0&&(o=a),o+=+h.slice(a+1),h=h.substring(0,a)):o<0&&(o=h.length),a=0;48===h.charCodeAt(a);a++);for(f=h.length;48===h.charCodeAt(--f););if(h=h.slice(a,f+1))if(f=h.length,s&&L&&f>15&&(t>p||t!==i(t))&&tt(P,c,d.s*t),(o=o-a-1)>z)d.c=d.e=null;else if(o<q)d.c=[d.e=0];else{if(d.e=o,d.c=[],a=(o+1)%l,o<0&&(a+=l),a<f){for(a&&d.c.push(+h.slice(0,a)),f-=l;a<f;)d.c.push(+h.slice(a,a+=l));h=h.slice(a),a=l-h.length}else a-=f;for(;a--;h+="0");d.c.push(+h)}else d.c=[d.e=0];P=0}function $(t,e,n,o){var i,a,s,c,f,l,p,h=t.indexOf("."),d=E,m=M;for(n<37&&(t=t.toLowerCase()),h>=0&&(s=K,K=0,t=t.replace(".",""),f=(p=new X(n)).pow(t.length-h),K=s,p.c=w(k(g(f.c),f.e),10,e),p.e=p.c.length),a=s=(l=w(t,n,e)).length;0==l[--s];l.pop());if(!l[0])return"0";if(h<0?--a:(f.c=l,f.e=a,f.s=o,l=(f=r(f,p,d,m,e)).c,c=f.r,a=f.e),h=l[i=a+d+1],s=e/2,c=c||i<0||null!=l[i+1],c=m<4?(null!=h||c)&&(0==m||m==(f.s<0?3:2)):h>s||h==s&&(4==m||c||6==m&&1&l[i-1]||m==(f.s<0?8:7)),i<1||!l[0])t=c?k("1",-d):"0";else{if(l.length=i,c)for(--e;++l[--i]>e;)l[i]=0,i||(++a,l=[1].concat(l));for(s=l.length;!l[--s];);for(h=0,t="";h<=s;t+=u.charAt(l[h++]));t=k(t,a)}return t}function V(t,e,r,n){var o,i,a,c,u;if(r=null!=r&&U(r,0,8,n,s)?0|r:M,!t.c)return t.toString();if(o=t.c[0],a=t.e,null==e)u=g(t.c),u=19==n||24==n&&a<=H?x(u,a):k(u,a);else if(i=(t=et(new X(t),e,r)).e,c=(u=g(t.c)).length,19==n||24==n&&(e<=i||i<=H)){for(;c<e;u+="0",c++);u=x(u,i)}else if(e-=a,u=k(u,i),i+1>c){if(--e>0)for(u+=".";e--;u+="0");}else if((e+=i-c)>0)for(i+1==c&&(u+=".");e--;u+="0");return t.s<0&&o?"-"+u:u}function Z(t,e){var r,n,o=0;for(_(t[0])&&(t=t[0]),r=new X(t[0]);++o<t.length;){if(!(n=new X(t[o])).s){r=n;break}e.call(r,n)&&(r=n)}return r}function Y(t,e,r,n,o){return(t<e||t>r||t!=B(t))&&tt(n,(o||"decimal places")+(t<e||t>r?" out of range":" not an integer"),t),!0}function Q(t,e,r){for(var n=1,o=e.length;!e[--o];e.pop());for(o=e[0];o>=10;o/=10,n++);return(r=n+r*l-1)>z?t.c=t.e=null:r<q?t.c=[t.e=0]:(t.e=r,t.c=e),t}function tt(t,e,r){var n=new Error(["new BigNumber","cmp","config","div","divToInt","eq","gt","gte","lt","lte","minus","mod","plus","precision","random","round","shift","times","toDigits","toExponential","toFixed","toFormat","toFraction","pow","toPrecision","toString","BigNumber"][t]+"() "+e+": "+r);throw n.name="BigNumber Error",P=0,n}function et(t,e,r,n){var a,s,c,u,p,d,m,y=t.c,g=h;if(y){t:{for(a=1,u=y[0];u>=10;u/=10,a++);if((s=e-a)<0)s+=l,c=e,m=(p=y[d=0])/g[a-c-1]%10|0;else if((d=o((s+1)/l))>=y.length){if(!n)break t;for(;y.length<=d;y.push(0));p=m=0,a=1,c=(s%=l)-l+1}else{for(p=u=y[d],a=1;u>=10;u/=10,a++);m=(c=(s%=l)-l+a)<0?0:p/g[a-c-1]%10|0}if(n=n||e<0||null!=y[d+1]||(c<0?p:p%g[a-c-1]),n=r<4?(m||n)&&(0==r||r==(t.s<0?3:2)):m>5||5==m&&(4==r||n||6==r&&(s>0?c>0?p/g[a-c]:0:y[d-1])%10&1||r==(t.s<0?8:7)),e<1||!y[0])return y.length=0,n?(e-=t.e+1,y[0]=g[(l-e%l)%l],t.e=-e||0):y[0]=t.e=0,t;if(0==s?(y.length=d,u=1,d--):(y.length=d+1,u=g[l-s],y[d]=c>0?i(p/g[a-c]%g[c])*u:0),n)for(;;){if(0==d){for(s=1,c=y[0];c>=10;c/=10,s++);for(c=y[0]+=u,u=1;c>=10;c/=10,u++);s!=u&&(t.e++,y[0]==f&&(y[0]=1));break}if(y[d]+=u,y[d]!=f)break;y[d--]=0,u=1}for(s=y.length;0===y[--s];y.pop());}t.e>z?t.c=t.e=null:t.e<q&&(t.c=[t.e=0])}return t}return X.another=t,X.ROUND_UP=0,X.ROUND_DOWN=1,X.ROUND_CEIL=2,X.ROUND_FLOOR=3,X.ROUND_HALF_UP=4,X.ROUND_HALF_DOWN=5,X.ROUND_HALF_EVEN=6,X.ROUND_HALF_CEIL=7,X.ROUND_HALF_FLOOR=8,X.EUCLID=9,X.config=X.set=function(){var t,e,r=0,n={},o=arguments,i=o[0],s=i&&"object"==typeof i?function(){if(i.hasOwnProperty(e))return null!=(t=i[e])}:function(){if(o.length>r)return null!=(t=o[r++])};return s(e="DECIMAL_PLACES")&&U(t,0,m,2,e)&&(E=0|t),n[e]=E,s(e="ROUNDING_MODE")&&U(t,0,8,2,e)&&(M=0|t),n[e]=M,s(e="EXPONENTIAL_AT")&&(_(t)?U(t[0],-m,0,2,e)&&U(t[1],0,m,2,e)&&(H=0|t[0],j=0|t[1]):U(t,-m,m,2,e)&&(H=-(j=0|(t<0?-t:t)))),n[e]=[H,j],s(e="RANGE")&&(_(t)?U(t[0],-m,-1,2,e)&&U(t[1],1,m,2,e)&&(q=0|t[0],z=0|t[1]):U(t,-m,m,2,e)&&(0|t?q=-(z=0|(t<0?-t:t)):L&&tt(2,e+" cannot be zero",t))),n[e]=[q,z],s(e="ERRORS")&&(t===!!t||1===t||0===t?(P=0,U=(L=!!t)?Y:b):L&&tt(2,e+a,t)),n[e]=L,s(e="CRYPTO")&&(!0===t||!1===t||1===t||0===t?t?!(t="undefined"==typeof crypto)&&crypto&&(crypto.getRandomValues||crypto.randomBytes)?W=!0:L?tt(2,"crypto unavailable",t?void 0:crypto):W=!1:W=!1:L&&tt(2,e+a,t)),n[e]=W,s(e="MODULO_MODE")&&U(t,0,9,2,e)&&(J=0|t),n[e]=J,s(e="POW_PRECISION")&&U(t,0,m,2,e)&&(K=0|t),n[e]=K,s(e="FORMAT")&&("object"==typeof t?G=t:L&&tt(2,e+" not an object",t)),n[e]=G,n},X.max=function(){return Z(arguments,D.lt)},X.min=function(){return Z(arguments,D.gt)},X.random=(A=9007199254740992,C=Math.random()*A&2097151?function(){return i(Math.random()*A)}:function(){return 8388608*(1073741824*Math.random()|0)+(8388608*Math.random()|0)},function(t){var e,r,n,a,s,c=0,u=[],f=new X(R);if(t=null!=t&&U(t,0,m,14)?0|t:E,a=o(t/l),W)if(crypto.getRandomValues){for(e=crypto.getRandomValues(new Uint32Array(a*=2));c<a;)(s=131072*e[c]+(e[c+1]>>>11))>=9e15?(r=crypto.getRandomValues(new Uint32Array(2)),e[c]=r[0],e[c+1]=r[1]):(u.push(s%1e14),c+=2);c=a/2}else if(crypto.randomBytes){for(e=crypto.randomBytes(a*=7);c<a;)(s=281474976710656*(31&e[c])+1099511627776*e[c+1]+4294967296*e[c+2]+16777216*e[c+3]+(e[c+4]<<16)+(e[c+5]<<8)+e[c+6])>=9e15?crypto.randomBytes(7).copy(e,c):(u.push(s%1e14),c+=7);c=a/7}else W=!1,L&&tt(14,"crypto unavailable",crypto);if(!W)for(;c<a;)(s=C())<9e15&&(u[c++]=s%1e14);for(a=u[--c],t%=l,a&&t&&(s=h[l-t],u[c]=i(a/s)*s);0===u[c];u.pop(),c--);if(c<0)u=[n=0];else{for(n=-1;0===u[0];u.splice(0,1),n-=l);for(c=1,s=u[0];s>=10;s/=10,c++);c<l&&(n-=l-c)}return f.e=n,f.c=u,f}),r=function(){function t(t,e,r){var n,o,i,a,s=0,c=t.length,u=e%d,f=e/d|0;for(t=t.slice();c--;)s=((o=u*(i=t[c]%d)+(n=f*i+(a=t[c]/d|0)*u)%d*d+s)/r|0)+(n/d|0)+f*a,t[c]=o%r;return s&&(t=[s].concat(t)),t}function e(t,e,r,n){var o,i;if(r!=n)i=r>n?1:-1;else for(o=i=0;o<r;o++)if(t[o]!=e[o]){i=t[o]>e[o]?1:-1;break}return i}function r(t,e,r,n){for(var o=0;r--;)t[r]-=o,o=t[r]<e[r]?1:0,t[r]=o*n+t[r]-e[r];for(;!t[0]&&t.length>1;t.splice(0,1));}return function(n,o,a,s,c){var u,p,h,d,m,g,v,b,_,w,x,k,B,S,A,C,F,O=n.s==o.s?1:-1,I=n.c,N=o.c;if(!(I&&I[0]&&N&&N[0]))return new X(n.s&&o.s&&(I?!N||I[0]!=N[0]:N)?I&&0==I[0]||!N?0*O:O/0:NaN);for(_=(b=new X(O)).c=[],O=a+(p=n.e-o.e)+1,c||(c=f,p=y(n.e/l)-y(o.e/l),O=O/l|0),h=0;N[h]==(I[h]||0);h++);if(N[h]>(I[h]||0)&&p--,O<0)_.push(1),d=!0;else{for(S=I.length,C=N.length,h=0,O+=2,(m=i(c/(N[0]+1)))>1&&(N=t(N,m,c),I=t(I,m,c),C=N.length,S=I.length),B=C,x=(w=I.slice(0,C)).length;x<C;w[x++]=0);F=N.slice(),F=[0].concat(F),A=N[0],N[1]>=c/2&&A++;do{if(m=0,(u=e(N,w,C,x))<0){if(k=w[0],C!=x&&(k=k*c+(w[1]||0)),(m=i(k/A))>1)for(m>=c&&(m=c-1),v=(g=t(N,m,c)).length,x=w.length;1==e(g,w,v,x);)m--,r(g,C<v?F:N,v,c),v=g.length,u=1;else 0==m&&(u=m=1),v=(g=N.slice()).length;if(v<x&&(g=[0].concat(g)),r(w,g,x,c),x=w.length,-1==u)for(;e(N,w,C,x)<1;)m++,r(w,C<x?F:N,x,c),x=w.length}else 0===u&&(m++,w=[0]);_[h++]=m,w[0]?w[x++]=I[B]||0:(w=[I[B]],x=1)}while((B++<S||null!=w[0])&&O--);d=null!=w[0],_[0]||_.splice(0,1)}if(c==f){for(h=1,O=_[0];O>=10;O/=10,h++);et(b,a+(b.e=h+p*l-1)+1,s,d)}else b.e=p,b.r=+d;return b}}(),F=/^(-?)0([xbo])(?=\w[\w.]*$)/i,O=/^([^.]+)\.$/,I=/^\.([^.]+)$/,N=/^-?(Infinity|NaN)$/,T=/^\s*\+(?=[\w.])|^\s+|\s+$/g,S=function(t,e,r,n){var o,i=r?e:e.replace(T,"");if(N.test(i))t.s=isNaN(i)?null:i<0?-1:1;else{if(!r&&(i=i.replace(F,function(t,e,r){return o="x"==(r=r.toLowerCase())?16:"b"==r?2:8,n&&n!=o?t:e}),n&&(o=n,i=i.replace(O,"$1").replace(I,"0.$1")),e!=i))return new X(i,o);L&&tt(P,"not a"+(n?" base "+n:"")+" number",e),t.s=null}t.c=t.e=null,P=0},D.absoluteValue=D.abs=function(){var t=new X(this);return t.s<0&&(t.s=1),t},D.ceil=function(){return et(new X(this),this.e+1,2)},D.comparedTo=D.cmp=function(t,e){return P=1,v(this,new X(t,e))},D.decimalPlaces=D.dp=function(){var t,e,r=this.c;if(!r)return null;if(t=((e=r.length-1)-y(this.e/l))*l,e=r[e])for(;e%10==0;e/=10,t--);return t<0&&(t=0),t},D.dividedBy=D.div=function(t,e){return P=3,r(this,new X(t,e),E,M)},D.dividedToIntegerBy=D.divToInt=function(t,e){return P=4,r(this,new X(t,e),0,1)},D.equals=D.eq=function(t,e){return P=5,0===v(this,new X(t,e))},D.floor=function(){return et(new X(this),this.e+1,3)},D.greaterThan=D.gt=function(t,e){return P=6,v(this,new X(t,e))>0},D.greaterThanOrEqualTo=D.gte=function(t,e){return P=7,1===(e=v(this,new X(t,e)))||0===e},D.isFinite=function(){return!!this.c},D.isInteger=D.isInt=function(){return!!this.c&&y(this.e/l)>this.c.length-2},D.isNaN=function(){return!this.s},D.isNegative=D.isNeg=function(){return this.s<0},D.isZero=function(){return!!this.c&&0==this.c[0]},D.lessThan=D.lt=function(t,e){return P=8,v(this,new X(t,e))<0},D.lessThanOrEqualTo=D.lte=function(t,e){return P=9,-1===(e=v(this,new X(t,e)))||0===e},D.minus=D.sub=function(t,e){var r,n,o,i,a=this,s=a.s;if(P=10,e=(t=new X(t,e)).s,!s||!e)return new X(NaN);if(s!=e)return t.s=-e,a.plus(t);var c=a.e/l,u=t.e/l,p=a.c,h=t.c;if(!c||!u){if(!p||!h)return p?(t.s=-e,t):new X(h?a:NaN);if(!p[0]||!h[0])return h[0]?(t.s=-e,t):new X(p[0]?a:3==M?-0:0)}if(c=y(c),u=y(u),p=p.slice(),s=c-u){for((i=s<0)?(s=-s,o=p):(u=c,o=h),o.reverse(),e=s;e--;o.push(0));o.reverse()}else for(n=(i=(s=p.length)<(e=h.length))?s:e,s=e=0;e<n;e++)if(p[e]!=h[e]){i=p[e]<h[e];break}if(i&&(o=p,p=h,h=o,t.s=-t.s),(e=(n=h.length)-(r=p.length))>0)for(;e--;p[r++]=0);for(e=f-1;n>s;){if(p[--n]<h[n]){for(r=n;r&&!p[--r];p[r]=e);--p[r],p[n]+=f}p[n]-=h[n]}for(;0==p[0];p.splice(0,1),--u);return p[0]?Q(t,p,u):(t.s=3==M?-1:1,t.c=[t.e=0],t)},D.modulo=D.mod=function(t,e){var n,o,i=this;return P=11,t=new X(t,e),!i.c||!t.s||t.c&&!t.c[0]?new X(NaN):!t.c||i.c&&!i.c[0]?new X(i):(9==J?(o=t.s,t.s=1,n=r(i,t,0,3),t.s=o,n.s*=o):n=r(i,t,0,J),i.minus(n.times(t)))},D.negated=D.neg=function(){var t=new X(this);return t.s=-t.s||null,t},D.plus=D.add=function(t,e){var r,n=this,o=n.s;if(P=12,e=(t=new X(t,e)).s,!o||!e)return new X(NaN);if(o!=e)return t.s=-e,n.minus(t);var i=n.e/l,a=t.e/l,s=n.c,c=t.c;if(!i||!a){if(!s||!c)return new X(o/0);if(!s[0]||!c[0])return c[0]?t:new X(s[0]?n:0*o)}if(i=y(i),a=y(a),s=s.slice(),o=i-a){for(o>0?(a=i,r=c):(o=-o,r=s),r.reverse();o--;r.push(0));r.reverse()}for((o=s.length)-(e=c.length)<0&&(r=c,c=s,s=r,e=o),o=0;e;)o=(s[--e]=s[e]+c[e]+o)/f|0,s[e]=f===s[e]?0:s[e]%f;return o&&(s=[o].concat(s),++a),Q(t,s,a)},D.precision=D.sd=function(t){var e,r,n=this.c;if(null!=t&&t!==!!t&&1!==t&&0!==t&&(L&&tt(13,"argument"+a,t),t!=!!t&&(t=null)),!n)return null;if(e=(r=n.length-1)*l+1,r=n[r]){for(;r%10==0;r/=10,e--);for(r=n[0];r>=10;r/=10,e++);}return t&&this.e+1>e&&(e=this.e+1),e},D.round=function(t,e){var r=new X(this);return(null==t||U(t,0,m,15))&&et(r,~~t+this.e+1,null!=e&&U(e,0,8,15,s)?0|e:M),r},D.shift=function(t){var e=this;return U(t,-p,p,16,"argument")?e.times("1e"+B(t)):new X(e.c&&e.c[0]&&(t<-p||t>p)?e.s*(t<0?0:1/0):e)},D.squareRoot=D.sqrt=function(){var t,e,n,o,i,a=this,s=a.c,c=a.s,u=a.e,f=E+4,l=new X("0.5");if(1!==c||!s||!s[0])return new X(!c||c<0&&(!s||s[0])?NaN:s?a:1/0);if(0==(c=Math.sqrt(+a))||c==1/0?(((e=g(s)).length+u)%2==0&&(e+="0"),c=Math.sqrt(e),u=y((u+1)/2)-(u<0||u%2),n=new X(e=c==1/0?"1e"+u:(e=c.toExponential()).slice(0,e.indexOf("e")+1)+u)):n=new X(c+""),n.c[0])for((c=(u=n.e)+f)<3&&(c=0);;)if(i=n,n=l.times(i.plus(r(a,i,f,1))),g(i.c).slice(0,c)===(e=g(n.c)).slice(0,c)){if(n.e<u&&--c,"9999"!=(e=e.slice(c-3,c+1))&&(o||"4999"!=e)){+e&&(+e.slice(1)||"5"!=e.charAt(0))||(et(n,n.e+E+2,1),t=!n.times(n).eq(a));break}if(!o&&(et(i,i.e+E+2,0),i.times(i).eq(a))){n=i;break}f+=4,c+=4,o=1}return et(n,n.e+E+1,M,t)},D.times=D.mul=function(t,e){var r,n,o,i,a,s,c,u,p,h,m,g,v,b,_,w=this,x=w.c,k=(P=17,t=new X(t,e)).c;if(!(x&&k&&x[0]&&k[0]))return!w.s||!t.s||x&&!x[0]&&!k||k&&!k[0]&&!x?t.c=t.e=t.s=null:(t.s*=w.s,x&&k?(t.c=[0],t.e=0):t.c=t.e=null),t;for(n=y(w.e/l)+y(t.e/l),t.s*=w.s,(c=x.length)<(h=k.length)&&(v=x,x=k,k=v,o=c,c=h,h=o),o=c+h,v=[];o--;v.push(0));for(b=f,_=d,o=h;--o>=0;){for(r=0,m=k[o]%_,g=k[o]/_|0,i=o+(a=c);i>o;)r=((u=m*(u=x[--a]%_)+(s=g*u+(p=x[a]/_|0)*m)%_*_+v[i]+r)/b|0)+(s/_|0)+g*p,v[i--]=u%b;v[i]=r}return r?++n:v.splice(0,1),Q(t,v,n)},D.toDigits=function(t,e){var r=new X(this);return t=null!=t&&U(t,1,m,18,"precision")?0|t:null,e=null!=e&&U(e,0,8,18,s)?0|e:M,t?et(r,t,e):r},D.toExponential=function(t,e){return V(this,null!=t&&U(t,0,m,19)?1+~~t:null,e,19)},D.toFixed=function(t,e){return V(this,null!=t&&U(t,0,m,20)?~~t+this.e+1:null,e,20)},D.toFormat=function(t,e){var r=V(this,null!=t&&U(t,0,m,21)?~~t+this.e+1:null,e,21);if(this.c){var n,o=r.split("."),i=+G.groupSize,a=+G.secondaryGroupSize,s=G.groupSeparator,c=o[0],u=o[1],f=this.s<0,l=f?c.slice(1):c,p=l.length;if(a&&(n=i,i=a,a=n,p-=n),i>0&&p>0){for(n=p%i||i,c=l.substr(0,n);n<p;n+=i)c+=s+l.substr(n,i);a>0&&(c+=s+l.slice(n)),f&&(c="-"+c)}r=u?c+G.decimalSeparator+((a=+G.fractionGroupSize)?u.replace(new RegExp("\\d{"+a+"}\\B","g"),"$&"+G.fractionGroupSeparator):u):c}return r},D.toFraction=function(t){var e,n,o,i,a,s,c,u,f,p=L,d=this,m=d.c,y=new X(R),v=n=new X(R),b=c=new X(R);if(null!=t&&(L=!1,s=new X(t),L=p,(p=s.isInt())&&!s.lt(R)||(L&&tt(22,"max denominator "+(p?"out of range":"not an integer"),t),t=!p&&s.c&&et(s,s.e+1,1).gte(R)?s:null)),!m)return d.toString();for(f=g(m),i=y.e=f.length-d.e-1,y.c[0]=h[(a=i%l)<0?l+a:a],t=!t||s.cmp(y)>0?i>0?y:v:s,a=z,z=1/0,s=new X(f),c.c[0]=0;u=r(s,y,0,1),1!=(o=n.plus(u.times(b))).cmp(t);)n=b,b=o,v=c.plus(u.times(o=v)),c=o,y=s.minus(u.times(o=y)),s=o;return o=r(t.minus(n),b,0,1),c=c.plus(o.times(v)),n=n.plus(o.times(b)),c.s=v.s=d.s,e=r(v,b,i*=2,M).minus(d).abs().cmp(r(c,n,i,M).minus(d).abs())<1?[v.toString(),b.toString()]:[c.toString(),n.toString()],z=a,e},D.toNumber=function(){return+this},D.toPower=D.pow=function(t,e){var r,n,a,s=i(t<0?-t:+t),c=this;if(null!=e&&(P=23,e=new X(e)),!U(t,-p,p,23,"exponent")&&(!isFinite(t)||s>p&&(t/=0)||parseFloat(t)!=t&&!(t=NaN))||0==t)return r=Math.pow(+c,t),new X(e?r%e:r);for(e?t>1&&c.gt(R)&&c.isInt()&&e.gt(R)&&e.isInt()?c=c.mod(e):(a=e,e=null):K&&(r=o(K/l+2)),n=new X(R);;){if(s%2){if(!(n=n.times(c)).c)break;r?n.c.length>r&&(n.c.length=r):e&&(n=n.mod(e))}if(!(s=i(s/2)))break;c=c.times(c),r?c.c&&c.c.length>r&&(c.c.length=r):e&&(c=c.mod(e))}return e?n:(t<0&&(n=R.div(n)),a?n.mod(a):r?et(n,K,M):n)},D.toPrecision=function(t,e){return V(this,null!=t&&U(t,1,m,24,"precision")?0|t:null,e,24)},D.toString=function(t){var e,r=this.s,n=this.e;return null===n?r?(e="Infinity",r<0&&(e="-"+e)):e="NaN":(e=g(this.c),e=null!=t&&U(t,2,64,25,"base")?$(k(e,n),0|t,10,r):n<=H||n>=j?x(e,n):k(e,n),r<0&&this.c[0]&&(e="-"+e)),e},D.truncated=D.trunc=function(){return et(new X(this),this.e+1,1)},D.valueOf=D.toJSON=function(){var t,e=this.e;return null===e?this.toString():(t=g(this.c),t=e<=H||e>=j?x(t,e):k(t,e),this.s<0?"-"+t:t)},D.isBigNumber=!0,null!=e&&X.config(e),X}()).default=r.BigNumber=r,"function"==typeof define&&define.amd?define(function(){return r}):void 0!==e&&e.exports?e.exports=r:(t||(t="undefined"!=typeof self?self:Function("return this")()),t.BigNumber=r)}(this)},{}],web3:[function(t,e,r){var n=t("./lib/web3");"undefined"!=typeof window&&void 0===window.Web3&&(window.Web3=n),e.exports=n},{"./lib/web3":22}]},{},["web3"]);
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},_dereq_("buffer").Buffer)

},{"buffer":"/opt/panxf/metamask-extension/node_modules/_buffer@5.1.0@buffer/index.js"}],"/opt/panxf/metamask-extension/node_modules/_wrappy@1.0.2@wrappy/wrappy.js":[function(_dereq_,module,exports){
// Returns a wrapper function that returns a wrapped callback
// The wrapper function should do some stuff, and return a
// presumably different callback function.
// This makes sure that own properties are retained, so that
// decorations and such are not lost along the way.
module.exports = wrappy
function wrappy (fn, cb) {
  if (fn && cb) return wrappy(fn)(cb)

  if (typeof fn !== 'function')
    throw new TypeError('need wrapper function')

  Object.keys(fn).forEach(function (k) {
    wrapper[k] = fn[k]
  })

  return wrapper

  function wrapper() {
    var args = new Array(arguments.length)
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i]
    }
    var ret = fn.apply(this, args)
    var cb = args[args.length-1]
    if (typeof ret === 'function' && ret !== cb) {
      Object.keys(cb).forEach(function (k) {
        ret[k] = cb[k]
      })
    }
    return ret
  }
}

},{}],"/opt/panxf/metamask-extension/node_modules/_xtend@4.0.1@xtend/immutable.js":[function(_dereq_,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}]},{},["/opt/panxf/metamask-extension/app/scripts/inpage.js"])

//# sourceMappingURL=inpage.js.map
