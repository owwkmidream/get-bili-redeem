// ==UserScript==
// @name        rush4award Stable
// @namespace   github.com/owwkmidream
// @license     Mit
// @match       https://www.bilibili.com/blackboard/new-award-exchange.html?task_id=*
// @version     3.5.7
// @author      owwk
// @icon        https://i0.hdslb.com/bfs/activity-plat/static/b9vgSxGaAg.png
// @homepage    https://github.com/owwkmidream/get-bili-redeem
// @supportURL  https://github.com/owwkmidream/get-bili-redeem/issues
// @run-at      document-start
// @grant       none
// @description 🔥功能介绍：1、支持B站所有激励计划，是否成功取决于b站接口是否更新，与游戏版本无关；2、根据验证码通过情况自适应请求速度；3、支持定时兑换功能
// ==/UserScript==

// 封装console输出的函数
function logMessage(message, color = "black", ...args) {
  console.log(
    "%c Rush4award %c " + message,
    "background: purple; color: white; padding: 2px 4px; border-radius: 3px;",
    "color: " + color + ";",
    ...args
  );
}

// 封装console错误输出的函数
function logError(message, color = "red", ...args) {
  console.error(
    "%c Rush4award %c " + message,
    "background: purple; color: white; padding: 2px 4px; border-radius: 3px;",
    "color: " + color + ";",
    ...args
  );
}

// 定时兑换的时间设置，格式为"HH:MM:SS:mmm"，例如"01:00:00:000"表示1点整定时，设置为"0"则不启用定时功能
const TimerTime = "01:00:00:200"; // 在这里设置定时时间

// 定义领取奖励的时间间隔（毫秒）
const ReceiveTime = 1000; // 正常请求间隔：1秒
const SlowerTime = 10000; // 遇到验证码后的较慢请求间隔：10秒
const BonusInfoUpdateInterval = 2000; // 奖励信息更新间隔：2秒

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
      logError('Worker：收到无效消息格式: ', "red", data);
      return;
    }
    
    const { TaskName, Delay, Data } = data;
    
    // 查找并执行对应的处理器
    const handler = taskHandlers[TaskName] || taskHandlers["default"];
    if (handler) {
      handler(TaskName, Delay, Data);
    } else {
      logError(`Worker: 未找到处理器，任务类型: ${TaskName}`, "red");
    }
  });
};

// 创建Worker
const blob = new Blob([`(${workerJs})()`], { type: "application/javascript" });
const url = URL.createObjectURL(blob);
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
            logMessage(res, "black", res);
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
        logMessage("请求错误", "black", e);
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
  // 找到需要监听的按钮
  waitForElement(
    () => document.querySelector('.button.disable'),
    (targetButton) => {
      // 先移除禁用状态
      targetButton.classList.remove('disable');
      logMessage("已启用按钮", "green");
      
      // 创建针对这个按钮的观察器
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            // 当按钮的class属性变化且包含disable类时，移除该类
            if (targetButton.classList.contains('disable')) {
              targetButton.classList.remove('disable');
              logMessage("已启用按钮", "green");
            }
          }
        });
      });
      
      // 只观察这个按钮的class属性变化
      observer.observe(targetButton, {
        attributes: true,
        attributeFilter: ['class']
      });
      
      // 3秒后停止观察
      setTimeout(() => {
        observer.disconnect();
      }, 3000);
    },
    100,  // 间隔100ms
    3000  // 超时时间3秒
  );
}

// 创建倒计时显示元素
function createCountdownDisplay() {
  waitForElement(
    () => document.querySelector('.section-title'),
    (sectionTitle) => {
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
    },
    500,  // 间隔500ms
    3000  // 超时时间15秒
  );
}

function createBonusInfoDisplay() {
  // 创建奖励信息显示元素
  waitForElement(
    () => document.querySelector('p.extra-info:last-child'),
    (extraInfo) => {
      // 创建兑换码显示
      const cdKeyEl = document.createElement('p');
      cdKeyEl.classList = 'extra-info cd-key';
      cdKeyEl.textContent = `cdKey：________`;
      extraInfo.parentNode.insertBefore(cdKeyEl, extraInfo.nextSibling);

      // 创建剩余量显示
      const stockDiv = document.createElement('div');
      stockDiv.className = 'extra-info';
      stockDiv.style.display = 'flex';
      stockDiv.style.gap = '20px'
      const totalStockEl = document.createElement('p');
      const dayLeftEl = document.createElement('p');
      totalStockEl.textContent = '总剩余量：__';
      totalStockEl.classList = 'total-stock';
      dayLeftEl.textContent = '__天'
      dayLeftEl.classList = 'day-left';
      stockDiv.appendChild(totalStockEl);
      stockDiv.appendChild(Object.assign(document.createElement('p'), {textContent: '/'}));
      stockDiv.appendChild(dayLeftEl);
      cdKeyEl.parentNode.insertBefore(stockDiv, cdKeyEl.nextSibling);

      // 创建worker定时
      setInterval(() => {
        worker.postMessage({
          TaskName: "updateBonusInfo",
          Delay: 0,
          Data: null
        });
      }, BonusInfoUpdateInterval);
    },
    500,  // 间隔500ms
    3000  // 超时时间15秒
  );
}

// 页面加载完成后执行
window.addEventListener("load", function () {
  // 等待awardInstance初始化
  waitForElement(
    () => typeof awardInstance !== 'undefined' && !awardInstance.cdKey, 
    () => initializeAward(),
    100,  // 每次间隔100ms
    3000,  // 超时时间3秒
    () => {
      logMessage("等待超时 刷新", "red");
      window.location.reload();
    }
  );
});

// 待元素出现或条件满足
function waitForElement(condition, callback, interval = 100, timeout = 3000, failCallback = null) {
  let startTime = Date.now();
  let elapsed = 0;
  
  function check() {
    const result = condition();
    if (result) {
      // 条件满足，执行回调
      callback(result === true ? null : result);
    } else {
      elapsed = Date.now() - startTime;
      
      if (elapsed >= timeout) {
        // 超过超时时间，执行失败回调
        logMessage("等待超时", "red");
        if (typeof failCallback === 'function') {
          failCallback();
        }
        // 默认失败回调什么都不做
        return;
      }
      
      // 输出等待信息
      logMessage(`等待初始化...(${(elapsed/1000).toFixed(2)}s/${(timeout/1000).toFixed(2)}s)`, "black");
      setTimeout(check, interval);
    }
  }
  
  // 开始检查
  check();
}

function registerAllHandlers() {
  // 注册信号处理器 - 执行领取操作
  registerHandler("signal", () => {
    logMessage("收到信号: 执行领取操作", "black");
    awardInstance.handelReceive();
  });

  // 注册定时器到达处理器
  registerHandler("timerReached", () => {
    logMessage("定时时间已到！执行领取操作", "red");
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
  registerHandler("updateBonusInfo", () => {
    const totalStockEl = document.querySelector('p.total-stock');
    const dayLeftEl = document.querySelector('p.day-left');
    const cdKeyEl = document.querySelector('p.cd-key');

    if (totalStockEl && cdKeyEl && dayLeftEl) {
      if (awardInstance.bonusInfo.status === 6)
      {
        utils.getBonusHistory(awardInstance.actId).then((res) => {
          // 根据活动id取出对应兑换码
          const id = awardInstance.awardInfo.award_inner_id || 0;
          const i = res?.list?.find((t) => t.award_id === id);
          awardInstance.cdKey = i?.extra_info?.cdkey_content || "";
          cdKeyEl.innerHTML = `cdKey：<span onclick="navigator.clipboard.writeText('${awardInstance.cdKey}'); this.innerHTML = '${awardInstance.cdKey}<span style=\\'color:purple;\\'> 复制成功</span>'">${awardInstance.cdKey}</span>`;
        });
      }
      utils.getBonusInfo(awardInstance.taskId).then((res) => {
        totalStockEl.textContent = `总剩余量：${res.stock_info.total_stock}%`;
        const desc = awardInstance.awardInfo.award_description;
        const match = desc.match(/(\d{2,}).*?(\d{2,})份/);
        if (match) {
          const [_, total, daily] = match;
          const dayPercent = (daily / total) * 100;
          const daysLeft = Math.ceil(res.stock_info.total_stock / dayPercent);
          dayLeftEl.textContent = `${daysLeft}天`;
        }
      });
    }
  });
}

// 初始化奖励相关功能
function initializeAward() {
  logMessage("页面加载完成", "black");

  // 创建倒计时显示
  createCountdownDisplay();

  // 创建任务余额显示
  createBonusInfoDisplay();

  // 启用已禁用的按钮
  enableDisabledButton();

  // 注册woker监听handler
  registerAllHandlers();

  // 如果定时功能已启用，则发送定时任务给Worker
  if (TimerTime !== "0") {
    logMessage("定时功能已启用，设定时间为: " + TimerTime, "blue");
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

  // 监听cdKey属性变化，当获取到cdKey时，恢复原始fetch并终止Worker和Observer
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
      logMessage("未处理的消息类型: " + msgType, "orange");
    }
  });
}