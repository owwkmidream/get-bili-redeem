// ==UserScript==
// @name        rush4award Stable
// @namespace   github.com/owwkmidream
// @license     Mit
// @match       https://www.bilibili.com/blackboard/new-award-exchange.html?task_id=*
// @version     3.5.2
// @author      owwk
// @icon        https://i0.hdslb.com/bfs/activity-plat/static/b9vgSxGaAg.png
// @homepage    https://github.com/owwkmidream/get-bili-redeem
// @supportURL  https://github.com/owwkmidream/get-bili-redeem/issues
// @run-at      document-start
// @grant       none
// @description 🔥功能介绍：1、支持B站所有激励计划，是否成功取决于b站接口是否更新，与游戏版本无关；2、根据验证码通过情况自适应请求速度；3、支持定时兑换功能
// ==/UserScript==

// 定时兑换的时间设置，格式为"HH:MM:SS:mmm"，例如"01:00:00:000"表示1点整定时，设置为"0"则不启用定时功能
const TimerTime = "01:00:00:200"; // 在这里设置定时时间

// 定义领取奖励的时间间隔（毫秒）
const ReceiveTime = 1000; // 正常请求间隔：1秒
const SlowerTime = 10000; // 遇到验证码后的较慢请求间隔：10秒

// 定义Web Worker的代码，用于在后台线程中管理定时任务
const workerJs = function () {
  // TimerManager类：用于管理定时器
  class TimerManager {
    constructor() {
      this.timers = new Map(); // 使用Map存储定时器ID
    }

    // 设置定时器
    set(key, callback, delay) {
      this.clean(key); // 清除可能存在的同名定时器
      const id = setTimeout(() => {
        callback();
      }, delay);
      this.timers.set(key, id); // 存储定时器ID
    }

    // 清除特定定时器
    clean(key) {
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
        this.timers.delete(key);
      }
    }

    // 清除所有定时器
    cleanAll() {
      for (let id of this.timers.values()) {
        clearTimeout(id);
      }
      this.timers.clear();
    }

    // 检查是否存在特定定时器
    has(key) {
      return this.timers.has(key);
    }
  }

  // 创建定时器管理器实例
  const manager = new TimerManager();
  let countdownInterval = null;
  
  // 任务处理器映射表
  const taskHandlers = {};
  
  // 注册任务处理器
  function registerTaskHandler(taskName, handler) {
    taskHandlers[taskName] = handler;
  }
  
  // 注册所有任务处理器
  function registerAllTaskHandlers() {
    // 注册接收任务处理器
    registerTaskHandler("receiveTask", (taskName, delay, data) => {
      manager.set(taskName, () => self.postMessage({
        Msg: "signal",
        Data: null
      }), delay);
    });
    
    // 注册定时任务处理器
    registerTaskHandler("timerTask", (taskName, delay, data) => {
      const updateInterval = 100;
      if (!data || data.timerTime === "0") return; // 如果定时设置为0，不处理

      // 解析定时时间
      const [hours, minutes, seconds, milliseconds] = data.timerTime.split(":").map(Number);

      // 计算目标时间
      const now = new Date();
      const targetTime = new Date();
      targetTime.setHours(hours, minutes, seconds, milliseconds);

      // 如果目标时间已经过去，则设置为明天的同一时间
      if (targetTime <= now) {
        targetTime.setDate(targetTime.getDate() + 1);
      }

      // 计算时间差（毫秒）
      let timeLeft = targetTime - now;

      // 设置定时器
      manager.set(taskName, () => {
        self.postMessage({
          Msg: "timerReached",
          Data: null
        });
      }, timeLeft);

      // 设置每秒倒计时更新
      if (countdownInterval) clearInterval(countdownInterval);
      countdownInterval = setInterval(() => {
        timeLeft -= updateInterval;

        if (timeLeft <= 0) {
          clearInterval(countdownInterval);
          countdownInterval = null;
          return;
        }

        // 计算剩余时间
        const h = Math.floor(timeLeft / 3600000);
        const m = Math.floor((timeLeft % 3600000) / 60000);
        const s = Math.floor((timeLeft % 60000) / 1000);
        const ms = timeLeft % 1000;

        // 发送倒计时更新
        self.postMessage({
          Msg: "countdown",
          Data: {
            timeLeft: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${ms.toString().padStart(3, '0')}`,
            targetTime: targetTime.toLocaleString()
          }
        });
      }, updateInterval);
    });
    
    // 注册默认处理器
    registerTaskHandler("default", (taskName, delay, data) => {
      manager.set(taskName, () => {
        self.postMessage({
          Msg: taskName,
          Data: data
        });
      }, delay);
    });
  }
  
  // 注册所有任务处理器
  registerAllTaskHandlers();

  // 监听来自主线程的消息
  self.addEventListener("message", function (e) {
    const data = e.data;
    
    // 确保消息是对象且符合规定的格式
    if (!data || typeof data !== 'object' || !data.TaskName || !('Delay' in data)) {
      console.error('%c Rush4award %c Worker：收到无效消息格式: ', "background: purple; color: white; padding: 2px 4px; border-radius: 3px;", "color: red;", data);
      return;
    }
    
    const { TaskName, Delay, Data } = data;
    
    // 查找并执行对应的处理器
    const handler = taskHandlers[TaskName] || taskHandlers["default"];
    if (handler) {
      handler(TaskName, Delay, Data);
    } else {
      console.error(`%c Rush4award %c Worker: 未找到处理器，任务类型: ${TaskName}`, "background: purple; color: white; padding: 2px 4px; border-radius: 3px;", "color: red;");
    }
  });
};

// 转换Worker函数为字符串
workerJs.toString();
// 创建一个Blob对象，包含Worker代码
const blob = new Blob([`(${workerJs})()`], { type: "application/javascript" });
// 创建一个URL对象，指向Blob
const url = URL.createObjectURL(blob);
// 使用URL创建Web Worker
const worker = new Worker(url);

// 保存原始的Function.prototype.call方法
const originalCall = Function.prototype.call;

// 重写Function.prototype.call方法
Function.prototype.call = function (...args) {
  // 检查当前函数名是否为"fb94"（B站奖励组件的关键函数）
  if (this.name === "fb94") {
    let temp = this.toString(); // 获取函数的字符串表示
    temp.indexOf("this.$nextTick(()=>{}),"); // 查找特定模式（这行代码没有实际效果，可能是调试遗留）

    // 修改函数代码，将组件实例暴露到window对象上
    temp = temp.replace(
      `this.$nextTick(()=>{}),`,
      (res) =>
        res +
        "Object.assign(window,{awardInstance:this}),Object.assign(window,{utils:v})," // 暴露
    );

    // 禁用错误对话框显示
    temp = temp.replace(
      `setCommonDialog(t){b.commonErrorDialog=t},`,
      `setCommonDialog(t){},`
    );

    // 防止验证码组件被销毁
    temp = temp.replace(`e.destroy()`, ``);

    // 将修改后的字符串转换回函数
    temp = eval("(" + temp + ")");

    // 使用修改后的函数替代原函数
    return originalCall.apply(temp, args);
  }
  // 对其他函数，正常调用原始的call方法
  return originalCall.apply(this, args);
};

// 保存原始的fetch函数
const originalFetch = window.fetch;

// 重写fetch函数
window.fetch = function (input, init = {}) {
  let url = "";
  // 处理input参数可能是字符串或Request对象的情况
  if (typeof input === "string") {
    url = input;
  } else if (input instanceof Request) {
    url = input.url;
  }

  // 检查是否是领取奖励的请求
  if (url.includes("/x/activity_components/mission/receive")) {
    return originalFetch
      .call(this, input, init)
      .then((res) => {
        // 克隆响应并解析JSON
        res
          .clone()
          .json()
          .then((res) => {
            // 根据返回码调整请求速度
            console.log("%c Rush4award %c ", "background: purple; color: white; padding: 2px 4px; border-radius: 3px;", "color: black;", res);
            if (res.code === 202100) { // 202100通常表示需要验证码
              document.querySelector("a.geetest_close")?.click() // 关闭验证码
              worker.postMessage({
                TaskName: "receiveTask",
                Delay: SlowerTime
              }); // 减慢请求速度
            } else {
              worker.postMessage({
                TaskName: "receiveTask",
                Delay: ReceiveTime
              }); // 使用正常请求速度
            }
          });
        return res;
      })
      .catch((e) => {
        console.log("%c Rush4award %c 请求错误", "background: purple; color: white; padding: 2px 4px; border-radius: 3px;", "color: black;", e);
      });
  }
  // 对其他请求，正常调用原始的fetch函数
  return originalFetch.call(this, input, init);
};

// 创建消息处理器映射表
const messageHandlers = {};

// 注册消息处理器
function registerHandler(msgType, handler) {
  messageHandlers[msgType] = handler;
}

// 启用已禁用的按钮
function enableDisabledButton() {
  const disabledButton = document.querySelector('.button.disable');
  if (disabledButton) {
    disabledButton.classList.remove('disable');
    console.log("%c Rush4award %c 已启用按钮", "background: purple; color: white; padding: 2px 4px; border-radius: 3px;", "color: green;");
    setTimeout(enableDisabledButton, 500); // 如果未找到按钮，0.5秒后重试
  } else {
    setTimeout(enableDisabledButton, 500); // 如果未找到按钮，0.5秒后重试
  }
}

// 创建倒计时显示元素
function createCountdownDisplay() {
  const sectionTitle = document.querySelector('.section-title');
  if (sectionTitle) {
    // 创建Patch标记
    const patchSpan = document.createElement('span');
    patchSpan.textContent = ' Patch';
    patchSpan.style.color = 'purple';
    patchSpan.style.display = 'inline';
    sectionTitle.appendChild(patchSpan);

    // 创建倒计时容器
    if (TimerTime !== "0") {
      const countdownDiv = document.createElement('div');
      countdownDiv.id = 'rush4award-countdown';
      countdownDiv.style.color = 'red';
      countdownDiv.style.fontWeight = 'bold';
      countdownDiv.style.marginTop = '5px';
      countdownDiv.textContent = '倒计时加载中...';
      sectionTitle.parentNode.insertBefore(countdownDiv, sectionTitle.nextSibling);
    }
  } else {
    setTimeout(createCountdownDisplay, 500); // 如果未找到标题，0.5秒后重试
  }
}

function createBounsInfoDisplay() {
  // 创建奖励信息显示元素
  const extraInfo = document.querySelector('p.extra-info:last-child');
  if (extraInfo) {
    // 创建剩余量显示
    const totalStockEl = document.createElement('p');
    totalStockEl.classList = 'extra-info total-stock';
    totalStockEl.textContent = '总剩余量：';
    extraInfo.parentNode.insertBefore(totalStockEl, extraInfo.nextSibling);

    // 创建兑换码显示
    const cdKeyEl = document.createElement('p');
    cdKeyEl.classList = 'extra-info cd-key';
    cdKeyEl.textContent = `cdKey：`;
    extraInfo.parentNode.insertBefore(cdKeyEl, extraInfo.nextSibling);

    // 创建worker定时
    window.updateBounsInfoInterval = setInterval(() => {
      worker.postMessage({
        TaskName: "updateBounsInfo",
        Delay: 0,
        Data: null
      });
    }, 1000);
  } else {
    setTimeout(createBounsInfoDisplay, 500); // 如果未找到元素，0.5秒后重试
  }
}

// 页面加载完成后执行
window.addEventListener("load", function () {
  // 等待awardInstance初始化
  waitForElement(
    () => typeof awardInstance !== 'undefined' && !awardInstance.cdKey, 
    initializeAward,
    30,  // 最大尝试次数 (30次 * 100ms = 3秒)
    100  // 每次间隔100ms
  );
});

// 待元素出现或条件满足
function waitForElement(condition, callback, maxTries = 30, interval = 100) {
  let tries = 0;
  
  function check() {
    if (condition()) {
      // 条件满足，执行回调
      callback();
    } else {
      tries++;
      
      if (tries >= maxTries) {
        // 超过最大尝试次数，刷新页面
        console.log("%c Rush4award %c 等待超时，刷新页面...", "background: purple; color: white; padding: 2px 4px; border-radius: 3px;", "color: red;");
        location.reload();
        return;
      }
      
      // 输出等待信息
      console.log(`%c Rush4award %c 等待初始化...(${tries}/${maxTries})`, "background: purple; color: white; padding: 2px 4px; border-radius: 3px;", "color: black;");
      setTimeout(check, interval);
    }
  }
  
  // 开始检查
  check();
}

function registerAllHandlers() {
  // 注册信号处理器 - 执行领取操作
  registerHandler("signal", () => {
    console.log("%c Rush4award %c 收到信号: 执行领取操作", "background: purple; color: white; padding: 2px 4px; border-radius: 3px;", "color: black;");
    awardInstance.handelReceive();
  });

  // 注册定时器到达处理器
  registerHandler("timerReached", () => {
    console.log("%c Rush4award %c 定时时间已到！执行领取操作", "background: purple; color: white; padding: 2px 4px; border-radius: 3px;", "color: red;");
    awardInstance.handelReceive();
  });

  // 注册倒计时更新处理器
  registerHandler("countdown", (data) => {
    const countdownDiv = document.getElementById('rush4award-countdown');
    if (countdownDiv) {
      const timeLeft = data.timeLeft;
      const targetTime = data.targetTime;
      countdownDiv.innerHTML = `定时: ${targetTime}<br>倒计时: ${timeLeft}`;
    }
  });

  // 注册奖励信息更新处理器
  registerHandler("updateBounsInfo", () => {
    const totalStockEl = document.querySelector('p.extra-info.total-stock');
    const cdKeyEl = document.querySelector('p.extra-info.cd-key');

    if (totalStockEl && cdKeyEl) {
      if (awardInstance.bounsInfo.status === 6)
      {
        utils.getBounsHistory(awardInstance.actId).then((res) => {
          // 根据活动id取出对应兑换码
          const id = awardInstance.awardInfo.award_inner_id || 0;
          const i = res?.list?.find((t) => t.award_id === id);
          awardInstance.cdKey = i?.extra_info?.cdkey_content || "";
          cdKeyEl.innerHTML = `cdKey：<span onclick="navigator.clipboard.writeText('${awardInstance.cdKey}')">${awardInstance.cdKey}</span>`;
        });
      }
      utils.getBounsInfo(awardInstance.taskId).then((res) => {
        totalStockEl.textContent = `总剩余量：${res.stock_info.total_stock}%`;
      });
    }
  });
}

// 初始化奖励相关功能
function initializeAward() {
  console.log("%c Rush4award %c 页面加载完成", "background: purple; color: white; padding: 2px 4px; border-radius: 3px;", "color: black;");

  // 创建倒计时显示
  createCountdownDisplay();

  // 创建任务余额显示
  createBounsInfoDisplay();

  // 启用已禁用的按钮
  enableDisabledButton();

  // 注册woker监听handler
  registerAllHandlers();

  // 如果定时功能已启用，则发送定时任务给Worker
  if (TimerTime !== "0") {
    console.log("%c Rush4award %c 定时功能已启用，设定时间为: " + TimerTime, "background: purple; color: white; padding: 2px 4px; border-radius: 3px;", "color: blue;");
    worker.postMessage({
      TaskName: "timerTask",
      Delay: 0,
      Data: {
        timerTime: TimerTime
      }
    });
  } else {
    // 未启用定时，延迟1秒后执行第一次领取
    setTimeout(() => {
      awardInstance.handelReceive();
    }, 1000);
  }

  // 监听pageError属性变化，自动隐藏错误
  awardInstance.$watch("pageError", function (newVal, oldVal) {
    this.pageError = false;
  });

  // 监听cdKey属性变化，当获取到cdKey时，恢复原始fetch并终止Worker
  awardInstance.$watch("cdKey", function (newVal, oldVal) {
    window.fetch = originalFetch;
    worker.terminate();
  });

  // 监听Worker消息，使用注册的处理器处理不同类型的消息
  worker.addEventListener("message", function (e) {
    const data = e.data;

    // 确定消息类型和数据
    const msgType = data.Msg;
    const msgData = data.Data;

    // 查找并执行对应的处理器
    const handler = messageHandlers[msgType];
    if (handler) {
      handler(msgData);
    } else {
      console.log("%c Rush4award %c 未处理的消息类型: " + msgType, "background: purple; color: white; padding: 2px 4px; border-radius: 3px;", "color: orange;");
    }
  });
}