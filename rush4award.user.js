// ==UserScript==
// @name        rush4award
// @namespace   Violentmonkey Scripts
// @license Mit
// @match       https://www.bilibili.com/blackboard/new-award-exchange.html?task_id=*
// @require     https://cdn.bootcdn.net/ajax/libs/axios/1.7.2/axios.js
// @grant       GM_addStyle
// @version     2.0.0
// @author      vurses
// @icon         https://i0.hdslb.com/bfs/activity-plat/static/b9vgSxGaAg.png
// @description    🔥功能介绍🔥：🎉 1、支持B站所有激励计划，是否成功取决于b站接口是否更新，与游戏版本无关；🎉 2、打开对应一个兑换码页面自动运行；
// @downloadURL https://update.greasyfork.org/scripts/492729/Bili%E5%85%91%E6%8D%A2%E7%A0%81%E6%8A%A2%E8%B4%AD.user.js
// @updateURL https://update.greasyfork.org/scripts/492729/Bili%E5%85%91%E6%8D%A2%E7%A0%81%E6%8A%A2%E8%B4%AD.meta.js
// ==/UserScript==

(function() {
    const Time = 1000; //请求频率，可修改
    // 比如100表示每1秒抢10次，关闭兑换码页面停止执行）
    // 1000表示1秒抢1次
    /*html和css*/
    function createHTML() {
        // 创建<div>元素
        let container = document.createElement("div");
        container.style.position = "fixed";
        container.style.zIndex = 100;
        container.innerHTML = `<ul class="notifications">
              </ul>
              <div class="buttons">
                  <button class="btn" id=${
                    localStorage.getItem("showToast") === "true"
                      ? "success"
                      : "warning"
                  }>消息提示</button>
              </div>`;
        document.body.appendChild(container);

        const link = document.createElement("link");
        link.rel = "stylesheet";
        // 该css样式引入了其它cdn,避免无法显示
        link.href =
            "https://cdn.bootcdn.net/ajax/libs/font-awesome/6.2.1/css/all.min.css";
        document.head.appendChild(link);
    }
    // 添加样式
    function addStyle() {
        let css = `
      :root {
      --dark: #34495e;
      --light: #fff;
      --success: #0abf30;
      --error: #e24d4c;
      --warning: #e9bd0c;
      --info: #3498db;
  }
  
  * {
      padding: 0;
      margin: 0;
      box-sizing: border-box;
  }
  
  body {
      /* font-family: 'Poppins', sans-serif; */
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background-color: var(--dark);
  }
  
  .notifications :where(.toast, .column) {
      display: flex;
      align-items: center;
  }
  
  .notifications {
      position: fixed;
      top: 30px;
      right: 20px;
  }
  
  .notifications .toast {
      width: 400px;
      list-style: none;
      position: relative;
      overflow: hidden;
      border-radius: 4px;
      padding: 16px 17px;
      margin-bottom: 10px;
      background-color: var(--light);
      justify-content: space-between;
      animation: show_toast 0.3s forwards;
  }
  
  @keyframes show_toast {
      0% {
          transform: translateX(100%);
      }
      40% {
          transform: translateX(-5%);
      }
      80% {
          transform: translateX(0);
      }
      100% {
          transform: translateX(-10px);
      }
  }
  
  .toast .column i {
      font-size: 1.75rem;
  }
  
  .toast.hide {
      animation: hide_toast 0.3s forwards;
  }
  
  @keyframes hide_toast {
      0% {
          transform: translateX(-10%);
      }
      40% {
          transform: translateX(0%);
      }
      80% {
          transform: translateX(-5%);
      }
      100% {
          transform: translateX(calc(100% + 20px));
      }
  }
  
  .toast .column span {
      font-size: 1.07rem;
      margin-left: 12px;
  }
  
  .toast i:last-child {
      color: #aeb0d7;
      cursor: pointer;
  }
  
  .toast i:last-child:hover {
      color: var(--dark);
  }
  
  .toast::before {
      content: '';
      position: absolute;
      left: 0;
      bottom: 0;
      width: 100%;
      height: 3px;
      animation: progress 5s linear forwards;
  }
  
  @keyframes progress {
      100% {
          width: 0;
      }
  }
  
  .toast.success::before,
  .btn#success {
      background-color: var(--success);
  }
  
  .toast.error::before,
  .btn#error {
      background-color: var(--error);
  }
  
  .toast.warning::before,
  .btn#warning {
      background-color: var(--warning);
  }
  
  .toast.info::before,
  .btn#info {
      background-color: var(--info);
  }
  
  .toast.success .column i {
      color: var(--success);
  }
  
  .toast.error .column i {
      color: var(--error);
  }
  
  .toast.warning .column i {
      color: var(--warning);
  }
  
  .toast.info .column i {
      color: var(--info);
  }
  
  .buttons .btn {
      border: none;
      outline: none;
      color: var(--light);
      cursor: pointer;
      padding: 10px 20px;
      border-radius: 4px;
  }
  
  @media screen and (max-width: 530px) {
      .notifications {
          width: 95%;
      }
      .notifications .toast {
          width: 100%;
          font-size: 1rem;
          margin-left: 20px;
      }
      .buttons .btn {
          margin: 0 1px;
          font-size: 0.2rem;
          padding: 8px 15px;
      }
  }
      `;

        GM_addStyle(css);
    }
    // 添加脚本
    function addScript() {
        const s = document.createElement("script");
        s.innerHTML = `function removeToast(toast) {
          toast.classList.add('hide')
          if (toast.timeoutId) clearTimeout(toast.timeoutId) // 清除setTimeout
              // 移除li元素
          setTimeout(() => {
              toast.remove()
          }, 100)
      }`;
        document.body.appendChild(s);
    }

    function removeToast(toast) {
        toast.classList.add("hide");
        if (toast.timeoutId) clearTimeout(toast.timeoutId); // 清除setTimeout
        // 移除li元素
        setTimeout(() => {
            toast.remove();
        }, 100);
    }
    // 创建提示框
    const createToast = (state, text) => {
        const { icon } = toastDetails[state];
        const toast = document.createElement("li"); // 创建li元素
        toast.className = `toast ${state}`; // 为li元素新增样式
        toast.innerHTML = `<div class="column">
       <i class="fa-solid ${icon}" style='font-size:0.2rem'></i>
       <span style='font-size:0.2rem'>${text}</span>
      </div>
      <i class="fa-solid fa-xmark" onClick="removeToast(this.parentElement)" style='font-size:0.2rem'></i>`;
        notifications.appendChild(toast); // 添加元素到 notifications ul
        // 5秒后 隐藏toast
        toast.timeoutId = setTimeout(() => removeToast(toast), toastDetails.timer);
    };
    //是否显示提示框
    function isShowToast() {
        let showToast = localStorage.getItem("showToast") === "true";

        function toggleToast() {
            showToast = !showToast;
            localStorage.setItem("showToast", showToast);
            showToast
                ?
                (document.querySelector(".notifications").style.display = "block") :
                (document.querySelector(".notifications").style.display = "none");
            showToast ? (this.id = "success") : (this.id = "warning");
        }

        // 初始化showToast的值
        showToast ? (this.id = "success") : (this.id = "warning");
        showToast
            ?
            (document.querySelector(".notifications").style.display = "block") :
            (document.querySelector(".notifications").style.display = "none");

        // 添加事件监听器，仅需添加一次
        document.querySelector(".btn").addEventListener("click", toggleToast);
    }
    /*生成wid签名*/
    const dataProcessor = {
        exports: {}
    };
    !(function() {
        var t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
            e = {
                rotl: function(t, e) {
                    return (t << e) | (t >>> (32 - e));
                },
                rotr: function(t, e) {
                    return (t << (32 - e)) | (t >>> e);
                },
                endian: function(t) {
                    if (t.constructor == Number)
                        return (16711935 & e.rotl(t, 8)) | (4278255360 & e.rotl(t, 24));
                    for (var n = 0; n < t.length; n++) t[n] = e.endian(t[n]);
                    return t;
                },
                randomBytes: function(t) {
                    for (var e = []; t > 0; t--) e.push(Math.floor(256 * Math.random()));
                    return e;
                },
                bytesToWords: function(t) {
                    for (var e = [], n = 0, r = 0; n < t.length; n++, r += 8)
                        e[r >>> 5] |= t[n] << (24 - (r % 32));
                    return e;
                },
                wordsToBytes: function(t) {
                    for (var e = [], n = 0; n < 32 * t.length; n += 8)
                        e.push((t[n >>> 5] >>> (24 - (n % 32))) & 255);
                    return e;
                },
                bytesToHex: function(t) {
                    for (var e = [], n = 0; n < t.length; n++)
                        e.push((t[n] >>> 4).toString(16)), e.push((15 & t[n]).toString(16));
                    return e.join("");
                },
                hexToBytes: function(t) {
                    for (var e = [], n = 0; n < t.length; n += 2)
                        e.push(parseInt(t.substr(n, 2), 16));
                    return e;
                },
                bytesToBase64: function(e) {
                    for (var n = [], r = 0; r < e.length; r += 3)
                        for (
                            var i = (e[r] << 16) | (e[r + 1] << 8) | e[r + 2], o = 0; o < 4; o++
                        )
                            8 * r + 6 * o <= 8 * e.length ?
                            n.push(t.charAt((i >>> (6 * (3 - o))) & 63)) :
                            n.push("=");
                    return n.join("");
                },
                base64ToBytes: function(e) {
                    e = e.replace(/[^A-Z0-9+\/]/gi, "");
                    for (var n = [], r = 0, i = 0; r < e.length; i = ++r % 4)
                        0 != i &&
                        n.push(
                            ((t.indexOf(e.charAt(r - 1)) & (Math.pow(2, -2 * i + 8) - 1)) <<
                                (2 * i)) |
                            (t.indexOf(e.charAt(r)) >>> (6 - 2 * i))
                        );
                    return n;
                }
            };
        dataProcessor.exports = e;
    })();
    const encode = {
        utf8: {
            stringToBytes: function(t) {
                return encode.bin.stringToBytes(unescape(encodeURIComponent(t)));
            },
            bytesToString: function(t) {
                return decodeURIComponent(escape(u.bin.bytesToString(t)));
            }
        },
        bin: {
            stringToBytes: function(t) {
                for (var e = [], n = 0; n < t.length; n++)
                    e.push(255 & t.charCodeAt(n));
                return e;
            },
            bytesToString: function(t) {
                for (var e = [], n = 0; n < t.length; n++)
                    e.push(String.fromCharCode(t[n]));
                return e.join("");
            }
        }
    };
    const utf8 = encode.utf8;
    const bin = encode.bin;
    const utils = dataProcessor.exports;

    const md5 = function(o, a) {
        o.constructor == String ?
            (o =
                a && "binary" === a.encoding ?
                bin.stringToBytes(o) :
                utf8.stringToBytes(o)) :
            n(o) ?
            (o = Array.prototype.slice.call(o, 0)) :
            Array.isArray(o) || o.constructor === Uint8Array || (o = o.toString());
        for (
            var s = utils.bytesToWords(o),
                c = 8 * o.length,
                u = 1732584193,
                l = -271733879,
                f = -1732584194,
                d = 271733878,
                p = 0; p < s.length; p++
        )
            s[p] =
            (16711935 & ((s[p] << 8) | (s[p] >>> 24))) |
            (4278255360 & ((s[p] << 24) | (s[p] >>> 8)));
        (s[c >>> 5] |= 128 << c % 32), (s[14 + (((c + 64) >>> 9) << 4)] = c);
        var FF = md5._ff,
            GG = md5._gg,
            HH = md5._hh,
            II = md5._ii;
        for (p = 0; p < s.length; p += 16) {
            var g = u,
                b = l,
                _ = f,
                w = d;
            (u = FF(u, l, f, d, s[p + 0], 7, -680876936)),
            (d = FF(d, u, l, f, s[p + 1], 12, -389564586)),
            (f = FF(f, d, u, l, s[p + 2], 17, 606105819)),
            (l = FF(l, f, d, u, s[p + 3], 22, -1044525330)),
            (u = FF(u, l, f, d, s[p + 4], 7, -176418897)),
            (d = FF(d, u, l, f, s[p + 5], 12, 1200080426)),
            (f = FF(f, d, u, l, s[p + 6], 17, -1473231341)),
            (l = FF(l, f, d, u, s[p + 7], 22, -45705983)),
            (u = FF(u, l, f, d, s[p + 8], 7, 1770035416)),
            (d = FF(d, u, l, f, s[p + 9], 12, -1958414417)),
            (f = FF(f, d, u, l, s[p + 10], 17, -42063)),
            (l = FF(l, f, d, u, s[p + 11], 22, -1990404162)),
            (u = FF(u, l, f, d, s[p + 12], 7, 1804603682)),
            (d = FF(d, u, l, f, s[p + 13], 12, -40341101)),
            (f = FF(f, d, u, l, s[p + 14], 17, -1502002290)),
            (u = GG(
                u,
                (l = FF(l, f, d, u, s[p + 15], 22, 1236535329)),
                f,
                d,
                s[p + 1],
                5, -165796510
            )),
            (d = GG(d, u, l, f, s[p + 6], 9, -1069501632)),
            (f = GG(f, d, u, l, s[p + 11], 14, 643717713)),
            (l = GG(l, f, d, u, s[p + 0], 20, -373897302)),
            (u = GG(u, l, f, d, s[p + 5], 5, -701558691)),
            (d = GG(d, u, l, f, s[p + 10], 9, 38016083)),
            (f = GG(f, d, u, l, s[p + 15], 14, -660478335)),
            (l = GG(l, f, d, u, s[p + 4], 20, -405537848)),
            (u = GG(u, l, f, d, s[p + 9], 5, 568446438)),
            (d = GG(d, u, l, f, s[p + 14], 9, -1019803690)),
            (f = GG(f, d, u, l, s[p + 3], 14, -187363961)),
            (l = GG(l, f, d, u, s[p + 8], 20, 1163531501)),
            (u = GG(u, l, f, d, s[p + 13], 5, -1444681467)),
            (d = GG(d, u, l, f, s[p + 2], 9, -51403784)),
            (f = GG(f, d, u, l, s[p + 7], 14, 1735328473)),
            (u = HH(
                u,
                (l = GG(l, f, d, u, s[p + 12], 20, -1926607734)),
                f,
                d,
                s[p + 5],
                4, -378558
            )),
            (d = HH(d, u, l, f, s[p + 8], 11, -2022574463)),
            (f = HH(f, d, u, l, s[p + 11], 16, 1839030562)),
            (l = HH(l, f, d, u, s[p + 14], 23, -35309556)),
            (u = HH(u, l, f, d, s[p + 1], 4, -1530992060)),
            (d = HH(d, u, l, f, s[p + 4], 11, 1272893353)),
            (f = HH(f, d, u, l, s[p + 7], 16, -155497632)),
            (l = HH(l, f, d, u, s[p + 10], 23, -1094730640)),
            (u = HH(u, l, f, d, s[p + 13], 4, 681279174)),
            (d = HH(d, u, l, f, s[p + 0], 11, -358537222)),
            (f = HH(f, d, u, l, s[p + 3], 16, -722521979)),
            (l = HH(l, f, d, u, s[p + 6], 23, 76029189)),
            (u = HH(u, l, f, d, s[p + 9], 4, -640364487)),
            (d = HH(d, u, l, f, s[p + 12], 11, -421815835)),
            (f = HH(f, d, u, l, s[p + 15], 16, 530742520)),
            (u = II(
                u,
                (l = HH(l, f, d, u, s[p + 2], 23, -995338651)),
                f,
                d,
                s[p + 0],
                6, -198630844
            )),
            (d = II(d, u, l, f, s[p + 7], 10, 1126891415)),
            (f = II(f, d, u, l, s[p + 14], 15, -1416354905)),
            (l = II(l, f, d, u, s[p + 5], 21, -57434055)),
            (u = II(u, l, f, d, s[p + 12], 6, 1700485571)),
            (d = II(d, u, l, f, s[p + 3], 10, -1894986606)),
            (f = II(f, d, u, l, s[p + 10], 15, -1051523)),
            (l = II(l, f, d, u, s[p + 1], 21, -2054922799)),
            (u = II(u, l, f, d, s[p + 8], 6, 1873313359)),
            (d = II(d, u, l, f, s[p + 15], 10, -30611744)),
            (f = II(f, d, u, l, s[p + 6], 15, -1560198380)),
            (l = II(l, f, d, u, s[p + 13], 21, 1309151649)),
            (u = II(u, l, f, d, s[p + 4], 6, -145523070)),
            (d = II(d, u, l, f, s[p + 11], 10, -1120210379)),
            (f = II(f, d, u, l, s[p + 2], 15, 718787259)),
            (l = II(l, f, d, u, s[p + 9], 21, -343485551)),
            (u = (u + g) >>> 0),
            (l = (l + b) >>> 0),
            (f = (f + _) >>> 0),
            (d = (d + w) >>> 0);
        }
        return utils.endian([u, l, f, d]);
    };
    md5._ff = function(t, e, n, r, i, o, a) {
        var s = t + ((e & n) | (~e & r)) + (i >>> 0) + a;
        return ((s << o) | (s >>> (32 - o))) + e;
    };
    md5._gg = function(t, e, n, r, i, o, a) {
        var s = t + ((e & r) | (n & ~r)) + (i >>> 0) + a;
        return ((s << o) | (s >>> (32 - o))) + e;
    };
    md5._hh = function(t, e, n, r, i, o, a) {
        var s = t + (e ^ n ^ r) + (i >>> 0) + a;
        return ((s << o) | (s >>> (32 - o))) + e;
    };
    md5._ii = function(t, e, n, r, i, o, a) {
        var s = t + (n ^ (e | ~r)) + (i >>> 0) + a;
        return ((s << o) | (s >>> (32 - o))) + e;
    };
    md5._blocksize = 16;
    md5._digestsize = 16;

    function splitWbiKey(t) {
        return t.substring(t.lastIndexOf("/") + 1, t.length).split(".")[0];
    }

    function generateWBISign(t, e) {
        e || (e = {});
        const { imgKey: n, subKey: r } = (function(t) {
            var e;
            // key硬编码,将来可能需要更换key获取方式
            // if (t.useAssignKey)
            if (true)
                return {
                    imgKey: t.wbiImgKey,
                    subKey: t.wbiSubKey
                };
            const n =
                (null ===
                    (e = (function(t) {
                        try {
                            return localStorage.getItem(t);
                        } catch (t) {
                            return null;
                        }
                    })("wbi_img_urls")) || void 0 === e ?
                    void 0 :
                    e.split("-")) || [],
                r = n[0],
                i = n[1],
                o = r ? splitWbiKey(r) : t.wbiImgKey,
                a = i ? splitWbiKey(i) : t.wbiSubKey;
            return {
                imgKey: o,
                subKey: a
            };
        })(e);
        if (n && r) {
            const e = (function(t) {
                    const e = [];
                    return (
                        [
                            46,
                            47,
                            18,
                            2,
                            53,
                            8,
                            23,
                            32,
                            15,
                            50,
                            10,
                            31,
                            58,
                            3,
                            45,
                            35,
                            27,
                            43,
                            5,
                            49,
                            33,
                            9,
                            42,
                            19,
                            29,
                            28,
                            14,
                            39,
                            12,
                            38,
                            41,
                            13,
                            37,
                            48,
                            7,
                            16,
                            24,
                            55,
                            40,
                            61,
                            26,
                            17,
                            0,
                            1,
                            60,
                            51,
                            30,
                            4,
                            22,
                            25,
                            54,
                            21,
                            56,
                            59,
                            6,
                            63,
                            57,
                            62,
                            11,
                            36,
                            20,
                            34,
                            44,
                            52
                        ].forEach((n) => {
                            t.charAt(n) && e.push(t.charAt(n));
                        }),
                        e.join("").slice(0, 32)
                    );
                })(n + r),
                i = Math.round(Date.now() / 1e3),
                o = Object.assign({}, t, {
                    wts: i
                }),
                a = Object.keys(o).sort(),
                s = [],
                c = /[!'()*]/g;
            for (let t = 0; t < a.length; t++) {
                const e = a[t];
                let n = o[e];
                n && "string" == typeof n && (n = n.replace(c, "")),
                    null != n &&
                    s.push(
                        ""
                        .concat(encodeURIComponent(e), "=")
                        .concat(encodeURIComponent(n))
                    );
            }
            const u = s.join("&");
            return {
                w_rid: hash(u + e),
                wts: i.toString()
            };
        }
        return null;
    }
    const hash = function(e, n) {
        if (null == e) throw new Error("Illegal argument " + e);
        var o = utils.wordsToBytes(md5(e, n));
        return n && n.asBytes ?
            o :
            n && n.asString ?
            bin.bytesToString(o) :
            utils.bytesToHex(o);
    };
    const caesar = (t) => {
        let e = "";
        for (let n = 0; n < t.length; n++)
            e += String.fromCharCode(t.charCodeAt(n) - 1);
        return e;
    };
    // 截取cookie
    function getCookie(name) {
        // 获取所有cookie并以"; "分割
        const cookies = document.cookie.split("; ");
        for (let i = 0; i < cookies.length; i++) {
            // 分割键值对
            const cookie = cookies[i].split("=");
            // 删除cookie名两边的空白字符
            const cookieName = cookie[0].trim();
            // 如果找到了所需的cookie键
            if (cookieName === name) {
                // 返回对应的cookie值（去掉值两边的空白字符）
                return decodeURIComponent(cookie[1].trim());
            }
        }
        // 如果找不到指定的cookie，返回空字符串
        return "";
    }
    // 获取info所需的参数
    const params = {
        task_id: new URLSearchParams(window.location.search).get("task_id") || "",
        web_location: document.querySelector('meta[name="spm_prefix"]').content || ""
    };
    const y = "d569546b86c252:db:9bc7e99c5d71e5",
        g = "557251g796:g54:f:ee94g8fg969e2de",
        getwRid = () => {
            const i = generateWBISign(params || {}, {
                wbiImgKey: caesar(y),
                wbiSubKey: caesar(g)
            });
            return i;
        };

    //调1、https://api.bilibili.com/x/web-interface/nav
    //或者2、https://api.bilibili.com/bapis/bilibili.api.ticket.v1.Ticket/GenWebTicket
    //获取img_url，即临时token
    //如果获取信息失败，先调用接口更新imgurl或者直接刷新页面
    //但暂时不必如此，wbi签名未被校验
    /*构建用户界面*/
    document.addEventListener(
        "visibilitychange",
        function(event) {
            event.stopImmediatePropagation(); // 阻断b站设置的visibilitychange监听器
        },
        true
    );
    createHTML();
    addStyle();
    addScript();
    //提示框容器，在元素创建之后
    const notifications = document.querySelector(".notifications"),
        toastDetails = {
            timer: 5000,
            success: {
                icon: "fa-circle-check"
            },
            error: {
                icon: "fa-circle-xmark"
            },
            warning: {
                icon: "fa-circle-exclamation"
            },
            info: {
                icon: "fa-circle-info"
            }
        };
    isShowToast();
    /*发送请求*/
    // 基础配置
    const http = axios.create({
        baseURL: "https://api.bilibili.com",
        timeout: 5000,
        withCredentials: "true",
        headers: {
            post: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        }
    });
    // 请求拦截器
    http.interceptors.request.use((config) => {
        // 避免浏览器对请求进行缓存
        config.params = {
            ...config.params,
            ...getwRid()
        };
        return config;
    });
    let activity_id = "";
    setTimeout(function() {
        document
            .querySelector(
                "#app > div > div.home-wrap.select-disable > section.tool-wrap > div"
            )
            .click();
        (async() => {
            // 获取activity_id
            activity_id = await
            http
                .get("/x/activity_components/mission/info", {
                    params: {
                        ...params
                    }
                })
                .then(function(response) {
                    return response.data.data.act_id;
                })
                .catch(function(error) {
                    console.log(error);
                });
        })();
        // 请求奖励接口
        setInterval(() => {
            http
                .post("/x/activity_components/mission/receive", {
                    task_id: new URLSearchParams(window.location.search).get("task_id") || "",
                    activity_id,
                    activity_name: "",
                    task_name: "",
                    reward_name: "",
                    gaia_vtoken: "",
                    receive_from: "missionPage",
                    csrf: getCookie("bili_jct") || ""
                })
                .then(function(response) {
                    let code = response.data.code || 114514;
                    let info = response.data.message || "......";
                    if (code >= 202100) {
                        document
                            .querySelector(
                                "#app > div > div.home-wrap.select-disable > section.tool-wrap > div"
                            )
                            .click();
                        console.log(`%c${code}：${info}`, "font-size: 10px; color: red;");
                        createToast("error", info);
                    } else if (code === 75086) {
                        console.log(`%c${code}：${info}`, "font-size: 15px; color: green;");
                        createToast("success", info);
                    } else {
                        console.log(
                            `%c${code}：${info}`,
                            "font-size: 10px; color: orange;"
                        );
                        createToast("warning", info);
                    }
                })
                .catch(function(error) {
                    console.log(error);
                });
        }, Time); //请求频率
        // 定时获取stock数量
        let getStockNumTimer = setInterval(() => {
            http
                .get("/x/activity_components/mission/info", {
                    params: {
                        ...params
                    }
                })
                .then((info) => {
                    let stockNum = info.data.data.stock_info.day_stock || 0;
                    createToast("info", `当日剩余量：${stockNum}%`);
                });
        }, 5000);
    }, 1000); // 该定时器防止频繁请求导致获取信息失败
})();