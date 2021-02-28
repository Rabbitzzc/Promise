#### 整体 Promise 的分析

> 写文章太累了，直接在注释中给出来

```js
// class Promise2 {
//     callbacks = []
//     constructor(fn) {
//         // fn 在执行的过程中，会执行里面的函数，立即开始，这里涉及到 箭头函数等各种函数，所以需要将 this 绑定到 promise 自身的 resolve
//         fn(this._resolve.bind(this))
//     }
//     // 如果 Promise 保存了 then，则表示需要将函数保存起来
//     then(fn) {
//         this.callbacks.push(fn)
//     }
//     // 只要 resolve 就需要开始执行 then 方法了，一个接着一个执行
//     _resolve(value) {
//         this.callbacks.forEach(fn => fn(value))
//     }
// }

// let p = new Promise2((resolve, reject) => {
//     console.log(this)
//     setTimeout(() => {
//         console.log('开始')
//         resolve('等会吧')
//     }, 2000)
// })


// // 这里 p 可以执行很多次
// p.then(_ => {
//     console.log(_)
// })

// p.then(_ => {
//     console.log(_)
// })

/**
 * 按照上面的流程，这时候的 promise 有两个缺点，一个是不能链式调用，另一个就是 then 应该返回一个新的 promise
 */

// 需要满足 then 返回一个 promise，最简单的做法就是返回 this

// class Promise3 {
//     callbacks = []
//     constructor(fn) {
//         fn(this._resolve.bind(this))
//     }
//     then(fn) {
//         this.callbacks.push(fn)
//         return this
//     }
//     _resolve(value) {
//         this.callbacks.forEach(fn => fn(value))
//     }
// }

// 支持链式调用了
// let p3 = new Promise3((resolve, reject) => {
//     setTimeout(() => {
//         console.log('~~~ start ~~~')
//         resolve('2s')
//     }, 2000)
// }).then(_=>{
//     console.log(_)
// }).then(_ => {
//     console.log(_)
// })

// 如果先执行了 resolve，此时 callback 还是会为空，这时候等于注册失败了
// let p31 = new Promise3((resolve, reject) => {
//     console.log('~~~ start ~~~')
//     resolve('2s')
// }).then(_=>{
//     console.log(_)
// }).then(_ => {
//     console.log(_)
// })

// Promise 规范中是要求回调必须是通过异步执行的，也就是表示进入时事件循环，所以让 resolve 方法是异步的即可
// class Promise4 {
//     callbacks = []
//     constructor(fn) {
//         fn(this._resolve.bind(this))
//     }
//     then(fn) {
//         this.callbacks.push(fn)
//         return this
//     }
//     _resolve(value) {
//         setTimeout(()=>{
//             this.callbacks.forEach(fn => fn(value))
//         })
//     }
// }
// let p4 = new Promise4((resolve, reject) => {
//     console.log('~~~ start ~~~')
//     resolve('2s')
// }).then(_=>{
//     console.log(_)
// }).then(_ => {
//     console.log(_)
// })


// 正常来说，setTimeout 中也会继续执行，会
// let p41 = new Promise4(resolve => {
//     console.log('~~~ start ~~~')
//     resolve('2s');
// }).then(tip => {
//     console.log('then1', tip);
// }).then(tip => {
//     console.log('then2', tip);
// });
// setTimeout(() => {
//     // 这里打印不出来，这是因为上面先执行完了，resolve 方法已经将 callback 全部执行完毕了，then3 不会执行了
//     p41.then(tip => {
//         console.log('then3', tip);
//     })
// });

/**
 * 不管是第一次事件循环，promise 都会保存状态，将所有注册的 then 都会执行。需要引入 promise 的状态机制，比如 pending\fulfilled\rejected
 */

// class Promise5 {
//     callbacks = []
//     state = 'pending'
//     value = null // 因为下面需要用到，所以需要用变量暂存 resolve 的 value
//     constructor(fn) {
//         fn(this._resolve.bind(this))
//     }
//     then(fn) {
//         if (this.state === 'pending') { // 如果状态为 pending，则需要将 then 注册的回调函数注册到 callback，否则就直接执行了
//             this.callbacks.push(fn)
//         } else {
//             fn(this.value)
//         }
//         return this
//     }
//     _resolve(value) { // 之前的 then 方法如果先执行了 resolve ，后续再执行 then，虽然会注册回调函数，但是永远不会执行了，所以这里可以将 setTimeout 去掉，当然保留也没问题
//         this.state = 'fulfilled'
//         this.value = value
//         this.callbacks.forEach(fn => fn(value))
//     }
// }

// let p5 = new Promise5(resolve => {
//     console.log('~~~ start ~~~')
//     resolve('2s');
// }).then(tip => {
//     console.log('then1', tip);
// }).then(tip => {
//     console.log('then2', tip);
// });
// setTimeout(() => {
//     // 这里注册了，此时调用 then 的时候，在直接会执行该方法
//     p5.then(tip => {
//         console.log('then3', tip);
//     })
// });

/**
 * 回顾整个上面的内容，可以发现 Promise 雏形基本有了，比如状态管理、简单的链式调用等等
 * 当然缺点就是链式调用应该是返回新的 promise 而不是 this，包括 reject 方法的实现等等
 */

// 下一个个 then 应该是上一个 then 返回的数据，比如如下使用
// const getUserInfo = (url) => {
//     return new Promise5((resolve, reject) => {
//         //异步请求
//         http.get(url, info => resolve(info))
//     })
// }
// getUserInfo(url).then(_=>getName(_)).then(_=>getParent(_))



/**
 * 正确的 Promise.then 返回的是新的 Promise，下面实现满足了几个条件：
 * 1. 真正的串行调用，then 返回了新的 Promise
 */
// class Promise6 {
//     callbacks = []
//     state = 'pending'
//     value = null

//     constructor(fn) {
//         fn(this._resolve.bind(this))
//     }

//     then(fn) {
//         return new Promise6((resolve, reject) => {
//             if (this.state === 'pending') {
//                 this.callbacks.push(fn)
//                 return
//             }
//             // console.log(2)
//             // 如果 then 没有任何信息 - Promise 规范
//             if (!fn) {
//                 resolve(this.value)
//                 return
//             }
//             resolve(fn(this.value))
//         })
//     }
//     _resolve(value) {
//         this.state = 'fulfilled'
//         this.value = value
//         console.log(this.callbacks)
//         this.callbacks.forEach(fn => fn(value))
//     }
// }

// // 下面调用就会拿到上一个 then 的 resolve value
// let p6 = new Promise6((resolve, reject) => {
//     console.log('~~~ start ~~~')
//     // setTimeout(() => {
//     //     resolve(1)
//     // })
//     resolve(1)
// })

// let p66 = p6.then((value) => {
//     console.log(value)
//     return value + 1
// }).then((value) => {
//     console.log(value)
//     return value + 1
// }).then((value) => {
//     console.log(value)
//     return value + 1
// }).then((value) => {
//     console.log(value)
//     return value + 1
// }).then((value) => {
//     console.log(value)
// })

// console.log(p66)

// 来自 https://zhuanlan.zhihu.com/p/102017798 的例子
// 模拟异步请求
const mockAjax = (url, s, callback) => {
    setTimeout(() => {
        callback(url + '异步请求耗时' + s + '秒');
    }, 1000 * s)
}

// new Promise6(resolve => {
//     mockAjax('getUserId', 1, function (result) {
//         resolve(result);
//     })
// }).then(result => {
//     console.log(result);
// })

// 同步请求
// new Promise6(resolve => {
//     resolve('getUserId同步请求');
// }).then(result => {
//     console.log(result);
// });


// new Promise6(resolve => {
//     mockAjax('getUserId', 1, function (result) {
//         resolve(result);
//     })
// }).then(result => {
//     console.log('Promise2: ', result);
//     //对result进行第一层加工
//     let exResult = '前缀:' + result;
//     return exResult;
// }).then(result => {
//     console.log('Promise3: ', result);
//     let exResult = '前缀:' + result;
//     return exResult;
// }).then(result => {
//     console.log('Promise4: ', result);
//     let exResult = '前缀:' + result;
//     return exResult;
// }).then(result => {
//     console.log('Promise5: ', result);
//     let exResult = '前缀:' + result;
//     return exResult;
// }).then(result => {
//     console.log('Promise6: ', result);
// })

/**
 * 上面给出了同步的实例和异步的实例
 * 同步的方法是没问题的，会立即执行所有的 then，并实现链式调用，这是因为后面注册的 then 方法，会执行执行了，然后并执行下一次的 resolve 方法
 * 而异步的方法是存在问题，这里 then 里面保存了下一个 promise 的 resolve 方法，继续执行 callbacks，但是异步情况下，_resolve 方法中 fn 执行以后，仅仅执行了，没有使用下一个 promise 的 resolve 通知执行，也就是链断了
 * 因此，也需要将 _resolve 与 then 方法保持一致，也就是需要拥有下个 promise 的 resolve
 * 可以尝试将 resolve 保存到 callbacks 属性里面
 */

// class Promise7 {
//     callbacks = []
//     state = 'pending'
//     value = null

//     constructor(fn) {
//         fn(this._resolve.bind(this))
//     }

//     then(fn) {
//         return new Promise7((resolve, reject) => {
//             this._handle({
//                 onFulfilled: fn || null,
//                 resolve
//             })

//         })
//     }
//     _resolve(value) {
//         this.state = 'fulfilled'
//         this.value = value
//         this.callbacks.forEach(callbackObj => this._handle(callbackObj))
//     }
//     _handle(callbackObj) {
//         if (this.state === 'pending') {
//             this.callbacks.push(callbackObj)
//             return
//         }
//         if (!callbackObj.onFulfilled) {
//             callbackObj.resolve(this.value)
//             return
//         }
//         callbackObj.resolve(callbackObj.onFulfilled(this.value))
//     }
// }

// let p7 = new Promise7((resolve, reject) => {
//     console.log('~~~ start ~~~')
//     // 异步
//     setTimeout(() => {
//         resolve(1)
//     })
//     // 同步
//     // resolve(1)
// })

// let p77 = p7.then((value) => {
//     console.log(value)
//     return value + 1
// }).then((value) => {
//     console.log(value)
//     return value + 1
// }).then((value) => {
//     console.log(value)
//     return value + 1
// }).then((value) => {
//     console.log(value)
//     return value + 1
// }).then((value) => {
//     console.log(value)
// })

// new Promise7(resolve => {
//     mockAjax('getUserId', 1, function (result) {
//         resolve(result);
//     })
// }).then(result => {
//     console.log('Promise2: ', result);
//     //对result进行第一层加工
//     let exResult = '前缀:' + result;
//     return exResult;
// }).then(result => {
//     console.log('Promise3: ', result);
//     let exResult = '前缀:' + result;
//     return exResult;
// }).then(result => {
//     console.log('Promise4: ', result);
//     let exResult = '前缀:' + result;
//     return exResult;
// }).then(result => {
//     console.log('Promise5: ', result);
//     let exResult = '前缀:' + result;
//     return exResult;
// }).then(result => {
//     console.log('Promise6: ', result);
// })

/**
 * 再看看上面 Promise 的使用，是第一个 promise 为异步，其他的 promise 都是同步，而本身 promise 就是为了解决异步问题
 * 如果一直为同步，则本身意义不大，一般 then 接着 then 返回 promise 居多（数据串行请求），而且返回的是 promise 的 resolve 结果
 */

/**
 * 比如正常 promise 使用
 * 返回结果应该是: Promise {<fulfilled>: 1111}
 * 所以还是得改写 Promise
 */
// let p = new Promise((resolve, reject)=>{
//     resolve(new Promise((resolve, reject)=>{
//         resolve(1111)
//     }))
// })


// class Promise8 {
//     callbacks = []
//     state = 'pending'
//     value = null

//     constructor(fn) {
//         fn(this._resolve.bind(this))
//     }

//     then(fn) {
//         return new Promise8((resolve, reject) => {
//             this._handle({
//                 onFulfilled: fn || null,
//                 resolve
//             })

//         })
//     }
//     _resolve(value) {
//         // 对 value 进行判断
//         const {
//             then
//         } = value || {}
//         if (typeof (then) === 'function') {
//             // 让 promise 先执行一下，然后直接执行，让内部 promise.onfulFilled = 当前 promise._resolve
//             then.call(value, this._resolve.bind(this))
//             return
//         }

//         this.state = 'fulfilled'
//         this.value = value
//         this.callbacks.forEach(callbackObj => this._handle(callbackObj))
//     }
//     _handle(callbackObj) {
//         if (this.state === 'pending') {
//             this.callbacks.push(callbackObj)
//             return
//         }
//         if (!callbackObj.onFulfilled) {
//             callbackObj.resolve(this.value)
//             return
//         }
//         callbackObj.resolve(callbackObj.onFulfilled(this.value))
//     }
// }
// let p8 = new Promise8((resolve, reject)=>{
//     resolve(new Promise8((resolve, reject)=>{
//         resolve(1111)
//     }))
// })
// console.log(p8)

// const pUserId = new Promise8(resolve => {
//     mockAjax('getUserId', 1, function (result) {
//         resolve(result);
//     })
// })
// const pUserName = new Promise8(resolve => {
//     mockAjax('getUserName', 2, function (result) {
//         resolve(result);
//     })
// })

// pUserId.then(id => {
//     console.log(id)
//     return pUserName
// }).then(name => {
//     console.log(name)
// })


// new Promise8((resolve, reject)=>{
//     resolve(new Promise8((resolve1, reject)=>{
//         console.log(2)
//         resolve1(1111)
//     }))
// }).then(id => {
//     console.log(id)
//     return new Promise8((resolve1, reject)=>{
//         console.log(3)
//         resolve1(2222)
//     })
// }).then(id => {
//     console.log(id)
// })


/**
 * 至此，当前 Promise.resolve(promise) 能够直接 resolve 内部 promise 的数据，与原生 promise 相同
 * 下面将实现一些 Promise 的其他函数，比如 reject 等
 */


/**
 *  添加 reject
 * reject 按照之前的逻辑，应该是跟 resolve 的逻辑一样的，promise 可以执行 resolve 或者 reject 方法，利用 then 捕获返回的数据
 */
// class Promise9 {
//     callbacks = []
//     state = 'pending'
//     value = null

//     constructor(fn) {
//         fn(this._resolve.bind(this), this._reject.bind(this))
//     }

//     then(onFulfilled, onRejected) {
//         return new Promise9((resolve, reject) => {
//             this._handle({
//                 onFulfilled: onFulfilled || null,
//                 onRejected: onRejected || null,
//                 resolve,
//                 reject
//             })

//         })
//     }
//     _resolve(value) {
//         // 对 value 进行判断
//         const {
//             then
//         } = value || {}
//         if (typeof (then) === 'function') {
//             // 让 promise 先执行一下，然后直接执行，让内部 promise.onfulFilled = 当前 promise._resolve
//             then.call(value, this._resolve.bind(this), this._reject.bind(this))
//             return
//         }

//         this.state = 'fulfilled'
//         this.value = value
//         this.callbacks.forEach(callbackObj => this._handle(callbackObj))
//     }

//     _reject(error) {
//         this.state = 'rejected'
//         this.value = error
//         this.callbacks.forEach(callbackObj => this._handle(callbackObj))
//     }

//     _handle(callbackObj) {
//         if (this.state === 'pending') {
//             this.callbacks.push(callbackObj)
//             return
//         }

//         const cb = this.state === 'fulfilled' ? callbackObj.onFulfilled : callbackObj.onRejected
//         const pcb = this.state === 'fulfilled' ? callbackObj.resolve : callbackObj.reject

//         if (!cb) {
//             pcb(this.value)
//             return
//         }
//         pcb(cb(this.value))
//     }
// }

// let p9 = new Promise9((resolve, reject) => {
//     console.log('reject')
//     reject('reject: ' + 1111)
// }).then(_ => {
//     console.log(_)
//     return new Promise9((resolve, reject) => {
//         resolve('resolve: ' + 2222)
//     })
// }).then(_ => {
//     console.log(_)
// })

/**
 * 在 Promise 中，如果 then 或者 catch 方法中，会有错误捕获。比如 then 的 onFulfilled 方法中 throw error 会被 catch 捕获，说明此时的错误被捕获到了，并且更改了状态为 rejected
 */
// class Promise10 {
//     callbacks = []
//     state = 'pending'
//     value = null

//     constructor(fn) {
//         fn(this._resolve.bind(this), this._reject.bind(this))
//     }

//     then(onFulfilled, onRejected) {
//         return new Promise10((resolve, reject) => {
//             this._handle({
//                 onFulfilled: onFulfilled || null,
//                 onRejected: onRejected || null,
//                 resolve,
//                 reject
//             })

//         })
//     }
//     _resolve(value) {
//         // 对 value 进行判断
//         const {
//             then
//         } = value || {}
//         if (typeof (then) === 'function') {
//             // 让 promise 先执行一下，然后直接执行，让内部 promise.onfulFilled = 当前 promise._resolve
//             then.call(value, this._resolve.bind(this), this._reject.bind(this))
//             return
//         }

//         this.state = 'fulfilled'
//         this.value = value
//         this.callbacks.forEach(callbackObj => this._handle(callbackObj))
//     }

//     _reject(error) {
//         this.state = 'rejected'
//         this.value = error
//         this.callbacks.forEach(callbackObj => this._handle(callbackObj))
//     }

//     _handle(callbackObj) {
//         if (this.state === 'pending') {
//             this.callbacks.push(callbackObj)
//             return
//         }

//         const cb = this.state === 'fulfilled' ? callbackObj.onFulfilled : callbackObj.onRejected
//         let pcb = this.state === 'fulfilled' ? callbackObj.resolve : callbackObj.reject

//         if (!cb) {
//             pcb(this.value)
//             return
//         }

//         try {
//             pcb(cb(this.value))
//         } catch (error) {
//             callbackObj.reject(error)
//         }
//     }
// }

// new Promise10((resolve, reject) => {
//     console.log('reject')
//     reject('reject: ' + 1111)
// }).then(_ => {
//     console.log(_)
//     return new Promise10((resolve, reject) => {
//         resolve('resolve: ' + 2222)
//     })
// }, error=>{
//     console.log('error: ' + error)
// }).then(_ => {
//     console.log(_)
// })
// new Promise10((resolve, reject) => {

//     mockAjax('getUserId', 1, function (result, error) {
//         if (error) {
//             reject(error)
//         } else {
//             resolve(result);
//         }
//     })

// }).then(result => {
//     console.log(a); // 模拟异常
//     console.log(result);
// }).then(null, error => {
//     console.log('error:' + error);
// });

/**
 * 上面的 promise10 可以捕获 onFulfilled 中的错误了，但是不能捕获构造函数的错误，以及缺少 catch，在 promise 规范中，promise 只有 then 方法，catch 只是 then 的变种
 */
// class Promise11 {
//     callbacks = []
//     state = 'pending'
//     value = null

//     constructor(fn) {
//         try {
//             fn(this._resolve.bind(this), this._reject.bind(this))
//         } catch (error) {
//             this._reject(error)
//         }
//     }

//     then(onFulfilled, onRejected) {
//         return new Promise11((resolve, reject) => {
//             this._handle({
//                 onFulfilled: onFulfilled || null,
//                 onRejected: onRejected || null,
//                 resolve,
//                 reject
//             })

//         })
//     }
//     catch (onRejected) {
//         return this.then(null, onRejected)
//     }

//     _resolve(value) {
//         // 对 value 进行判断
//         const {
//             then
//         } = value || {}
//         if (typeof (then) === 'function') {
//             // 让 promise 先执行一下，然后直接执行，让内部 promise.onfulFilled = 当前 promise._resolve
//             then.call(value, this._resolve.bind(this), this._reject.bind(this))
//             return
//         }

//         this.state = 'fulfilled'
//         this.value = value
//         this.callbacks.forEach(callbackObj => this._handle(callbackObj))
//     }

//     _reject(error) {
//         this.state = 'rejected'
//         this.value = error
//         this.callbacks.forEach(callbackObj => this._handle(callbackObj))
//     }

//     _handle(callbackObj) {
//         if (this.state === 'pending') {
//             this.callbacks.push(callbackObj)
//             return
//         }

//         const cb = this.state === 'fulfilled' ? callbackObj.onFulfilled : callbackObj.onRejected
//         let pcb = this.state === 'fulfilled' ? callbackObj.resolve : callbackObj.reject

//         if (!cb) {
//             pcb(this.value)
//             return
//         }

//         try {
//             pcb(cb(this.value))
//         } catch (error) {
//             callbackObj.reject(error)
//         }
//     }
// }

// new Promise11((resolve, reject) => {

//     mockAjax('getUserId', 1, function (result, error) {
//         if (error) {
//             reject(error)
//         } else {
//             resolve(result);
//         }
//     })

// }).then(result => {
//     console.log(a); // 模拟异常
//     console.log(result);
// }).catch(error => {
//     console.log('error:' + error);
// })


// let p111 = new Promise11((resolve, reject)=>{
//     throw new Error('reject' + 1111)
// }).then(_=>{
//     console.log(_)
//     return new Promise11((resolve, reject)=>{
//         resolve('resolve: ' + 2222) 
//     })
// }).catch(_=>{
//     console.log('catch: ' +  _)
// })
// console.log(p111)

/**
 * Promise 还有一个方法，即 finally，不管 promise 状态如何，都会执行一次
 */

// class Promise12 {
//     callbacks = []
//     state = 'pending'
//     value = null

//     constructor(fn) {
//         try {
//             fn(this._resolve.bind(this), this._reject.bind(this))
//         } catch (error) {
//             this._reject(error)
//         }
//     }

//     then(onFulfilled, onRejected) {
//         return new Promise12((resolve, reject) => {
//             this._handle({
//                 onFulfilled: onFulfilled || null,
//                 onRejected: onRejected || null,
//                 resolve,
//                 reject
//             })

//         })
//     }

//     catch (onRejected) {
//         return this.then(null, onRejected)
//     } finally(done) {
//         // finally 与 catch 类似，也是 then 的变形，即 then 中的 onFulfilled = onRejected = done，这么做的话，不符合 promise 规范
//         // return this.then(done, done)

//         // finally 中没有任何状态，需要对 done 方法重新封装一层
//         if (typeof (done) !== 'function') return this.then()
//         return this.then(
//             value => Promise12._resolve(done()).then(() => value),
//             error => Promise12._resolve(done()).then(() => {
//                 throw error
//             })
//         )
//     }
//     _resolve(value) {
//         // 对 value 进行判断
//         const {
//             then
//         } = value || {}
//         if (typeof (then) === 'function') {
//             // 让 promise 先执行一下，然后直接执行，让内部 promise.onfulFilled = 当前 promise._resolve
//             then.call(value, this._resolve.bind(this), this._reject.bind(this))
//             return
//         }

//         this.state = 'fulfilled'
//         this.value = value
//         this.callbacks.forEach(callbackObj => this._handle(callbackObj))
//     }

//     _reject(error) {
//         this.state = 'rejected'
//         this.value = error
//         this.callbacks.forEach(callbackObj => this._handle(callbackObj))
//     }

//     _handle(callbackObj) {
//         if (this.state === 'pending') {
//             this.callbacks.push(callbackObj)
//             return
//         }

//         const cb = this.state === 'fulfilled' ? callbackObj.onFulfilled : callbackObj.onRejected
//         let pcb = this.state === 'fulfilled' ? callbackObj.resolve : callbackObj.reject

//         if (!cb) {
//             pcb(this.value)
//             return
//         }

//         try {
//             pcb(cb(this.value))
//         } catch (error) {
//             callbackObj.reject(error)
//         }
//     }
// }

// new Promise12((resolve, reject) => {
//     setTimeout(() => {
//         resolve('success');
//         reject('error');
//     }, 1000)
// }).then(_ => {
//     console.log('then: ' + _)
// }).catch(_ => {
//     console.log('catch: ' + _)
// }).finally(() => {
//     console.log('onDone')
// })

/**
 * 可以看到，上面的 finally 肯定会执行
 * 但是这里有个小问题，就是在于 resolve 与 reject 同时存在，会同时执行，而 promise 中是不允许的，因此 reject 与 resolve 都得暂停下面的执行
 * 在 resolve 与 reject 方法执行之前对当前的状态进行判断即可
 */
// class Promise13 {
//     callbacks = []
//     state = 'pending'
//     value = null

//     constructor(fn) {
//         try {
//             fn(this._resolve.bind(this), this._reject.bind(this))
//         } catch (error) {
//             this._reject(error)
//         }
//     }

//     then(onFulfilled, onRejected) {
//         return new Promise13((resolve, reject) => {
//             this._handle({
//                 onFulfilled: onFulfilled || null,
//                 onRejected: onRejected || null,
//                 resolve,
//                 reject
//             })

//         })
//     }

//     catch (onRejected) {
//         return this.then(null, onRejected)
//     } finally(done) {
//         // finally 与 catch 类似，也是 then 的变形，即 then 中的 onFulfilled = onRejected = done，这么做的话，不符合 promise 规范
//         // return this.then(done, done)

//         // finally 中没有任何状态，需要对 done 方法重新封装一层
//         if (typeof (done) !== 'function') return this.then()
//         return this.then(
//             value => Promise13._resolve(done()).then(() => value),
//             error => Promise13._resolve(done()).then(() => {
//                 throw error
//             })
//         )
//     }
//     _resolve(value) {
//         if(this.state !== 'pending') return
//         // 对 value 进行判断
//         const {
//             then
//         } = value || {}
//         if (typeof (then) === 'function') {
//             // 让 promise 先执行一下，然后直接执行，让内部 promise.onfulFilled = 当前 promise._resolve
//             then.call(value, this._resolve.bind(this), this._reject.bind(this))
//             return
//         }

//         this.state = 'fulfilled'
//         this.value = value
//         this.callbacks.forEach(callbackObj => this._handle(callbackObj))
//     }

//     _reject(error) {
//         if(this.state !== 'pending') return
//         this.state = 'rejected'
//         this.value = error
//         this.callbacks.forEach(callbackObj => this._handle(callbackObj))
//     }

//     _handle(callbackObj) {
//         if (this.state === 'pending') {
//             this.callbacks.push(callbackObj)
//             return
//         }

//         const cb = this.state === 'fulfilled' ? callbackObj.onFulfilled : callbackObj.onRejected
//         let pcb = this.state === 'fulfilled' ? callbackObj.resolve : callbackObj.reject

//         if (!cb) {
//             pcb(this.value)
//             return
//         }

//         try {
//             pcb(cb(this.value))
//         } catch (error) {
//             callbackObj.reject(error)
//         }
//     }
// }
// new Promise13((resolve, reject) => {
//     setTimeout(() => {
//         resolve('success');
//         reject('error');
//     }, 1000)
// }).then(_ => {
//     console.log('then: ' + _)
// }).catch(_ => {
//     console.log('catch: ' + _)
// }).finally(() => {
//     console.log('onDone')
// })


/**
 * 上面的解析，基本上实现了 Promise，包括 then catch finally 方法
 * Promise 还有静态方法，包括 resolve 与 reject
 * 下面对于 Promise 使用了 Prototype 替换，这样每次更新名字就不用对全局替换了
 */

// resolve 方法返回 Promise 则直接返回这个 Promise，如果是数据的话，则直接返回一个包装后的 promise
// class Promise14 {
//     callbacks = []
//     state = 'pending'
//     value = null

//     constructor(fn) {
//         try {
//             fn(this._resolve.bind(this), this._reject.bind(this))
//         } catch (error) {
//             this._reject(error)
//         }
//     }

//     then(onFulfilled, onRejected) {
//         const Prototype = this.constructor
//         return new Prototype((resolve, reject) => {
//             this._handle({
//                 onFulfilled: onFulfilled || null,
//                 onRejected: onRejected || null,
//                 resolve,
//                 reject
//             })

//         })
//     }

//     catch (onRejected) {
//         return this.then(null, onRejected)
//     } finally(done) {
//         // finally 与 catch 类似，也是 then 的变形，即 then 中的 onFulfilled = onRejected = done，这么做的话，不符合 promise 规范
//         // return this.then(done, done)

//         // finally 中没有任何状态，需要对 done 方法重新封装一层
//         if (typeof (done) !== 'function') return this.then()
//         const Prototype = this.constructor
//         return this.then(
//             value => Prototype._resolve(done()).then(() => value),
//             error => Prototype._resolve(done()).then(() => {
//                 throw error
//             })
//         )
//     }
//     _resolve(value) {
//         if (this.state !== 'pending') return
//         // 对 value 进行判断
//         const {
//             then
//         } = value || {}
//         if (typeof (then) === 'function') {
//             // 让 promise 先执行一下，然后直接执行，让内部 promise.onfulFilled = 当前 promise._resolve
//             then.call(value, this._resolve.bind(this), this._reject.bind(this))
//             return
//         }

//         this.state = 'fulfilled'
//         this.value = value
//         this.callbacks.forEach(callbackObj => this._handle(callbackObj))
//     }

//     _reject(error) {
//         if (this.state !== 'pending') return
//         this.state = 'rejected'
//         this.value = error
//         this.callbacks.forEach(callbackObj => this._handle(callbackObj))
//     }

//     _handle(callbackObj) {
//         if (this.state === 'pending') {
//             this.callbacks.push(callbackObj)
//             return
//         }

//         const cb = this.state === 'fulfilled' ? callbackObj.onFulfilled : callbackObj.onRejected
//         let pcb = this.state === 'fulfilled' ? callbackObj.resolve : callbackObj.reject

//         if (!cb) {
//             pcb(this.value)
//             return
//         }

//         try {
//             pcb(cb(this.value))
//         } catch (error) {
//             callbackObj.reject(error)
//         }
//     }

//     static resolve(value) {
//         if (value) {
//             const {
//                 then
//             } = value || {}
//             if (value instanceof Promise14) {
//                 return value
//             } else if (typeof (then) === 'function') {
//                 return new Promise14(resolve => then(resolve))
//             } else if (value) {
//                 return new Promise14(resolve => resolve(value))
//             } else {
//                 return new Promise14(resolve => resolve())
//             }
//         }
//     }

//     static reject(value) {
//         const {
//             then
//         } = value || {}
//         if (typeof (then) === 'function') {
//             return new Promise14((resolve, reject) => then(reject))
//         } else {
//             return new Promise14((resolve, reject) => reject(value))
//         }
//     }
// }

// Promise14.resolve(1).then(_=>{
//     console.log(1111)
// })

// Promise14.reject(1).then(_=>{
//     console.log(1111)
// }).catch(_=>{})

// new Promise14((resolve, reject)=>{
//     reject(1)
// }).then(_=>{
//     console.log(1)
// }).catch(_ => {
//     console.log(2)
// })

/**
 * 上面已经实现了 resolve 与 reject，还有 all 与 race 方法
 * all 数传入 promise 数组，直接在 Promise14 上补充
 */
class Promise14 {
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
            if (value instanceof Promise14) {
                return value
            } else if (typeof (then) === 'function') {
                return new Promise14(resolve => then(resolve))
            } else if (value) {
                return new Promise14(resolve => resolve(value))
            } else {
                return new Promise14(resolve => resolve())
            }
        }
    }

    static reject(value) {
        const {
            then
        } = value || {}
        if (typeof (then) === 'function') {
            return new Promise14((resolve, reject) => then(reject))
        } else {
            return new Promise14((resolve, reject) => reject(value))
        }
    }

    static all(promises) {
        return new Promise14((resolve, reject) => {
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
        return new Promise14((resolve, reject) => {
            promises.some(promise => {
                // 直接去抢，谁先执行即可
                Promise.resolve(promise).then(value => resolve(value), error => reject(error))
            })
        })
    }
}

const p1 = new Promise14((resolve, reject) => {
    setTimeout(() => resolve('p1'), 1000)
})

const p2 = new Promise14((resolve, reject) => {
    setTimeout(() => resolve('p2'), 5000)
})

Promise14.race([p1, p2]).then(ret => {
    console.log(ret) // 'p1'
})

Promise14.all([p1, p2,111,222]).then(ret => {
    console.log(ret)
})

/**
 * 🎉🎉🎉 🎉🎉🎉
 * 完美执行，至此，整体的 Promise 已经实现，加上解释，本文一共1283行，理解一个 Promise 真心挺难的
 * 🎉🎉🎉 🎉🎉🎉
 */
 ```