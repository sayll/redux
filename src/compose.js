/**
 * 简化纯函数的组合调用
 * compose(f, g, h) 等价于 (...args) => f(g(h(...args)))
 *
 * @param {...Function} funcs - The functions to compose.
 * @returns {Function} - 函数从右到左依次执行
 */

export default function compose(...funcs) {
  if (funcs.length === 0) {
    return arg => arg
  }

  if (funcs.length === 1) {
    return funcs[0]
  }

  return funcs.reduce((a, b) => (...args) => a(b(...args)))
}
