class PPromise {
    callbacks = []
    state = 'pending'
    value = null

    constructor(fn) {
        try {
            fn(this._resolve.bind(this), this._reject.bind(this))
        } catch (error) {
            this._reject(error)
        }
    }

    then(onFulfilled, onRejected) {
        const Prototype = this.constructor
        return new Prototype((resolve, reject) => {
            this._handle({
                onFulfilled: onFulfilled || null,
                onRejected: onRejected || null,
                resolve,
                reject
            })

        })
    }

    catch (onRejected) {
        return this.then(null, onRejected)
    } finally(done) {
        // finally 与 catch 类似，也是 then 的变形，即 then 中的 onFulfilled = onRejected = done，这么做的话，不符合 promise 规范
        // return this.then(done, done)

        // finally 中没有任何状态，需要对 done 方法重新封装一层
        if (typeof (done) !== 'function') return this.then()
        const Prototype = this.constructor
        return this.then(
            value => Prototype._resolve(done()).then(() => value),
            error => Prototype._resolve(done()).then(() => {
                throw error
            })
        )
    }
    _resolve(value) {
        if (this.state !== 'pending') return
        // 对 value 进行判断
        const {
            then
        } = value || {}
        if (typeof (then) === 'function') {
            // 让 promise 先执行一下，然后直接执行，让内部 promise.onfulFilled = 当前 promise._resolve
            then.call(value, this._resolve.bind(this), this._reject.bind(this))
            return
        }

        this.state = 'fulfilled'
        this.value = value
        this.callbacks.forEach(callbackObj => this._handle(callbackObj))
    }

    _reject(error) {
        if (this.state !== 'pending') return
        this.state = 'rejected'
        this.value = error
        this.callbacks.forEach(callbackObj => this._handle(callbackObj))
    }

    _handle(callbackObj) {
        if (this.state === 'pending') {
            this.callbacks.push(callbackObj)
            return
        }

        const cb = this.state === 'fulfilled' ? callbackObj.onFulfilled : callbackObj.onRejected
        let pcb = this.state === 'fulfilled' ? callbackObj.resolve : callbackObj.reject

        if (!cb) {
            pcb(this.value)
            return
        }

        try {
            pcb(cb(this.value))
        } catch (error) {
            callbackObj.reject(error)
        }
    }

    static resolve(value) {
        if (value) {
            const {
                then
            } = value || {}
            if (value instanceof PPromise) {
                return value
            } else if (typeof (then) === 'function') {
                return new PPromise(resolve => then(resolve))
            } else if (value) {
                return new PPromise(resolve => resolve(value))
            } else {
                return new PPromise(resolve => resolve())
            }
        }
    }

    static reject(value) {
        const {
            then
        } = value || {}
        if (typeof (then) === 'function') {
            return new PPromise((resolve, reject) => then(reject))
        } else {
            return new PPromise((resolve, reject) => reject(value))
        }
    }

    static all(promises) {
        return new PPromise((resolve, reject) => {
            let fulfilledCount = 0
            const length = promises.length
            // 存储结果
            const rets = Array.from({
                length
            })
            promises.forEach((promise, index) => {
                Promise.resolve(promise).then(result => {
                    rets[index] = result

                    if (++fulfilledCount === length) {
                        resolve(rets)
                    }
                }, error => reject(error))
            })
        })
    }

    // race 返回最先 resolve 的
    static race(promises) {
        return new PPromise((resolve, reject) => {
            promises.some(promise => {
                // 直接去抢，谁先执行即可
                Promise.resolve(promise).then(value => resolve(value), error => reject(error))
            })
        })
    }
}