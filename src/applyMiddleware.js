import compose from './compose'

/**
 * 创建一个增强器
 * @example
 * const enhancedCreateStore = Redux.applyMiddleware(...Middlewares)(Redux.createStore)
 * const store = enhancedCreateStore(reducer)
 *
 * @param {...Function} middlewares - 传入一组增强器（middleware）.
 * @returns {Function} - 返回原先的4个store的API，且用增强的dispatch替换原先的
 */
export default function applyMiddleware(...middlewares) {
  return createStore => (...args) => {
    const store = createStore(...args)

    // 不允许中间件调用`dispatch`
    let dispatch = () => {
      throw new Error(
        `Dispatching while constructing your middleware is not allowed. ` +
          `Other middleware would not be applied to this dispatch.`
      )
    }
    // 存储中间件
    let chain = []

    const middlewareAPI = {
      getState: store.getState,
      dispatch: (...args) => dispatch(...args)
    }
    // 串联所有的中间件
    chain = middlewares.map(middleware => middleware(middlewareAPI))
    // 增强的dispatch，通过调用dispatch依次执行所有的中间件
    dispatch = compose(...chain)(store.dispatch)

    // 返回原先的4个store的API，便用增强的dispatch替换原先的
    return {
      ...store,
      dispatch
    }
  }
}
