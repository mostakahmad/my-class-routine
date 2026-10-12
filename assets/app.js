var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/@capacitor/core/dist/index.js
var ExceptionCode, CapacitorException, getPlatformId, createCapacitor, initCapacitorGlobal, Capacitor, registerPlugin, WebPlugin, encode, decode, CapacitorCookiesPluginWeb, CapacitorCookies, readBlobAsBase64, normalizeHttpHeaders, buildUrlParams, buildRequestInit, CapacitorHttpPluginWeb, CapacitorHttp;
var init_dist = __esm({
  "node_modules/@capacitor/core/dist/index.js"() {
    (function(ExceptionCode2) {
      ExceptionCode2["Unimplemented"] = "UNIMPLEMENTED";
      ExceptionCode2["Unavailable"] = "UNAVAILABLE";
    })(ExceptionCode || (ExceptionCode = {}));
    CapacitorException = class extends Error {
      constructor(message, code, data) {
        super(message);
        this.message = message;
        this.code = code;
        this.data = data;
      }
    };
    getPlatformId = (win) => {
      var _a, _b;
      if (win === null || win === void 0 ? void 0 : win.androidBridge) {
        return "android";
      } else if ((_b = (_a = win === null || win === void 0 ? void 0 : win.webkit) === null || _a === void 0 ? void 0 : _a.messageHandlers) === null || _b === void 0 ? void 0 : _b.bridge) {
        return "ios";
      } else {
        return "web";
      }
    };
    createCapacitor = (win) => {
      const capCustomPlatform = win.CapacitorCustomPlatform || null;
      const cap = win.Capacitor || {};
      const Plugins = cap.Plugins = cap.Plugins || {};
      const getPlatform = () => {
        return capCustomPlatform !== null ? capCustomPlatform.name : getPlatformId(win);
      };
      const isNativePlatform2 = () => getPlatform() !== "web";
      const isPluginAvailable = (pluginName) => {
        const plugin = registeredPlugins.get(pluginName);
        if (plugin === null || plugin === void 0 ? void 0 : plugin.platforms.has(getPlatform())) {
          return true;
        }
        if (getPluginHeader(pluginName)) {
          return true;
        }
        return false;
      };
      const getPluginHeader = (pluginName) => {
        var _a;
        return (_a = cap.PluginHeaders) === null || _a === void 0 ? void 0 : _a.find((h) => h.name === pluginName);
      };
      const handleError = (err) => win.console.error(err);
      const registeredPlugins = /* @__PURE__ */ new Map();
      const registerPlugin2 = (pluginName, jsImplementations = {}) => {
        const registeredPlugin = registeredPlugins.get(pluginName);
        if (registeredPlugin) {
          console.warn(`Capacitor plugin "${pluginName}" already registered. Cannot register plugins twice.`);
          return registeredPlugin.proxy;
        }
        const platform = getPlatform();
        const pluginHeader = getPluginHeader(pluginName);
        let jsImplementation;
        const loadPluginImplementation = async () => {
          if (!jsImplementation && platform in jsImplementations) {
            jsImplementation = typeof jsImplementations[platform] === "function" ? jsImplementation = await jsImplementations[platform]() : jsImplementation = jsImplementations[platform];
          } else if (capCustomPlatform !== null && !jsImplementation && "web" in jsImplementations) {
            jsImplementation = typeof jsImplementations["web"] === "function" ? jsImplementation = await jsImplementations["web"]() : jsImplementation = jsImplementations["web"];
          }
          return jsImplementation;
        };
        const createPluginMethod = (impl, prop) => {
          var _a, _b;
          if (pluginHeader) {
            const methodHeader = pluginHeader === null || pluginHeader === void 0 ? void 0 : pluginHeader.methods.find((m) => prop === m.name);
            if (methodHeader) {
              if (methodHeader.rtype === "promise") {
                return (options) => cap.nativePromise(pluginName, prop.toString(), options);
              } else {
                return (options, callback) => cap.nativeCallback(pluginName, prop.toString(), options, callback);
              }
            } else if (impl) {
              return (_a = impl[prop]) === null || _a === void 0 ? void 0 : _a.bind(impl);
            }
          } else if (impl) {
            return (_b = impl[prop]) === null || _b === void 0 ? void 0 : _b.bind(impl);
          } else {
            throw new CapacitorException(`"${pluginName}" plugin is not implemented on ${platform}`, ExceptionCode.Unimplemented);
          }
        };
        const createPluginMethodWrapper = (prop) => {
          let remove;
          const wrapper = (...args) => {
            const p = loadPluginImplementation().then((impl) => {
              const fn = createPluginMethod(impl, prop);
              if (fn) {
                const p2 = fn(...args);
                remove = p2 === null || p2 === void 0 ? void 0 : p2.remove;
                return p2;
              } else {
                throw new CapacitorException(`"${pluginName}.${prop}()" is not implemented on ${platform}`, ExceptionCode.Unimplemented);
              }
            });
            if (prop === "addListener") {
              p.remove = async () => remove();
            }
            return p;
          };
          wrapper.toString = () => `${prop.toString()}() { [capacitor code] }`;
          Object.defineProperty(wrapper, "name", {
            value: prop,
            writable: false,
            configurable: false
          });
          return wrapper;
        };
        const addListener = createPluginMethodWrapper("addListener");
        const removeListener = createPluginMethodWrapper("removeListener");
        const addListenerNative = (eventName, callback) => {
          const call = addListener({ eventName }, callback);
          const remove = async () => {
            const callbackId = await call;
            removeListener({
              eventName,
              callbackId
            }, callback);
          };
          const p = new Promise((resolve) => call.then(() => resolve({ remove })));
          p.remove = async () => {
            console.warn(`Using addListener() without 'await' is deprecated.`);
            await remove();
          };
          return p;
        };
        const proxy = new Proxy({}, {
          get(_, prop) {
            switch (prop) {
              // https://github.com/facebook/react/issues/20030
              case "$$typeof":
                return void 0;
              case "toJSON":
                return () => ({});
              case "addListener":
                return pluginHeader ? addListenerNative : addListener;
              case "removeListener":
                return removeListener;
              default:
                return createPluginMethodWrapper(prop);
            }
          }
        });
        Plugins[pluginName] = proxy;
        registeredPlugins.set(pluginName, {
          name: pluginName,
          proxy,
          platforms: /* @__PURE__ */ new Set([...Object.keys(jsImplementations), ...pluginHeader ? [platform] : []])
        });
        return proxy;
      };
      if (!cap.convertFileSrc) {
        cap.convertFileSrc = (filePath) => filePath;
      }
      cap.getPlatform = getPlatform;
      cap.handleError = handleError;
      cap.isNativePlatform = isNativePlatform2;
      cap.isPluginAvailable = isPluginAvailable;
      cap.registerPlugin = registerPlugin2;
      cap.Exception = CapacitorException;
      cap.DEBUG = !!cap.DEBUG;
      cap.isLoggingEnabled = !!cap.isLoggingEnabled;
      return cap;
    };
    initCapacitorGlobal = (win) => win.Capacitor = createCapacitor(win);
    Capacitor = /* @__PURE__ */ initCapacitorGlobal(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : {});
    registerPlugin = Capacitor.registerPlugin;
    WebPlugin = class {
      constructor() {
        this.listeners = {};
        this.retainedEventArguments = {};
        this.windowListeners = {};
      }
      addListener(eventName, listenerFunc) {
        let firstListener = false;
        const listeners = this.listeners[eventName];
        if (!listeners) {
          this.listeners[eventName] = [];
          firstListener = true;
        }
        this.listeners[eventName].push(listenerFunc);
        const windowListener = this.windowListeners[eventName];
        if (windowListener && !windowListener.registered) {
          this.addWindowListener(windowListener);
        }
        if (firstListener) {
          this.sendRetainedArgumentsForEvent(eventName);
        }
        const remove = async () => this.removeListener(eventName, listenerFunc);
        const p = Promise.resolve({ remove });
        return p;
      }
      async removeAllListeners() {
        this.listeners = {};
        for (const listener in this.windowListeners) {
          this.removeWindowListener(this.windowListeners[listener]);
        }
        this.windowListeners = {};
      }
      notifyListeners(eventName, data, retainUntilConsumed) {
        const listeners = this.listeners[eventName];
        if (!listeners) {
          if (retainUntilConsumed) {
            let args = this.retainedEventArguments[eventName];
            if (!args) {
              args = [];
            }
            args.push(data);
            this.retainedEventArguments[eventName] = args;
          }
          return;
        }
        listeners.forEach((listener) => listener(data));
      }
      hasListeners(eventName) {
        var _a;
        return !!((_a = this.listeners[eventName]) === null || _a === void 0 ? void 0 : _a.length);
      }
      registerWindowListener(windowEventName, pluginEventName) {
        this.windowListeners[pluginEventName] = {
          registered: false,
          windowEventName,
          pluginEventName,
          handler: (event) => {
            this.notifyListeners(pluginEventName, event);
          }
        };
      }
      unimplemented(msg = "not implemented") {
        return new Capacitor.Exception(msg, ExceptionCode.Unimplemented);
      }
      unavailable(msg = "not available") {
        return new Capacitor.Exception(msg, ExceptionCode.Unavailable);
      }
      async removeListener(eventName, listenerFunc) {
        const listeners = this.listeners[eventName];
        if (!listeners) {
          return;
        }
        const index = listeners.indexOf(listenerFunc);
        this.listeners[eventName].splice(index, 1);
        if (!this.listeners[eventName].length) {
          this.removeWindowListener(this.windowListeners[eventName]);
        }
      }
      addWindowListener(handle) {
        window.addEventListener(handle.windowEventName, handle.handler);
        handle.registered = true;
      }
      removeWindowListener(handle) {
        if (!handle) {
          return;
        }
        window.removeEventListener(handle.windowEventName, handle.handler);
        handle.registered = false;
      }
      sendRetainedArgumentsForEvent(eventName) {
        const args = this.retainedEventArguments[eventName];
        if (!args) {
          return;
        }
        delete this.retainedEventArguments[eventName];
        args.forEach((arg) => {
          this.notifyListeners(eventName, arg);
        });
      }
    };
    encode = (str) => encodeURIComponent(str).replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent).replace(/[()]/g, escape);
    decode = (str) => str.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent);
    CapacitorCookiesPluginWeb = class extends WebPlugin {
      async getCookies() {
        const cookies = document.cookie;
        const cookieMap = {};
        cookies.split(";").forEach((cookie) => {
          if (cookie.length <= 0)
            return;
          let [key, value] = cookie.replace(/=/, "CAP_COOKIE").split("CAP_COOKIE");
          key = decode(key).trim();
          value = decode(value).trim();
          cookieMap[key] = value;
        });
        return cookieMap;
      }
      async setCookie(options) {
        try {
          const encodedKey = encode(options.key);
          const encodedValue = encode(options.value);
          const expires = options.expires ? `; expires=${options.expires.replace("expires=", "")}` : "";
          const path = (options.path || "/").replace("path=", "");
          const domain = options.url != null && options.url.length > 0 ? `domain=${options.url}` : "";
          document.cookie = `${encodedKey}=${encodedValue || ""}${expires}; path=${path}; ${domain};`;
        } catch (error) {
          return Promise.reject(error);
        }
      }
      async deleteCookie(options) {
        try {
          document.cookie = `${options.key}=; Max-Age=0`;
        } catch (error) {
          return Promise.reject(error);
        }
      }
      async clearCookies() {
        try {
          const cookies = document.cookie.split(";") || [];
          for (const cookie of cookies) {
            document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, `=;expires=${(/* @__PURE__ */ new Date()).toUTCString()};path=/`);
          }
        } catch (error) {
          return Promise.reject(error);
        }
      }
      async clearAllCookies() {
        try {
          await this.clearCookies();
        } catch (error) {
          return Promise.reject(error);
        }
      }
    };
    CapacitorCookies = registerPlugin("CapacitorCookies", {
      web: () => new CapacitorCookiesPluginWeb()
    });
    readBlobAsBase64 = async (blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result;
        resolve(base64String.indexOf(",") >= 0 ? base64String.split(",")[1] : base64String);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(blob);
    });
    normalizeHttpHeaders = (headers = {}) => {
      const originalKeys = Object.keys(headers);
      const loweredKeys = Object.keys(headers).map((k) => k.toLocaleLowerCase());
      const normalized = loweredKeys.reduce((acc, key, index) => {
        acc[key] = headers[originalKeys[index]];
        return acc;
      }, {});
      return normalized;
    };
    buildUrlParams = (params, shouldEncode = true) => {
      if (!params)
        return null;
      const output = Object.entries(params).reduce((accumulator, entry) => {
        const [key, value] = entry;
        let encodedValue;
        let item;
        if (Array.isArray(value)) {
          item = "";
          value.forEach((str) => {
            encodedValue = shouldEncode ? encodeURIComponent(str) : str;
            item += `${key}=${encodedValue}&`;
          });
          item.slice(0, -1);
        } else {
          encodedValue = shouldEncode ? encodeURIComponent(value) : value;
          item = `${key}=${encodedValue}`;
        }
        return `${accumulator}&${item}`;
      }, "");
      return output.substr(1);
    };
    buildRequestInit = (options, extra = {}) => {
      const output = Object.assign({ method: options.method || "GET", headers: options.headers }, extra);
      const headers = normalizeHttpHeaders(options.headers);
      const type = headers["content-type"] || "";
      if (typeof options.data === "string") {
        output.body = options.data;
      } else if (type.includes("application/x-www-form-urlencoded")) {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(options.data || {})) {
          params.set(key, value);
        }
        output.body = params.toString();
      } else if (type.includes("multipart/form-data") || options.data instanceof FormData) {
        const form = new FormData();
        if (options.data instanceof FormData) {
          options.data.forEach((value, key) => {
            form.append(key, value);
          });
        } else {
          for (const key of Object.keys(options.data)) {
            form.append(key, options.data[key]);
          }
        }
        output.body = form;
        const headers2 = new Headers(output.headers);
        headers2.delete("content-type");
        output.headers = headers2;
      } else if (type.includes("application/json") || typeof options.data === "object") {
        output.body = JSON.stringify(options.data);
      }
      return output;
    };
    CapacitorHttpPluginWeb = class extends WebPlugin {
      /**
       * Perform an Http request given a set of options
       * @param options Options to build the HTTP request
       */
      async request(options) {
        const requestInit = buildRequestInit(options, options.webFetchExtra);
        const urlParams = buildUrlParams(options.params, options.shouldEncodeUrlParams);
        const url = urlParams ? `${options.url}?${urlParams}` : options.url;
        const response = await fetch(url, requestInit);
        const contentType = response.headers.get("content-type") || "";
        let { responseType = "text" } = response.ok ? options : {};
        if (contentType.includes("application/json")) {
          responseType = "json";
        }
        let data;
        let blob;
        switch (responseType) {
          case "arraybuffer":
          case "blob":
            blob = await response.blob();
            data = await readBlobAsBase64(blob);
            break;
          case "json":
            data = await response.json();
            break;
          case "document":
          case "text":
          default:
            data = await response.text();
        }
        const headers = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
        return {
          data,
          headers,
          status: response.status,
          url: response.url
        };
      }
      /**
       * Perform an Http GET request given a set of options
       * @param options Options to build the HTTP request
       */
      async get(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "GET" }));
      }
      /**
       * Perform an Http POST request given a set of options
       * @param options Options to build the HTTP request
       */
      async post(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "POST" }));
      }
      /**
       * Perform an Http PUT request given a set of options
       * @param options Options to build the HTTP request
       */
      async put(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "PUT" }));
      }
      /**
       * Perform an Http PATCH request given a set of options
       * @param options Options to build the HTTP request
       */
      async patch(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "PATCH" }));
      }
      /**
       * Perform an Http DELETE request given a set of options
       * @param options Options to build the HTTP request
       */
      async delete(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "DELETE" }));
      }
    };
    CapacitorHttp = registerPlugin("CapacitorHttp", {
      web: () => new CapacitorHttpPluginWeb()
    });
  }
});

// node_modules/@capacitor/app/dist/esm/web.js
var web_exports = {};
__export(web_exports, {
  AppWeb: () => AppWeb
});
var AppWeb;
var init_web = __esm({
  "node_modules/@capacitor/app/dist/esm/web.js"() {
    init_dist();
    AppWeb = class extends WebPlugin {
      constructor() {
        super();
        this.handleVisibilityChange = () => {
          const data = {
            isActive: document.hidden !== true
          };
          this.notifyListeners("appStateChange", data);
          if (document.hidden) {
            this.notifyListeners("pause", null);
          } else {
            this.notifyListeners("resume", null);
          }
        };
        document.addEventListener("visibilitychange", this.handleVisibilityChange, false);
      }
      exitApp() {
        throw this.unimplemented("Not implemented on web.");
      }
      async getInfo() {
        throw this.unimplemented("Not implemented on web.");
      }
      async getLaunchUrl() {
        return { url: "" };
      }
      async getState() {
        return { isActive: document.hidden !== true };
      }
      async minimizeApp() {
        throw this.unimplemented("Not implemented on web.");
      }
      async toggleBackButtonHandler() {
        throw this.unimplemented("Not implemented on web.");
      }
    };
  }
});

// node_modules/@capacitor/local-notifications/dist/esm/web.js
var web_exports2 = {};
__export(web_exports2, {
  LocalNotificationsWeb: () => LocalNotificationsWeb
});
var LocalNotificationsWeb;
var init_web2 = __esm({
  "node_modules/@capacitor/local-notifications/dist/esm/web.js"() {
    init_dist();
    LocalNotificationsWeb = class extends WebPlugin {
      constructor() {
        super(...arguments);
        this.pending = [];
        this.deliveredNotifications = [];
        this.hasNotificationSupport = () => {
          if (!("Notification" in window) || !Notification.requestPermission) {
            return false;
          }
          if (Notification.permission !== "granted") {
            try {
              new Notification("");
            } catch (e) {
              if (e.name == "TypeError") {
                return false;
              }
            }
          }
          return true;
        };
      }
      async getDeliveredNotifications() {
        const deliveredSchemas = [];
        for (const notification of this.deliveredNotifications) {
          const deliveredSchema = {
            title: notification.title,
            id: parseInt(notification.tag),
            body: notification.body
          };
          deliveredSchemas.push(deliveredSchema);
        }
        return {
          notifications: deliveredSchemas
        };
      }
      async removeDeliveredNotifications(delivered) {
        for (const toRemove of delivered.notifications) {
          const found = this.deliveredNotifications.find((n) => n.tag === String(toRemove.id));
          found === null || found === void 0 ? void 0 : found.close();
          this.deliveredNotifications = this.deliveredNotifications.filter(() => !found);
        }
      }
      async removeAllDeliveredNotifications() {
        for (const notification of this.deliveredNotifications) {
          notification.close();
        }
        this.deliveredNotifications = [];
      }
      async createChannel() {
        throw this.unimplemented("Not implemented on web.");
      }
      async deleteChannel() {
        throw this.unimplemented("Not implemented on web.");
      }
      async listChannels() {
        throw this.unimplemented("Not implemented on web.");
      }
      async schedule(options) {
        if (!this.hasNotificationSupport()) {
          throw this.unavailable("Notifications not supported in this browser.");
        }
        for (const notification of options.notifications) {
          this.sendNotification(notification);
        }
        return {
          notifications: options.notifications.map((notification) => ({
            id: notification.id
          }))
        };
      }
      async getPending() {
        return {
          notifications: this.pending
        };
      }
      async registerActionTypes() {
        throw this.unimplemented("Not implemented on web.");
      }
      async cancel(pending) {
        this.pending = this.pending.filter((notification) => !pending.notifications.find((n) => n.id === notification.id));
      }
      async areEnabled() {
        const { display } = await this.checkPermissions();
        return {
          value: display === "granted"
        };
      }
      async changeExactNotificationSetting() {
        throw this.unimplemented("Not implemented on web.");
      }
      async checkExactNotificationSetting() {
        throw this.unimplemented("Not implemented on web.");
      }
      async requestPermissions() {
        if (!this.hasNotificationSupport()) {
          throw this.unavailable("Notifications not supported in this browser.");
        }
        const display = this.transformNotificationPermission(await Notification.requestPermission());
        return { display };
      }
      async checkPermissions() {
        if (!this.hasNotificationSupport()) {
          throw this.unavailable("Notifications not supported in this browser.");
        }
        const display = this.transformNotificationPermission(Notification.permission);
        return { display };
      }
      transformNotificationPermission(permission) {
        switch (permission) {
          case "granted":
            return "granted";
          case "denied":
            return "denied";
          default:
            return "prompt";
        }
      }
      sendPending() {
        var _a;
        const toRemove = [];
        const now = (/* @__PURE__ */ new Date()).getTime();
        for (const notification of this.pending) {
          if (((_a = notification.schedule) === null || _a === void 0 ? void 0 : _a.at) && notification.schedule.at.getTime() <= now) {
            this.buildNotification(notification);
            toRemove.push(notification);
          }
        }
        this.pending = this.pending.filter((notification) => !toRemove.find((n) => n === notification));
      }
      sendNotification(notification) {
        var _a;
        if ((_a = notification.schedule) === null || _a === void 0 ? void 0 : _a.at) {
          const diff = notification.schedule.at.getTime() - (/* @__PURE__ */ new Date()).getTime();
          this.pending.push(notification);
          setTimeout(() => {
            this.sendPending();
          }, diff);
          return;
        }
        this.buildNotification(notification);
      }
      buildNotification(notification) {
        const localNotification = new Notification(notification.title, {
          body: notification.body,
          tag: String(notification.id)
        });
        localNotification.addEventListener("click", this.onClick.bind(this, notification), false);
        localNotification.addEventListener("show", this.onShow.bind(this, notification), false);
        localNotification.addEventListener("close", () => {
          this.deliveredNotifications = this.deliveredNotifications.filter(() => !this);
        }, false);
        this.deliveredNotifications.push(localNotification);
        return localNotification;
      }
      onClick(notification) {
        const data = {
          actionId: "tap",
          notification
        };
        this.notifyListeners("localNotificationActionPerformed", data);
      }
      onShow(notification) {
        this.notifyListeners("localNotificationReceived", notification);
      }
    };
  }
});

// node_modules/@capacitor/app/dist/esm/index.js
init_dist();
var App = registerPlugin("App", {
  web: () => Promise.resolve().then(() => (init_web(), web_exports)).then((m) => new m.AppWeb())
});

// js/routine-data.js
var TYPE_META = {
  lecture: { label: "Lecture", reminder: "Lecture" },
  lab: { label: "Lab", reminder: "Lab" },
  counseling: { label: "Counseling", reminder: "Counseling" },
  paper: { label: "Paper", reminder: "Paper work" },
  ielts: { label: "IELTS", reminder: "IELTS" },
  project: { label: "Project", reminder: "Project work" },
  break: { label: "Break", reminder: "Break" },
  personal: { label: "Personal", reminder: "Personal" },
  sleep: { label: "Sleep", reminder: "Sleep" }
};
function block(title, type, start, end, extra = {}) {
  return { title, type, start, end, ...extra };
}
var home = { place: "home" };
var noDesk = { place: "no-desk" };
var ROUTINE = {
  term: "Fall 2026",
  person: "Sonia Nasrin",
  department: "Sonia Nasrin",
  footerNote: "If I am not available at my desk during counselling hour, kindly call me.",
  slotOrder: ["early", "s1", "s2", "s3", "s4", "s5", "s6"],
  slots: {
    early: { id: "early", start: "05:20", end: "08:20", label: "5:20 - 8:20" },
    s1: { id: "s1", start: "08:30", end: "10:00", label: "8:30 - 10:00" },
    s2: { id: "s2", start: "10:00", end: "11:30", label: "10:00 - 11:30" },
    s3: { id: "s3", start: "11:30", end: "13:00", label: "11:30 - 1:00" },
    s4: { id: "s4", start: "13:00", end: "14:30", label: "1:00 - 2:30" },
    s5: { id: "s5", start: "14:30", end: "16:00", label: "2:30 - 4:00" },
    s6: { id: "s6", start: "16:00", end: "17:30", label: "4:00 - 5:30" }
  },
  dayLabels: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ],
  specialDays: {},
  week: {
    // Sunday
    0: [
      block("Paper", "paper", "05:20", "08:20", { ...home, grid: { slot: "early" } }),
      block("MIS101", "lecture", "10:00", "11:30", { room: "904", grid: { slot: "s2" } }),
      block("Counselling Hour / OBE work / Quiz Check", "counseling", "11:30", "13:00", {
        grid: { slot: "s3" }
      }),
      block("BATCH 24A DM", "lab", "13:00", "14:30", { room: "702", grid: { slot: "s4" } }),
      block("Lunch and prayer break", "break", "14:30", "16:00", { grid: { slot: "s5" } }),
      block("BATCH 21A OS", "lab", "16:00", "17:30", { room: "702", grid: { slot: "s6" } })
    ],
    // Monday
    1: [
      block("IELTS", "ielts", "05:20", "08:20", { ...home, grid: { slot: "early" } }),
      block("Paper work (no desk)", "paper", "08:30", "17:30", {
        ...noDesk,
        grid: { slot: "s1", span: 6 }
      })
    ],
    // Tuesday
    2: [
      block("Paper", "paper", "05:20", "08:20", { ...home, grid: { slot: "early" } }),
      block("MIS101", "lecture", "08:30", "10:00", { room: "904", grid: { slot: "s1" } }),
      block("MIS101", "lecture", "10:00", "11:30", { room: "904", grid: { slot: "s2" } }),
      block("Counselling Hour / Meeting slot / Quiz check", "counseling", "11:30", "13:00", {
        grid: { slot: "s3" }
      }),
      block("Paper work (no desk)", "paper", "13:00", "16:00", {
        ...noDesk,
        grid: { slot: "s4", span: 2 }
      }),
      block("Paper", "paper", "16:00", "17:30", { grid: { slot: "s6" } })
    ],
    // Wednesday
    3: [
      block("Paper", "paper", "05:20", "08:20", { ...home, grid: { slot: "early" } }),
      block("BATCH 24A DM", "lab", "10:00", "11:30", { room: "704", grid: { slot: "s2" } }),
      block("BATCH 21A OS", "lab", "11:30", "13:00", { room: "703", grid: { slot: "s3" } }),
      block("Counselling Hour / OS lab study / lunch", "counseling", "13:00", "14:30", {
        grid: { slot: "s4" }
      }),
      block("IELTS work (no desk)", "ielts", "14:30", "16:00", {
        ...noDesk,
        grid: { slot: "s5" }
      }),
      block("Paper", "paper", "16:00", "17:30", { grid: { slot: "s6" } })
    ],
    // Thursday — OS 21A2 ends at 11:00 so it does not overlap IELTS Reading.
    4: [
      block("Paper", "paper", "05:20", "08:20", { ...home, grid: { slot: "early" } }),
      block("BATCH 21A1 OS", "lab", "08:30", "10:00", { room: "615L", grid: { slot: "s1" } }),
      block("BATCH 21A2 OS", "lab", "10:00", "11:00", { room: "615L", grid: { slot: "s2" } }),
      block("Project Hour / IELTS Reading", "ielts", "11:00", "12:00", { grid: { slot: "s3" } }),
      block("Lunch and prayer", "break", "12:00", "12:30", { grid: { slot: "s3" } }),
      block("Paper work (no desk)", "paper", "12:30", "17:30", {
        ...noDesk,
        grid: { slot: "s4", span: 3 }
      })
    ],
    // Friday
    5: [
      block("IELTS", "ielts", "05:20", "08:20", { ...home, grid: { slot: "early" } }),
      block("Project Work at Home", "project", "08:30", "17:30", {
        ...home,
        grid: { slot: "s1", span: 6 }
      })
    ],
    // Saturday
    6: [
      block("IELTS", "ielts", "05:20", "08:20", { ...home, grid: { slot: "early" } }),
      block("Project Work at Home", "project", "08:30", "17:30", {
        ...home,
        grid: { slot: "s1", span: 6 }
      })
    ]
  },
  evening: {
    cooking: [
      block("Bath, Prayer, Eat, Food prepare", "personal", "17:30", "20:00", { segment: "evening" }),
      block("Rest", "personal", "20:00", "20:30", { segment: "evening" }),
      block("Prayer", "personal", "20:30", "21:00", { segment: "evening" }),
      block("Exercise & walk", "personal", "21:00", "21:30", { segment: "evening" }),
      block("Go to bed", "personal", "21:30", "22:00", { segment: "evening" }),
      block("Sleep", "sleep", "22:00", "05:00", { segment: "evening" })
    ],
    nocook: [
      block("Bath, Prayer, Rest & Eat", "personal", "18:00", "19:30", { segment: "evening" }),
      block("IELTS Speaking Practice / test", "ielts", "19:30", "20:30", { segment: "evening" }),
      block("Prayer", "personal", "20:30", "21:00", { segment: "evening" }),
      block("Exercise & walk", "personal", "21:00", "21:30", { segment: "evening" }),
      block("Go to bed", "personal", "21:30", "22:00", { segment: "evening" }),
      block("Sleep", "sleep", "22:00", "05:00", { segment: "evening" })
    ]
  }
};

// js/reminder-settings.js
var REMINDER_SETTINGS_KEY = "cis_reminder_settings";
var PRESET_OFFSETS = [
  { minutes: 120, label: "2 hours before" },
  { minutes: 60, label: "1 hour before" },
  { minutes: 30, label: "30 minutes before" },
  { minutes: 15, label: "15 minutes before" }
];
var DEFAULT_SETTINGS = {
  presets: { 120: true, 60: true, 30: true, 15: true },
  custom: []
};
function loadReminderSettings() {
  try {
    const raw = localStorage.getItem(REMINDER_SETTINGS_KEY);
    if (!raw) return structuredClone(DEFAULT_SETTINGS);
    const parsed = JSON.parse(raw);
    return {
      presets: { ...DEFAULT_SETTINGS.presets, ...parsed.presets },
      custom: Array.isArray(parsed.custom) ? parsed.custom : []
    };
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}
function saveReminderSettings(settings) {
  localStorage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify(settings));
  syncReminderSettingsToSW();
}
function getEnabledReminderOffsets() {
  const settings = loadReminderSettings();
  const offsets = [];
  PRESET_OFFSETS.forEach(({ minutes }) => {
    if (settings.presets[minutes]) offsets.push(minutes);
  });
  settings.custom.forEach((m) => {
    const n = Number(m);
    if (n > 0 && n <= 1440 && !offsets.includes(n)) offsets.push(n);
  });
  return offsets.sort((a, b) => b - a);
}
function formatOffsetLabel(minutes) {
  if (minutes >= 60 && minutes % 60 === 0) {
    const h = minutes / 60;
    return h === 1 ? "1 hour" : `${h} hours`;
  }
  return `${minutes} min`;
}
function togglePresetOffset(minutes, enabled) {
  const settings = loadReminderSettings();
  settings.presets[minutes] = enabled;
  saveReminderSettings(settings);
}
function addCustomOffset(minutes) {
  const n = Math.round(Number(minutes));
  if (!n || n < 1 || n > 1440) return { ok: false, error: "Enter 1\u20131440 minutes" };
  const settings = loadReminderSettings();
  const exists = settings.custom.includes(n) || PRESET_OFFSETS.some((p) => p.minutes === n && settings.presets[n]);
  if (exists) return { ok: false, error: "Already added" };
  settings.custom.push(n);
  settings.custom.sort((a, b) => b - a);
  saveReminderSettings(settings);
  return { ok: true };
}
function removeCustomOffset(minutes) {
  const settings = loadReminderSettings();
  settings.custom = settings.custom.filter((m) => m !== minutes);
  saveReminderSettings(settings);
}
async function syncReminderSettingsToSW() {
  const offsets = getEnabledReminderOffsets();
  try {
    const cache = await caches.open("cis-app-settings");
    await cache.put(
      "reminder-offsets",
      new Response(JSON.stringify(offsets), {
        headers: { "Content-Type": "application/json" }
      })
    );
  } catch {
  }
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "SYNC_REMINDER_SETTINGS",
      offsets
    });
  }
}
function getReminderSummaryText() {
  const offsets = getEnabledReminderOffsets();
  if (!offsets.length) return "No reminders enabled";
  return offsets.map(formatOffsetLabel).join(" \xB7 ") + " before";
}

// js/broadcast-config.js
var BROADCAST_CONFIG = {
  enabled: true,
  adminPin: "cis2026",
  broadcastDoc: "latest",
  subscribersCollection: "cis_subscribers",
  broadcastsCollection: "cis_broadcasts",
  firebase: {
    apiKey: "AIzaSyCzjfP5yHWgI1Vi4IpOlGoPGiEXPpqTs5M",
    authDomain: "cis-my-routine.firebaseapp.com",
    projectId: "cis-my-routine",
    storageBucket: "cis-my-routine.firebasestorage.app",
    messagingSenderId: "178368542692",
    appId: "1:178368542692:web:472150a07e3f1a58d039f1",
    measurementId: "G-V9E9S2Y9ZV"
  }
};

// node_modules/@capacitor/local-notifications/dist/esm/index.js
init_dist();

// node_modules/@capacitor/local-notifications/dist/esm/definitions.js
var Weekday;
(function(Weekday2) {
  Weekday2[Weekday2["Sunday"] = 1] = "Sunday";
  Weekday2[Weekday2["Monday"] = 2] = "Monday";
  Weekday2[Weekday2["Tuesday"] = 3] = "Tuesday";
  Weekday2[Weekday2["Wednesday"] = 4] = "Wednesday";
  Weekday2[Weekday2["Thursday"] = 5] = "Thursday";
  Weekday2[Weekday2["Friday"] = 6] = "Friday";
  Weekday2[Weekday2["Saturday"] = 7] = "Saturday";
})(Weekday || (Weekday = {}));

// node_modules/@capacitor/local-notifications/dist/esm/index.js
var LocalNotifications = registerPlugin("LocalNotifications", {
  web: () => Promise.resolve().then(() => (init_web2(), web_exports2)).then((m) => new m.LocalNotificationsWeb())
});

// js/native-notifications.js
init_dist();
function isNativePlatform() {
  return Capacitor.isNativePlatform();
}
async function checkNativePermission() {
  const result = await LocalNotifications.checkPermissions();
  if (result.display === "granted") return "granted";
  if (result.display === "denied") return "denied";
  return "default";
}
async function requestNativePermission() {
  const result = await LocalNotifications.requestPermissions();
  if (result.display === "granted") return "granted";
  if (result.display === "denied") return "denied";
  return "default";
}
async function showNativeNotification(title, body, tag) {
  await LocalNotifications.schedule({
    notifications: [
      {
        id: Date.now() % 1e5,
        title,
        body: body || "",
        schedule: { at: new Date(Date.now() + 500) },
        extra: { tag: tag || "cis-routine" }
      }
    ]
  });
  return true;
}
async function cancelAllNativeNotifications() {
  const pending = await LocalNotifications.getPending();
  if (pending.notifications?.length) {
    await LocalNotifications.cancel({ notifications: pending.notifications });
  }
}
async function scheduleNativeNotifications(notifications) {
  if (!notifications.length) return;
  await LocalNotifications.schedule({ notifications });
}

// js/scheduler.js
var CHECK_WINDOW_MINUTES = 1;
var EVENING_PROFILE_KEY = "evening_profile";
var runtimeEveningProfile = "nocook";
function getEveningProfile() {
  if (typeof localStorage !== "undefined") {
    try {
      const saved = localStorage.getItem(EVENING_PROFILE_KEY);
      if (saved === "cooking" || saved === "nocook") return saved;
    } catch {
    }
  }
  return runtimeEveningProfile === "cooking" ? "cooking" : "nocook";
}
function setEveningProfile(profile) {
  const next = profile === "cooking" ? "cooking" : "nocook";
  runtimeEveningProfile = next;
  try {
    localStorage.setItem(EVENING_PROFILE_KEY, next);
  } catch {
  }
  return next;
}
async function syncEveningProfileToSW(profile = getEveningProfile()) {
  try {
    const cache = await caches.open("cis-app-settings");
    await cache.put(
      "evening-profile",
      new Response(profile, { headers: { "Content-Type": "text/plain" } })
    );
  } catch {
  }
  if (typeof navigator !== "undefined" && navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "SYNC_EVENING_PROFILE",
      profile
    });
  }
}
function parseTimeOnDate(date, timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}
function formatTime12(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}
function formatCountdown(ms) {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1e3);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor(totalSec % 3600 / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}
function eventKey(dayIndex, start, title) {
  return `${dayIndex}_${start}_${title.replace(/\s+/g, "_")}`;
}
function formatPlace(entry) {
  if (entry.room) return `Room ${entry.room}`;
  if (entry.place === "home") return "At home";
  if (entry.place === "no-desk") return "No desk";
  return null;
}
function buildEvent(dayIndex, entry, date) {
  const start = parseTimeOnDate(date, entry.start);
  const end = parseTimeOnDate(date, entry.end);
  if (end <= start) end.setDate(end.getDate() + 1);
  return {
    id: eventKey(dayIndex, entry.start, entry.title),
    dayIndex,
    dayLabel: ROUTINE.dayLabels[dayIndex],
    title: entry.title,
    type: entry.type,
    room: entry.room || null,
    place: entry.place || (entry.room ? "room" : null),
    placeLabel: formatPlace(entry),
    segment: entry.segment || "day",
    startClock: entry.start,
    endClock: entry.end,
    grid: entry.grid || null,
    start,
    end,
    timeRange: `${formatTime12(entry.start)} \u2013 ${formatTime12(entry.end)}`
  };
}
function getEventsForDay(dayIndex, refDate) {
  const special = ROUTINE.specialDays[dayIndex];
  if (special) {
    return { special, events: [] };
  }
  const date = new Date(refDate);
  const dayDiff = dayIndex - date.getDay();
  date.setDate(date.getDate() + dayDiff);
  date.setHours(0, 0, 0, 0);
  const profile = getEveningProfile();
  const entries = [
    ...ROUTINE.week[dayIndex] || [],
    ...ROUTINE.evening[profile] || []
  ];
  const events = entries.map((entry) => buildEvent(dayIndex, entry, date)).sort((a, b) => a.start - b.start);
  return { special: null, events };
}
function getTodayEvents(now = /* @__PURE__ */ new Date()) {
  const dayIndex = now.getDay();
  const { special, events } = getEventsForDay(dayIndex, now);
  if (special) return { special, events, dayIndex };
  const prevDate = new Date(now);
  prevDate.setDate(prevDate.getDate() - 1);
  const previous = getEventsForDay(prevDate.getDay(), prevDate);
  const carry = previous.events.filter((event) => event.start <= now && event.end > now).map((event) => ({ ...event, segment: "carry" }));
  return {
    special: null,
    events: [...carry, ...events].sort((a, b) => a.start - b.start),
    dayIndex
  };
}
function getCurrentEvent(now = /* @__PURE__ */ new Date()) {
  const { special, events } = getTodayEvents(now);
  if (special) return { special, event: null };
  const current = events.find((event) => now >= event.start && now < event.end);
  return { special: null, event: current || null };
}
function getUpcomingEvents(daysAhead = 7, now = /* @__PURE__ */ new Date()) {
  const result = [];
  for (let i = 0; i <= daysAhead; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    date.setHours(0, 0, 0, 0);
    const dayIndex = date.getDay();
    const { special, events } = getEventsForDay(dayIndex, date);
    if (!special) {
      events.forEach((event) => {
        if (event.start > now) result.push(event);
      });
    }
  }
  result.sort((a, b) => a.start - b.start);
  return result;
}
function getNextEvent(now = /* @__PURE__ */ new Date()) {
  const upcoming = getUpcomingEvents(7, now);
  return upcoming[0] || null;
}
function getCountdownTo(event, now = /* @__PURE__ */ new Date()) {
  if (!event) return null;
  return event.start - now;
}
function notifiedKey(event, offsetMinutes) {
  const dateStr = event.start.toISOString().slice(0, 10);
  return `notified_${dateStr}_${event.id}_${offsetMinutes}`;
}
function wasNotified(event, offsetMinutes) {
  return localStorage.getItem(notifiedKey(event, offsetMinutes)) === "1";
}
function markNotified(event, offsetMinutes) {
  localStorage.setItem(notifiedKey(event, offsetMinutes), "1");
}
function buildReminderMessage(event, offsetMinutes) {
  const reminder = TYPE_META[event.type]?.reminder || "Up next";
  const placePart = event.placeLabel ? ` \u2014 ${event.placeLabel}` : "";
  const label = formatOffsetLabel(offsetMinutes);
  return {
    title: `${reminder} in ${label}`,
    body: `${event.title}${placePart} \xB7 ${event.timeRange}`
  };
}
function checkReminders(now = /* @__PURE__ */ new Date(), onReminder) {
  const offsets = getEnabledReminderOffsets();
  if (!offsets.length) return [];
  const upcoming = getUpcomingEvents(1, now);
  const fired = [];
  upcoming.forEach((event) => {
    offsets.forEach((offset) => {
      const reminderTime = new Date(event.start.getTime() - offset * 60 * 1e3);
      const windowEnd = new Date(
        reminderTime.getTime() + CHECK_WINDOW_MINUTES * 60 * 1e3
      );
      if (now >= reminderTime && now < windowEnd && !wasNotified(event, offset)) {
        const message = buildReminderMessage(event, offset);
        markNotified(event, offset);
        fired.push({ event, offset, message });
        if (onReminder) onReminder(message, event, offset);
      }
    });
  });
  return fired;
}
function isSlotActive(event, now = /* @__PURE__ */ new Date()) {
  return now >= event.start && now < event.end;
}
function isSlotPast(event, now = /* @__PURE__ */ new Date()) {
  return now >= event.end;
}

// js/notifications.js
var swRegistration = null;
var nativePermission = "default";
async function getPermissionStatus() {
  if (isNativePlatform()) {
    if (nativePermission === "default") {
      nativePermission = await checkNativePermission();
    }
    return nativePermission;
  }
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}
async function registerServiceWorker() {
  if (isNativePlatform() || !("serviceWorker" in navigator)) return null;
  try {
    swRegistration = await navigator.serviceWorker.register("./sw.js", { type: "module" });
    await navigator.serviceWorker.ready;
    return swRegistration;
  } catch (err) {
    console.warn("Service worker registration failed:", err);
    return null;
  }
}
async function requestPermission() {
  if (isNativePlatform()) {
    nativePermission = await requestNativePermission();
    return nativePermission;
  }
  if (!("Notification" in window)) {
    return "unsupported";
  }
  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    await registerServiceWorker();
  }
  return permission;
}
async function showNotification(title, options = {}) {
  if (isNativePlatform()) {
    return showNativeNotification(title, options.body, options.tag);
  }
  const payload = {
    title,
    body: options.body || "",
    icon: options.icon || "./icons/icon-192.png",
    badge: options.icon || "./icons/icon-192.png",
    tag: options.tag || "cis-routine",
    data: options.data || {}
  };
  if (swRegistration && swRegistration.active) {
    swRegistration.active.postMessage({ type: "SHOW_NOTIFICATION", payload });
    return true;
  }
  if (Notification.permission === "granted") {
    new Notification(title, {
      body: payload.body,
      icon: payload.icon,
      tag: payload.tag
    });
    return true;
  }
  return false;
}
var NATIVE_HORIZON_MS = 48 * 60 * 60 * 1e3;
async function scheduleNativeReminders(events) {
  if (!isNativePlatform()) return;
  try {
    await cancelAllNativeNotifications();
    const notifications = [];
    let id = 1;
    const nowMs = Date.now();
    const horizon = nowMs + NATIVE_HORIZON_MS;
    events.forEach((event) => {
      getEnabledReminderOffsets().forEach((offset) => {
        const at = new Date(event.start.getTime() - offset * 60 * 1e3);
        if (at.getTime() <= nowMs || at.getTime() > horizon) return;
        const msg = buildReminderMessage(event, offset);
        notifications.push({
          id: id++,
          title: msg.title,
          body: msg.body,
          schedule: { at }
        });
      });
    });
    await scheduleNativeNotifications(notifications);
  } catch (err) {
    console.warn("Native schedule failed:", err);
  }
}
async function initNotifications() {
  if (!isNativePlatform()) {
    await registerServiceWorker();
    await syncReminderSettingsToSW();
  }
  if (isNativePlatform() && await getPermissionStatus() === "granted") {
    const events = getUpcomingEvents(14);
    await scheduleNativeReminders(events);
  }
}
function getNotificationBadgeClass(status) {
  switch (status) {
    case "granted":
      return "badge-enabled";
    case "denied":
      return "badge-blocked";
    default:
      return "badge-pending";
  }
}
function getNotificationBadgeText(status) {
  switch (status) {
    case "granted":
      return "Reminders enabled";
    case "denied":
      return isNativePlatform() ? "Blocked \u2014 enable in phone settings" : "Blocked \u2014 enable in browser settings";
    case "unsupported":
      return "Not supported on this device";
    default:
      return "Not enabled";
  }
}
async function refreshNativePermission() {
  if (isNativePlatform()) {
    nativePermission = await checkNativePermission();
  }
  return getPermissionStatus();
}

// js/broadcast.js
var DEVICE_ID_KEY = "cis_device_id";
var LAST_BROADCAST_KEY = "cis_last_broadcast_id";
var broadcastDb = null;
var broadcastUnsubscribe = null;
function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
function isBroadcastConfigured() {
  return BROADCAST_CONFIG.enabled && BROADCAST_CONFIG.firebase?.projectId && BROADCAST_CONFIG.firebase?.apiKey;
}
function initBroadcast() {
  if (!isBroadcastConfigured() || typeof firebase === "undefined") return false;
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(BROADCAST_CONFIG.firebase);
    }
    broadcastDb = firebase.firestore();
    registerSubscriber();
    startBroadcastListener();
    return true;
  } catch (err) {
    console.warn("Broadcast init failed:", err);
    return false;
  }
}
async function registerSubscriber() {
  if (!broadcastDb) return;
  const deviceId = getDeviceId();
  const ref = broadcastDb.collection(BROADCAST_CONFIG.subscribersCollection).doc(deviceId);
  await ref.set(
    {
      deviceId,
      subscribed: true,
      userAgent: navigator.userAgent.slice(0, 120),
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}
function startBroadcastListener() {
  if (!broadcastDb || broadcastUnsubscribe) return;
  const docRef = broadcastDb.collection(BROADCAST_CONFIG.broadcastsCollection).doc(BROADCAST_CONFIG.broadcastDoc);
  broadcastUnsubscribe = docRef.onSnapshot((snap) => {
    if (!snap.exists) return;
    const data = snap.data();
    const lastId = localStorage.getItem(LAST_BROADCAST_KEY);
    if (!data.id || data.id === lastId) return;
    getPermissionStatus().then((status) => {
      if (status !== "granted") return;
      localStorage.setItem(LAST_BROADCAST_KEY, data.id);
      showNotification(data.title || "CIS Announcement", {
        body: data.message || "",
        tag: `broadcast-${data.id}`
      });
    });
  });
}
async function sendBroadcast(message, pin) {
  const text = (message || "").trim();
  if (!text) return { ok: false, error: "Enter a message" };
  if (pin !== BROADCAST_CONFIG.adminPin) return { ok: false, error: "Wrong admin PIN" };
  const payload = {
    id: `${Date.now()}_${getDeviceId().slice(0, 8)}`,
    title: "CIS Announcement",
    message: text
  };
  if (isBroadcastConfigured() && broadcastDb) {
    await broadcastDb.collection(BROADCAST_CONFIG.broadcastsCollection).doc(BROADCAST_CONFIG.broadcastDoc).set({
      id: payload.id,
      title: payload.title,
      message: text,
      sentAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    localStorage.setItem(LAST_BROADCAST_KEY, payload.id);
    return { ok: true, mode: "firebase" };
  }
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "LOCAL_BROADCAST",
      payload: { title: payload.title, body: text, tag: payload.id }
    });
  }
  await showNotification(payload.title, { body: text, tag: payload.id });
  return {
    ok: true,
    mode: "local",
    warning: "Firebase not configured \u2014 only this device notified"
  };
}
async function getSubscriberCount() {
  if (!broadcastDb) return null;
  try {
    const snap = await broadcastDb.collection(BROADCAST_CONFIG.subscribersCollection).where("subscribed", "==", true).get();
    return snap.size;
  } catch {
    return null;
  }
}
function getBroadcastStatusText() {
  if (isBroadcastConfigured()) {
    return getPermissionStatus().then(
      (status) => status === "granted" ? "Connected \u2014 listening for announcements" : "Enable reminders to receive broadcasts"
    );
  }
  return Promise.resolve("Local mode \u2014 configure Firebase for all devices");
}

// js/app.js
var TICK_MS = 3e4;
var selectedDayIndex = (/* @__PURE__ */ new Date()).getDay();
function getTypeLabel(type) {
  return TYPE_META[type]?.label || "";
}
function isClassType(type) {
  return type === "lecture" || type === "lab";
}
function formatDateLabel(date) {
  return date.toLocaleDateString(void 0, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}
function formatShortDay(dayIndex) {
  return ROUTINE.dayLabels[dayIndex].slice(0, 3);
}
function switchView(viewName) {
  document.querySelectorAll(".view").forEach((el) => {
    const isActive = el.id === `view-${viewName}`;
    el.classList.toggle("active", isActive);
    el.hidden = !isActive;
  });
  document.querySelectorAll(".nav-item").forEach((btn) => {
    const active = btn.dataset.view === viewName;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-current", active ? "page" : null);
  });
}
function initNavigation() {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });
}
function renderHeroChips(next) {
  const container = document.getElementById("next-chips");
  container.innerHTML = "";
  if (!next) return;
  const chips = [
    { icon: "bi-bookmark-fill", text: getTypeLabel(next.type), cls: `chip-type-${next.type}` }
  ];
  if (next.placeLabel) {
    const icon = next.room ? "bi-geo-alt-fill" : next.place === "home" ? "bi-house-fill" : "bi-laptop";
    chips.push({ icon, text: next.placeLabel, cls: "" });
  }
  chips.push({ icon: "bi-calendar3", text: next.dayLabel, cls: "" });
  chips.forEach((c) => {
    const span = document.createElement("span");
    span.className = `chip ${c.cls}`.trim();
    span.innerHTML = `<i class="bi ${c.icon}"></i>${c.text}`;
    container.appendChild(span);
  });
}
function renderLiveTracking(now) {
  const { special, event: current } = getCurrentEvent(now);
  const next = getNextEvent(now);
  const currentStatus = document.getElementById("current-status");
  const currentMeta = document.getElementById("current-meta");
  const nextTitle = document.getElementById("next-title");
  const nextMeta = document.getElementById("next-meta");
  const countdown = document.getElementById("countdown");
  const heroEyebrow = document.getElementById("hero-eyebrow");
  const nowCard = document.getElementById("now-card");
  const progressTrack = document.getElementById("progress-track");
  const progressFill = document.getElementById("progress-fill");
  const progressLabel = document.getElementById("progress-label");
  const topbarChip = document.getElementById("topbar-chip");
  const topbarText = document.getElementById("topbar-status-text");
  nowCard.classList.remove("is-active");
  progressTrack.hidden = true;
  progressLabel.hidden = true;
  topbarChip.className = "topbar-status";
  if (special) {
    currentStatus.textContent = special.label;
    currentMeta.textContent = ROUTINE.dayLabels[now.getDay()];
    topbarChip.classList.add("is-off");
    topbarText.textContent = special.label;
  } else if (current) {
    currentStatus.textContent = current.title;
    currentMeta.textContent = [current.timeRange, current.placeLabel].filter(Boolean).join(" \xB7 ");
    nowCard.classList.add("is-active");
    const inClass = isClassType(current.type);
    topbarChip.classList.add(inClass ? "is-class" : "is-live");
    topbarText.textContent = inClass ? "In class" : "Now";
    const total = current.end - current.start;
    const elapsed = now - current.start;
    const pct = Math.min(100, Math.max(0, elapsed / total * 100));
    const remainMin = Math.ceil((current.end - now) / 6e4);
    progressTrack.hidden = false;
    progressLabel.hidden = false;
    progressFill.style.width = `${pct}%`;
    progressLabel.textContent = `${remainMin} min remaining`;
  } else {
    currentStatus.textContent = "Free right now";
    currentMeta.textContent = "Free until the next block";
    topbarChip.classList.add("is-live");
    topbarText.textContent = "Live";
  }
  if (next) {
    nextTitle.textContent = next.title;
    nextMeta.textContent = [next.timeRange, next.placeLabel].filter(Boolean).join(" \xB7 ");
    countdown.textContent = formatCountdown(getCountdownTo(next, now));
    heroEyebrow.textContent = "Next starts in";
    renderHeroChips(next);
  } else {
    nextTitle.textContent = "Nothing coming up";
    nextMeta.textContent = "Enjoy your break";
    countdown.textContent = "--:--:--";
    heroEyebrow.textContent = "Schedule clear";
    document.getElementById("next-chips").innerHTML = "";
  }
}
function renderTodayList(now) {
  const list = document.getElementById("today-list");
  document.getElementById("today-date").textContent = formatDateLabel(now);
  const { special, events } = getTodayEvents(now);
  list.innerHTML = "";
  if (special) {
    const empty = document.createElement("div");
    empty.className = "timeline-empty";
    empty.innerHTML = `<i class="bi bi-emoji-smile" style="font-size:1.5rem;display:block;margin-bottom:0.5rem"></i>${special.label}`;
    list.appendChild(empty);
    return;
  }
  if (!events.length) {
    const empty = document.createElement("div");
    empty.className = "timeline-empty";
    empty.textContent = "Nothing scheduled today";
    list.appendChild(empty);
    return;
  }
  let eveningLabelShown = false;
  events.forEach((event) => {
    if (event.segment === "evening" && !eveningLabelShown) {
      eveningLabelShown = true;
      list.appendChild(eveningSegmentLabel());
    }
    const item = document.createElement("div");
    item.className = "timeline-item";
    item.setAttribute("role", "listitem");
    if (isSlotActive(event, now)) item.classList.add("is-active");
    if (isSlotPast(event, now)) item.classList.add("is-past");
    item.innerHTML = `
      <div class="timeline-rail"><div class="timeline-dot"></div><div class="timeline-line"></div></div>
      <div class="timeline-body">
        <div class="timeline-time">${event.timeRange}</div>
        <p class="timeline-title">${event.title}</p>
        ${placeMarkup(event)}
        <span class="type-badge type-${event.type}">${getTypeLabel(event.type)}</span>
      </div>`;
    list.appendChild(item);
  });
}
function eveningSegmentLabel() {
  const label = document.createElement("p");
  label.className = "day-segment-label";
  const profile = getEveningProfile() === "cooking" ? "Cooking" : "No cooking";
  label.textContent = `Evening \xB7 ${profile}`;
  return label;
}
function placeMarkup(event) {
  if (!event.placeLabel) return "";
  const icon = event.room ? "bi-geo-alt" : event.place === "home" ? "bi-house" : "bi-laptop";
  return `<div class="timeline-room"><i class="bi ${icon}"></i> ${event.placeLabel}</div>`;
}
function renderDayPills(now) {
  const container = document.getElementById("day-pills");
  container.innerHTML = "";
  const todayIndex = now.getDay();
  for (let i = 0; i < 7; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "day-pill";
    btn.setAttribute("role", "tab");
    if (i === todayIndex) btn.classList.add("is-today");
    if (i === selectedDayIndex) btn.classList.add("active");
    const special = ROUTINE.specialDays[i];
    const blockCount = (ROUTINE.week[i]?.length ?? 0) + (ROUTINE.evening[getEveningProfile()]?.length ?? 0);
    btn.innerHTML = `${formatShortDay(i)}<span class="pill-sub">${special ? special.label : blockCount + " blocks"}</span>`;
    btn.addEventListener("click", () => {
      selectedDayIndex = i;
      renderDayPills(now);
      renderDayDetail(i);
    });
    container.appendChild(btn);
  }
}
function renderDayDetail(dayIndex) {
  const nameEl = document.getElementById("day-detail-name");
  const slotsEl = document.getElementById("day-slots");
  const special = ROUTINE.specialDays[dayIndex];
  nameEl.textContent = ROUTINE.dayLabels[dayIndex];
  slotsEl.innerHTML = "";
  if (special) {
    slotsEl.innerHTML = `<div class="timeline-empty">${special.label}</div>`;
    return;
  }
  const { events } = getEventsForDay(dayIndex, dateForWeekday(dayIndex));
  if (!events.length) {
    slotsEl.innerHTML = `<div class="timeline-empty">Nothing scheduled</div>`;
    return;
  }
  let eveningLabelShown = false;
  events.forEach((event) => {
    if (event.segment === "evening" && !eveningLabelShown) {
      eveningLabelShown = true;
      slotsEl.appendChild(eveningSegmentLabel());
    }
    const row = document.createElement("div");
    row.className = "day-slot-row";
    row.innerHTML = `
      <div class="day-slot-time">${event.timeRange}</div>
      <div class="day-slot-info">
        <p class="day-slot-title">${event.title}</p>
        ${placeMarkup(event)}
        <span class="type-badge type-${event.type}">${getTypeLabel(event.type)}</span>
      </div>`;
    slotsEl.appendChild(row);
  });
}
function dateForWeekday(dayIndex, now = /* @__PURE__ */ new Date()) {
  const date = new Date(now);
  const diff = dayIndex - date.getDay();
  date.setDate(date.getDate() + diff);
  date.setHours(12, 0, 0, 0);
  return date;
}
function gridCovers(entry) {
  const order = ROUTINE.slotOrder;
  const index = order.indexOf(entry.grid.slot);
  const span = entry.grid.span || 1;
  const first = ROUTINE.slots[order[index]];
  const last = ROUTINE.slots[order[index + span - 1]];
  return { start: first.start, end: last.end, span };
}
function renderRoutineTable(now) {
  const tbody = document.getElementById("routine-body");
  tbody.innerHTML = "";
  const slotOrder = ROUTINE.slotOrder;
  const todayIndex = now.getDay();
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const tr = document.createElement("tr");
    if (dayIndex === todayIndex) tr.classList.add("is-today-row");
    const th = document.createElement("th");
    th.textContent = formatShortDay(dayIndex).toUpperCase();
    tr.appendChild(th);
    const special = ROUTINE.specialDays[dayIndex];
    if (special) {
      const td = document.createElement("td");
      td.colSpan = slotOrder.length;
      td.className = "special-day";
      td.textContent = special.label;
      tr.appendChild(td);
      tbody.appendChild(tr);
      continue;
    }
    const grouped = /* @__PURE__ */ new Map();
    (ROUTINE.week[dayIndex] || []).forEach((entry) => {
      if (!entry.grid) return;
      if (!grouped.has(entry.grid.slot)) grouped.set(entry.grid.slot, []);
      grouped.get(entry.grid.slot).push(entry);
    });
    let skip = 0;
    slotOrder.forEach((slotId) => {
      if (skip > 0) {
        skip -= 1;
        return;
      }
      const group = grouped.get(slotId) || [];
      const td = document.createElement("td");
      if (group.length) {
        const span = Math.max(...group.map((entry) => entry.grid.span || 1));
        if (span > 1) td.colSpan = span;
        skip = span - 1;
        group.forEach((entry) => td.appendChild(gridBlock(entry)));
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }
}
function gridBlock(entry) {
  const block2 = document.createElement("div");
  block2.className = `grid-block cell-${entry.type}`;
  const title = document.createElement("div");
  title.textContent = entry.title;
  block2.appendChild(title);
  const covered = gridCovers(entry);
  if (entry.start !== covered.start || entry.end !== covered.end) {
    const time = document.createElement("span");
    time.className = "room-tag";
    time.textContent = `${entry.start}\u2013${entry.end}`;
    block2.appendChild(time);
  }
  if (entry.room) {
    const room = document.createElement("span");
    room.className = "room-tag";
    room.textContent = `R${entry.room}`;
    block2.appendChild(room);
  } else if (entry.place === "home") {
    const place = document.createElement("span");
    place.className = "room-tag";
    place.textContent = "Home";
    block2.appendChild(place);
  } else if (entry.place === "no-desk") {
    const place = document.createElement("span");
    place.className = "room-tag";
    place.textContent = "No desk";
    block2.appendChild(place);
  }
  return block2;
}
function updateReminderUI() {
  const summary = document.getElementById("reminder-summary");
  const infoDesc = document.getElementById("info-reminder-desc");
  const text = getReminderSummaryText();
  if (summary) summary.textContent = text;
  if (infoDesc) infoDesc.textContent = text;
  const container = document.getElementById("reminder-toggles");
  const settings = loadReminderSettings();
  container.innerHTML = "";
  PRESET_OFFSETS.forEach(({ minutes, label }) => {
    const row = document.createElement("div");
    row.className = "reminder-toggle-row";
    const lbl = document.createElement("span");
    lbl.className = "reminder-toggle-label";
    lbl.textContent = label;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-toggle";
    btn.setAttribute("aria-pressed", settings.presets[minutes] ? "true" : "false");
    btn.innerHTML = '<span class="toggle-track"><span class="toggle-thumb"></span></span>';
    btn.addEventListener("click", async () => {
      const enabled = btn.getAttribute("aria-pressed") !== "true";
      btn.setAttribute("aria-pressed", enabled ? "true" : "false");
      togglePresetOffset(minutes, enabled);
      updateReminderUI();
      if (await getPermissionStatus() === "granted") {
        await scheduleNativeReminders(getUpcomingEvents(14));
      }
    });
    row.appendChild(lbl);
    row.appendChild(btn);
    container.appendChild(row);
  });
  const chipsEl = document.getElementById("custom-chips");
  chipsEl.innerHTML = "";
  settings.custom.forEach((minutes) => {
    const chip = document.createElement("span");
    chip.className = "offset-chip";
    chip.innerHTML = `${formatOffsetLabel(minutes)} before <button type="button" aria-label="Remove">&times;</button>`;
    chip.querySelector("button").addEventListener("click", () => {
      removeCustomOffset(minutes);
      updateReminderUI();
    });
    chipsEl.appendChild(chip);
  });
}
function renderEveningToggle() {
  const profile = getEveningProfile();
  document.querySelectorAll("#evening-toggle button").forEach((btn) => {
    const active = btn.dataset.profile === profile;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
}
function initEveningToggle() {
  renderEveningToggle();
  document.querySelectorAll("#evening-toggle button").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (btn.dataset.profile === getEveningProfile()) return;
      setEveningProfile(btn.dataset.profile);
      renderEveningToggle();
      await syncEveningProfileToSW();
      tick();
      if (await getPermissionStatus() === "granted") {
        await scheduleNativeReminders(getUpcomingEvents(14));
      }
    });
  });
}
function initReminderSettings() {
  updateReminderUI();
  document.getElementById("btn-add-reminder").addEventListener("click", () => {
    const input = document.getElementById("custom-minutes");
    const result = addCustomOffset(input.value);
    if (!result.ok) {
      showBroadcastFeedback(result.error, "error");
      return;
    }
    input.value = "";
    updateReminderUI();
    showBroadcastFeedback("Custom reminder added", "success");
  });
}
function showBroadcastFeedback(msg, type) {
  const el = document.getElementById("broadcast-feedback");
  el.hidden = false;
  el.textContent = msg;
  el.className = `broadcast-feedback is-${type}`;
  setTimeout(() => {
    el.hidden = true;
  }, 4e3);
}
async function updateBroadcastUI() {
  const statusEl = document.getElementById("broadcast-status");
  if (statusEl) statusEl.textContent = await getBroadcastStatusText();
  const countEl = document.getElementById("subscriber-count");
  if (isBroadcastConfigured()) {
    const count = await getSubscriberCount();
    if (count !== null) {
      countEl.hidden = false;
      countEl.textContent = `${count} subscribed device${count === 1 ? "" : "s"}`;
    }
  } else {
    countEl.hidden = true;
  }
}
function initBroadcastUI() {
  document.getElementById("btn-broadcast").addEventListener("click", async () => {
    const pin = document.getElementById("admin-pin").value;
    const message = document.getElementById("broadcast-message").value;
    const btn = document.getElementById("btn-broadcast");
    btn.disabled = true;
    try {
      const result = await sendBroadcast(message, pin);
      if (!result.ok) {
        showBroadcastFeedback(result.error, "error");
        return;
      }
      if (result.mode === "firebase") {
        showBroadcastFeedback("Sent to all subscribed devices", "success");
        document.getElementById("broadcast-message").value = "";
      } else {
        showBroadcastFeedback(result.warning || "Sent locally", "warn");
      }
    } catch {
      showBroadcastFeedback("Send failed \u2014 check Firebase config", "error");
    } finally {
      btn.disabled = false;
    }
  });
}
function getBlockedStepsHtml() {
  if (isNativePlatform()) {
    return [
      "Phone Settings \u2192 Apps \u2192 Sonia Nasrin Routine \u2192 Notifications \u2192 Allow",
      "Also check: Alarms & reminders (if shown on your device)",
      "Return here and tap Check again"
    ];
  }
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) {
    return [
      "Settings \u2192 Notifications \u2192 Safari (or Chrome)",
      "Allow notifications for this site",
      "Safari: address bar \u2192 aA \u2192 Website Settings \u2192 Allow"
    ];
  }
  if (/android/.test(ua)) {
    return [
      "Chrome: tap lock icon \u2192 Permissions \u2192 Notifications \u2192 Allow",
      "Chrome \u2192 Site settings \u2192 Notifications \u2192 mostakahmad.github.io \u2192 Allow",
      "PWA: Phone Settings \u2192 Apps \u2192 Sonia Nasrin Routine \u2192 Notifications \u2192 On"
    ];
  }
  return [
    "Click lock icon in address bar \u2192 Site settings \u2192 Notifications \u2192 Allow",
    "Chrome: Settings \u2192 Privacy \u2192 Site settings \u2192 Notifications"
  ];
}
async function renderBlockedHelp() {
  const help = document.getElementById("notif-blocked-help");
  const steps = document.getElementById("blocked-steps");
  if (!help || !steps) return;
  const status = await getPermissionStatus();
  if (status === "denied") {
    help.hidden = false;
    steps.innerHTML = getBlockedStepsHtml().map((s) => `<li>${s}</li>`).join("");
  } else {
    help.hidden = true;
  }
}
async function recheckPermission() {
  await refreshNativePermission();
  await updateNotificationBadge();
  const status = await getPermissionStatus();
  if (status === "granted") {
    await onRemindersGranted();
    showBroadcastFeedback("Notifications enabled!", "success");
    return;
  }
  if (status === "default") {
    await onEnableReminders();
    return;
  }
  showBroadcastFeedback("Still blocked \u2014 follow steps above", "warn");
}
async function updateNotificationBadge() {
  const badge = document.getElementById("notif-badge");
  const btn = document.getElementById("btn-enable");
  const status = await getPermissionStatus();
  badge.className = `status-pill ${getNotificationBadgeClass(status)}`;
  badge.textContent = getNotificationBadgeText(status);
  if (status === "granted") {
    btn.setAttribute("aria-pressed", "true");
    btn.disabled = true;
  } else if (status === "denied") {
    btn.setAttribute("aria-pressed", "false");
    btn.disabled = true;
    badge.textContent = isNativePlatform() ? "Blocked \u2014 enable in phone settings" : "Blocked \u2014 enable in settings";
  } else {
    btn.setAttribute("aria-pressed", "false");
    btn.disabled = false;
  }
  await renderBlockedHelp();
}
async function onRemindersGranted() {
  const events = getUpcomingEvents(14);
  await scheduleNativeReminders(events);
  if (!isNativePlatform()) {
    await syncReminderSettingsToSW();
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "CHECK_REMINDERS" });
    }
  }
  initBroadcast();
  await updateBroadcastUI();
}
function tick() {
  const now = /* @__PURE__ */ new Date();
  renderLiveTracking(now);
  renderTodayList(now);
  renderDayPills(now);
  renderDayDetail(selectedDayIndex);
  renderRoutineTable(now);
  checkReminders(now, (message) => {
    showNotification(message.title, { body: message.body, tag: message.title });
  });
}
async function onEnableReminders() {
  const permission = await requestPermission();
  await updateNotificationBadge();
  if (permission === "granted") {
    await onRemindersGranted();
    const offsets = getEnabledReminderOffsets().map(formatOffsetLabel).join(", ");
    showNotification("Reminders enabled", {
      body: `Alerts: ${offsets} before each block.`,
      tag: "reminder-enabled"
    });
  }
}
async function onAppResume() {
  await refreshNativePermission();
  await updateNotificationBadge();
  const status = await getPermissionStatus();
  if (status === "granted") {
    await scheduleNativeReminders(getUpcomingEvents(14));
    initBroadcast();
    await updateBroadcastUI();
  }
  tick();
}
function initCapacitorLifecycle() {
  if (!isNativePlatform()) return;
  App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) onAppResume();
  });
}
async function init() {
  document.getElementById("dept-title").textContent = ROUTINE.person;
  document.getElementById("term-label").textContent = ROUTINE.term;
  document.getElementById("footer-note").textContent = ROUTINE.footerNote;
  const version = document.getElementById("app-version");
  if (version) version.textContent = `${ROUTINE.person} \xB7 ${ROUTINE.term}`;
  selectedDayIndex = (/* @__PURE__ */ new Date()).getDay();
  initNavigation();
  initEveningToggle();
  initReminderSettings();
  initBroadcastUI();
  initCapacitorLifecycle();
  await syncEveningProfileToSW();
  await updateNotificationBadge();
  await updateBroadcastUI();
  tick();
  document.getElementById("btn-enable").addEventListener("click", onEnableReminders);
  document.getElementById("btn-recheck-permission").addEventListener("click", recheckPermission);
  setInterval(tick, TICK_MS);
  setInterval(() => {
    const now = /* @__PURE__ */ new Date();
    const next = getNextEvent(now);
    const countdown = document.getElementById("countdown");
    if (next) countdown.textContent = formatCountdown(getCountdownTo(next, now));
    const { event: current } = getCurrentEvent(now);
    if (current) {
      const progressFill = document.getElementById("progress-fill");
      const progressLabel = document.getElementById("progress-label");
      const total = current.end - current.start;
      const elapsed = now - current.start;
      const pct = Math.min(100, Math.max(0, elapsed / total * 100));
      const remainMin = Math.ceil((current.end - now) / 6e4);
      if (progressFill) progressFill.style.width = `${pct}%`;
      if (progressLabel) progressLabel.textContent = `${remainMin} min remaining`;
    }
  }, 1e3);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) onAppResume();
  });
  await initNotifications();
  if (await getPermissionStatus() === "granted") {
    initBroadcast();
  }
}
document.addEventListener("DOMContentLoaded", () => {
  init().catch(console.error);
});
/*! Bundled license information:

@capacitor/core/dist/index.js:
  (*! Capacitor: https://capacitorjs.com/ - MIT License *)
*/
