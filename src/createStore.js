import $$observable from 'symbol-observable'

import ActionTypes from './utils/actionTypes'
import isPlainObject from './utils/isPlainObject'

/**
 * 创建一个Store
 *
 * @param {Function} reducer - 可以时单个reducer，也可以是通过`combineReducers`合并的reducers的集合
 *
 * @param {any} [preloadedState] - 初始的state,如果使用`combineReducers`，请务必将state初始为与之相同的键值结构（健：reducer的方法名；值：reducer返回的state）
 *
 * @param {Function} [enhancer] - 可以使用第三方增强器，或是使用redux唯一自带的增强器`applyMiddleware`
 * 接收createStore函数，返回一个新的createStore函数
 *
 * @returns {Store} - 返回store，通过它，你可以getState(获取state),dispatch(修改state),subscribe(订阅修改)
 */
export default function createStore(reducer, preloadedState, enhancer) {
  // 满足函数重载（overload），则将原第三参数与第二参数位置调换，并对第二参数赋予默认值（undefined）
  if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
    enhancer = preloadedState
    preloadedState = undefined
  }

  // 调用增强器，并重新返回新的createStore
  if (typeof enhancer !== 'undefined') {
    // 增强器类型错误，抛出异常
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.')
    }

    return enhancer(createStore)(reducer, preloadedState)
  }

  // reducer类型错误，抛出异常
  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.')
  }

  let currentReducer = reducer
  let currentState = preloadedState
  let currentListeners = []
  let nextListeners = currentListeners
  let isDispatching = false

  /**
   * 此处为了确保监听队列中所有的监听事件能够被调用，
   * 避免某个监听事件被移除时，导致正在执行的监听错误
   * */
  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice()
    }
  }

  /**
   * 读取Store的state.
   *
   * @returns {any} 返回当前的state
   */
  function getState() {
    // 如果`dispatch`正在执行，则不允许调用`getState`
    if (isDispatching) {
      throw new Error(
        'You may not call store.getState() while the reducer is executing. ' +
          'The reducer has already received the state as an argument. ' +
          'Pass it down from the top reducer instead of reading it from the store.'
      )
    }

    // 返回最新的state
    return currentState
  }

  /**
   * 添加监听器
   *
   * @param {Function} listener - 添加一个监听`dispatch`的函数回调
   * @returns {Function} 返回一个移除监听的函数
   */
  function subscribe(listener) {
    // 类型错误，抛出异常
    if (typeof listener !== 'function') {
      throw new Error('Expected the listener to be a function.')
    }

    // 如果`dispatch`正在执行，则不允许调用`subscribe`
    if (isDispatching) {
      throw new Error(
        'You may not call store.subscribe() while the reducer is executing. ' +
          'If you would like to be notified after the store has been updated, subscribe from a ' +
          'component and invoke store.getState() in the callback to access the latest state. ' +
          'See http://redux.js.org/docs/api/Store.html#subscribe for more details.'
      )
    }

    let isSubscribed = true

    // 添加新的监听回调
    ensureCanMutateNextListeners()
    nextListeners.push(listener)

    // 返回移除新添的监听函数
    return function unsubscribe() {
      // 如果监听还未成功添加到监听列表，则直接退出。
      if (!isSubscribed) {
        return
      }

      // 如果`dispatch`正在执行，则不允许调用`unsubscribe`
      if (isDispatching) {
        throw new Error(
          'You may not unsubscribe from a store listener while the reducer is executing. ' +
            'See http://redux.js.org/docs/api/Store.html#subscribe for more details.'
        )
      }

      // 重置状态， 后续不再移除不存在的监听器
      isSubscribed = false

      // 移除监听列表中的此项监听
      ensureCanMutateNextListeners()
      const index = nextListeners.indexOf(listener)
      nextListeners.splice(index, 1)
    }
  }

  /**
   * dispatch是改变state的唯一途径
   * 如果你想分派 a Promise, an Observable, a thunk, or something, 你可以通过添加enhancer。
   * 如第三方增强器`redux-thunk`，`redux-promise`等
   *
   * @param {Object} action - 发起的action,必需存在type且不能为`undefined`
   *
   * @returns {Object} - 为了方便分派同样的action,如果使用某些增强器，可能改变这个的返回值类型（promise）
   */
  function dispatch(action) {
    // 检测action的合法性
    if (!isPlainObject(action)) {
      throw new Error(
        'Actions must be plain objects. ' +
          'Use custom middleware for async actions.'
      )
    }

    // 检测action.type的合法性
    if (typeof action.type === 'undefined') {
      throw new Error(
        'Actions may not have an undefined "type" property. ' +
          'Have you misspelled a constant?'
      )
    }

    // 如果`dispatch`正在执行，则不允许再此调用`dispatch`
    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions.')
    }

    // 调用当前所有的reducers，更新state。
    try {
      isDispatching = true
      currentState = currentReducer(currentState, action)
    } finally {
      isDispatching = false
    }

    // 同步监听列表，触发所有监听
    const listeners = (currentListeners = nextListeners)
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i]
      listener()
    }

    return action
  }

  /**
   * 改变当前所用的reducer
   *
   * @param {Function} nextReducer - 新的reducer
   * @returns {void}
   */
  function replaceReducer(nextReducer) {
    if (typeof nextReducer !== 'function') {
      throw new Error('Expected the nextReducer to be a function.')
    }

    currentReducer = nextReducer
    dispatch({ type: ActionTypes.REPLACE })
  }

  /**
   * 此处略过～，这是留给 可观察/响应式库 的接口
   * 如果您了解 RxJS 等响应式编程库，那可能会用到这个接口.
   *
   * @returns {observable} A minimal observable of state changes.
   * For more information, see the observable proposal:
   * https://github.com/tc39/proposal-observable
   */
  function observable() {
    const outerSubscribe = subscribe
    return {
      /**
       * The minimal observable subscription method.
       * @param {Object} observer Any object that can be used as an observer.
       * The observer object should have a `next` method.
       * @returns {subscription} An object with an `unsubscribe` method that can
       * be used to unsubscribe the observable from the store, and prevent further
       * emission of values from the observable.
       */
      subscribe(observer) {
        if (typeof observer !== 'object') {
          throw new TypeError('Expected the observer to be an object.')
        }

        function observeState() {
          if (observer.next) {
            observer.next(getState())
          }
        }

        observeState()
        const unsubscribe = outerSubscribe(observeState)
        return { unsubscribe }
      },

      [$$observable]() {
        return this
      }
    }
  }

  // When a store is created, an "INIT" action is dispatched so that every
  // reducer returns their initial state. This effectively populates
  // the initial state tree.
  dispatch({ type: ActionTypes.INIT })

  return {
    dispatch,
    subscribe,
    getState,
    replaceReducer,
    [$$observable]: observable
  }
}
