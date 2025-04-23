// ==UserScript==
// @name        rush4award
// @namespace   vurses
// @license     Mit
// @match       https://www.bilibili.com/blackboard/new-award-exchange.html?task_id=*
// @version     3.1.0
// @author      layenh
// @icon        https://i0.hdslb.com/bfs/activity-plat/static/b9vgSxGaAg.png
// @homepage    https://github.com/vruses/get-bili-redeem
// @supportURL  https://github.com/vruses/get-bili-redeem/issues
// @run-at      document-start
// @grant       none
// @description 🔥功能介绍：1、支持B站所有激励计划，是否成功取决于b站接口是否更新，与游戏版本无关；2、根据验证码通过情况自适应请求速度
// ==/UserScript==
const ReceiveTime = 1000;
const SlowerTime = 10000;

class TimerManager {
  constructor() {
    this.timers = new Map();
  }
  set(key, callback, delay) {
    this.clean(key);
    const id = setInterval(() => {
      callback();
    }, delay);
    this.timers.set(key, id);
  }
  clean(key) {
    if (this.timers.has(key)) {
      clearInterval(this.timers.get(key));
      this.timers.delete(key);
    }
  }
  cleanAll() {
    for (let id of this.timers.values()) {
      clearInterval(id);
    }
    this.timers.clear();
  }
  has(key) {
    return this.timers.has(key);
  }
}

const originalCall = Function.prototype.call;

Function.prototype.call = function (...args) {
  if (this.name === "fb94") {
    let temp = this.toString();
    temp.indexOf("this.$nextTick(()=>{}),");
    temp = temp.replace(
      `this.$nextTick(()=>{}),`,
      (res) => res + "Object.assign(window,{awardInstance:this}),"
    );
    // 禁止pub&notify错误页消息
    temp = temp.replace(
      `setCommonDialog(t){b.commonErrorDialog=t},`,
      `setCommonDialog(t){},`
    );
    temp = eval("(" + temp + ")");
    return originalCall.apply(temp, args);
  }
  return originalCall.apply(this, args);
};

const originalFetch = window.fetch;

window.fetch = function (input, init = {}) {
  let url = "";
  // 处理 input 可能是字符串或 Request 对象
  if (typeof input === "string") {
    url = input;
  } else if (input instanceof Request) {
    url = input.url;
  }
  if (url.includes("/x/activity_components/mission/receive")) {
    return originalFetch.call(this, input, init).then(
      (res) => {
        res
          .clone()
          .json()
          .then((res) => {
            if (res.code === 202100) {
              manager.set(
                "receiveTask",
                () => awardInstance.handelReceive(),
                SlowerTime
              );
            } else {
              manager.set(
                "receiveTask",
                () => awardInstance.handelReceive(),
                ReceiveTime
              );
            }
          });
        return res;
      },
      (err) => err
    );
  }
  return originalFetch.call(this, input, init);
};

const manager = new TimerManager();

window.addEventListener("load", function () {
  manager.set("receiveTask", () => awardInstance.handelReceive(), ReceiveTime);
  awardInstance.$watch("pageError", function (newVal, oldVal) {
    this.pageError = false;
  });
});
