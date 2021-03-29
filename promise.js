class PPromise {
    // 默认状态
    status = 'pending'
    value = undefined // resolve 的值
    callbacks = []
    constructor(fn) {
        try {
            // 默认会立即执行 - 接收两个参数，一个是 resolve 一个是 reject
            fn(this._resolve.bind(this), this._reject.bind(this))
        } catch (error) {
            this._reject(error)
        }
    }
    // * 而异步的方法是存在问题，这里 then 里面保存了下一个 promise 的 resolve 方法，继续执行 callbacks，但是异步情况下，_resolve 方法中 fn 执行以后，仅仅执行了，没有使用下一个 promise 的 resolve 通知执行，也就是链断了
    then(onFulfilled, onRejected) {
        return new PPromise((resolve, reject) => {
            // 注册所有函数
            this._handler({
                resolve,
                reject,
                onFulfilled: onFulfilled || null,
                onRejected: onRejected || null
            })
        })
    }
    catch (onRejected) {
        return this.then(null, onRejected)
    }
    // finally 函数
    finally(done) {
        // promise 只有 then，catch 与 finally 都是变形
        // return this.then(done,done) // 不管之前的状态，都会执行，所以都注册即可，但是还是存在状态
        if (typeof done !== 'function') return this.then()
        // finally 跟状态无关的，且没有参数
        // resolve 则执行完，返回新的新的 promise，且为 resolve 的 value
        // reject 执行完，则会返回新的 promise，且抛出错误
        return this.then(
            value => PPromise._resolve(done()).then(() => value),
            error => PPromise._resolve(done()).then(() => {
                throw error
            })
        )
    }
    _handler(callback) {
        if (this.status === 'pending') {
            return this.callbacks.push(callback)
        }
        // 判断函数执行
        const on_resolve_reject = this.status === 'fulfilled' ? callback.onFulfilled : callback.onRejected
        const resolve_reject = this.status === 'fulfilled' ? callback.resolve : callback.reject
        // 如果 promise 的状态 resolved，则立即执行 - 解决 resolve 为同步问题 - 并返回函数执行返回值
        //如果then中没有传递任何东西 - Promise 规范 - Promise.resolve(1).then().then(v=>console.log(v)) 接管then空之前的 resolve 数据 1
        if (!on_resolve_reject) {
            return resolve_reject(this.value)
        }
        try {
            resolve_reject(on_resolve_reject(this.value))
        } catch (error) {
            callback.reject(error)
        }
    }
    // 内部的 resolve 与 reject 函数
    _resolve(value) {
        if (this.status !== 'pending') return // 注意终止 resolve 与 reject 不可同时执行
        // promise 链式是解决异步的，所以一般 value 都是新的 promise
        // 如果是 promise，则返回 promise 的状态
        const {
            then
        } = value || {}
        // 继续执行 promise 的异步 - 让 promise 先执行一下，然后直接执行，让内部 promise.onfulFilled = 当前 promise._resolve
        if (typeof then === 'function') {
            return then.call(value, this._resolve.bind(this), this._reject.bind(this))
        }
        this.status = 'fulfilled'
        this.value = value
        this.callbacks.forEach(v => this._handler(v))
    }
    // 与 resolve 类似 - 但是不对属性进行判断
    _reject(error) {
        if (this.status !== 'pending') return // 注意终止 resolve 与 reject 不可同时执行
        this.status = 'rejected'
        this.value = error
        this.callbacks.forEach(v => this._handler(v))
    }
    static resolve(value) {
        const {
            then
        } = value || {}
        // Promise 返回新的 promise
        // 存在 then 函数，则执行 then，且不处理 resolve
        // 其他数据，直接返回 resolve
        if (value instanceof PPromise) {
            return value
        } else if (typeof (then) === 'function') {
            return new PPromise(resolve => then(resolve))
        } else {
            return new PPromise(resolve => resolve(value))
        }
    }
    static reject(value) {
        const {
            then
        } = value || {}
        if (typeof (then) === 'function') return new PPromise((resolve, reject) => then(reject))
        return new PPromise((resolve, reject) => reject(value))
    }
    static all(promises) {
        return new PPromise((resolve, reject) => {
            let result = []
            let resolveLength = 0
            const {
                length
            } = promises
            promises.forEach((promise, index) => {
                PPromise.resolve(promise).then(v => {
                    result[index] = v
                    if (++resolveLength === length) {
                        resolve(result)
                    }
                }).catch(e => reject(e))
            })
        })
    }

    // 任何一个出来结果即可
    static race(promises) {
        return new PPromise((resolve, reject) => {
            promises.some(promise => PPromise.resolve(promise).then(v => resolve(v)).catch(e => reject(e)))
        })
    }

    // 任何一个 resolve 出来即可
    static any(promises) {
        return new PPromise((resolve, reject) => {
            let resolveLength = 0
            const {
                length
            } = promises
            promises.forEach((promise, index) => {
                PPromise.resolve(promise).then(v => {
                    resolve(v)
                }).catch(() => {
                    if (++resolveLength === length) {
                        reject(new Error('AggregateError: All promises were rejected'))
                    }
                })
            })
        })
    }
    static allSettled(promises) {
        return new PPromise((resolve, reject) => {
            let result = []
            let resolveLength = 0
            const {
                length
            } = promises
            promises.forEach((promise, index) => {
                PPromise.resolve(promise).then(v => {
                    result[index] = {
                        status: 'fulfilled',
                        value: v
                    }
                }).catch(e => {
                    result[index] = {
                        status: 'rejected',
                        value: e
                    }
                }).finally(() => {
                    if (++resolveLength === length) {
                        resolve(result)
                    }
                })
            })
        })
    }
}