// ==UserScript==
// @name        rush4award
// @namespace   vurses
// @license     Mit
// @match       https://www.bilibili.com/blackboard/new-award-exchange.html?task_id=*
// @version     3.0.0
// @author      layenh
// @icon        https://i0.hdslb.com/bfs/activity-plat/static/b9vgSxGaAg.png
// @description
// @run-at      document-start
// @grant       none
// @description 🔥功能介绍： 1、支持B站所有激励计划，是否成功取决于b站接口是否更新，与游戏版本无关； 
// ==/UserScript==
const Time = 1000;
 
// 拦截window.webpackJsonp 的 push，劫持其模块
window.webpackJsonp = window.webpackJsonp || [];
const originalPush = window.webpackJsonp.push;
 
window.webpackJsonp.push = function (item) {
  if (Array.isArray(item) && "2b0e" in item[1]) {
    let temp = item[1]["2b0e"].toString();
    // 暴露vue实例
    temp.indexOf("t._watchers=[];var e=t.$options;");
    temp = temp.replace(
      `t._watchers=[];var e=t.$options;`,
      (res) => res + "window._rewardEntity = e;"
    );
    temp = eval("(" + temp + ")");
    item[1]["2b0e"] = temp;
  }
  return originalPush.call(this, item);
};
document.addEventListener(
  "visibilitychange",
  function (event) {
    event.stopImmediatePropagation(); // 阻断b站设置的visibilitychange监听器
  },
  true
);
(function () {
  const timer = setInterval(() => {
    // 获取到cdKey取消执行
    if (window._rewardEntity?.parent?.cdKey) {
      clearInterval(timer);
    }
    // b站程序猿的typo：handle=>handel
    window._rewardEntity.parent.handelReceive();
    console.log(window._rewardEntity.parent.receiveBtnText);
    // essentialKey:receiveBtnText,gaia_vtoken,cdKey,date
    // todo:倒计时
  }, Time);
})();