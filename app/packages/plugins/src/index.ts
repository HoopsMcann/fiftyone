import React, { FunctionComponent, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { getFetchFunction, getFetchOrigin } from "@fiftyone/utilities";
import * as recoil from "recoil";
import * as fos from "@fiftyone/state";
import * as _ from "lodash";
import { State } from "@fiftyone/state";
declare global {
  interface Window {
    __fo_plugin_registry__: PluginComponentRegistry;
    React: any;
    ReactDOM: any;
    recoil: any;
    __fos__: any;
  }
}

// required for plugins to use the same instance of React
window.React = React;
window.ReactDOM = ReactDOM;
window.recoil = recoil;
window.__fos__ = fos;

function usingRegistry() {
  if (!window.__fo_plugin_registry__)
    window.__fo_plugin_registry__ = new PluginComponentRegistry();
  return window.__fo_plugin_registry__;
}

export function registerComponent<T>(
  registration: PluginComponentRegistration<T>
) {
  if (!registration.activator) {
    registration.activator = () => true;
  }
  usingRegistry().register(registration);
}
export function unregisterComponent(name: string) {
  usingRegistry().unregister(name);
}
export function getByType(type: PluginComponentType) {
  return usingRegistry().getByType(type);
}

type PluginDescription = {
  scriptPath: string;
  name: string;
};
type PluginSetting = {
  [settingName: string]: any;
  enabled?: boolean;
};
type PluginSettings = { [pluginName: string]: PluginSetting };
type PluginFetchResult = {
  plugins: PluginDescription[];
  settings?: PluginSettings;
};
async function fetchPluginsMetadata(): Promise<PluginFetchResult> {
  return getFetchFunction()("GET", "/plugins");
  const res = await fetch("/plugins", { method: "GET" });
  return res.json();
}

let _settings = null;
export async function loadPlugins() {
  const { plugins, settings } = await fetchPluginsMetadata();
  window.__fo_plugin_settings__ = settings;
  for (const { scriptPath, name } of plugins) {
    const pluginSetting = settings && settings[name];
    if (!pluginSetting || pluginSetting.enabled !== false) {
      await loadScript(name, `${getFetchOrigin()}${scriptPath}`);
    }
  }
}
async function loadScript(name, url) {
  return new Promise<void>((resolve, reject) => {
    const onDone = (e) => {
      script.removeEventListener("load", onDone);
      script.removeEventListener("error", onDone);
      if (e.type === "load") {
        resolve();
      } else {
        reject(new Error(`Plugin "${name}": Failed to script ${url}`));
      }
    };
    const script = document.createElement("script");
    script.type = "application/javascript";
    script.src = url;
    script.async = true;
    document.head.prepend(script);
    script.addEventListener("load", onDone);
    script.addEventListener("error", onDone);
  });
}

export function usePlugins() {
  const [state, setState] = useState("loading");
  useEffect(() => {
    loadPlugins()
      .catch(() => {
        setState("error");
      })
      .then(() => {
        setState("ready");
      });
  }, []);

  return {
    isLoading: state === "loading",
    hasError: state === "error",
    ready: state === "ready",
  };
}

export function usePlugin(
  type: PluginComponentType
): PluginComponentRegistration[] {
  return usingRegistry().getByType(type);
}

export function useActivePlugins(type: PluginComponentType, ctx: any) {
  return useMemo(
    () =>
      usePlugin(type).filter((p) => {
        if (typeof p.activator === "function") {
          return p.activator(ctx);
        }
        return false;
      }),
    [ctx]
  );
}

export enum PluginComponentType {
  Visualizer,
  Plot,
}

type PluginActivator = (props: any) => boolean;
interface PluginComponentRegistration<T extends {} = {}> {
  name: string;
  label?: string;
  component: FunctionComponent<T>;
  type: PluginComponentType;
  activator: PluginActivator;
}

const DEFAULT_ACTIVATOR = () => true;

function assert(ok, msg) {
  if (ok === false || ok === null || ok === undefined) throw new Error(msg);
}
const REQUIRED = ["name", "type", "component"];
class PluginComponentRegistry {
  private data = new Map<string, PluginComponentRegistration>();
  register(registration: PluginComponentRegistration) {
    const { name } = registration;

    if (typeof registration.activator !== "function") {
      registration.activator = DEFAULT_ACTIVATOR;
    }

    for (let fieldName of REQUIRED) {
      assert(
        registration[fieldName],
        `${fieldName} is required to register a Plugin Component`
      );
    }
    assert(
      !this.data.has(name),
      `${name} is already a registered Plugin Component`
    );
    this.data.set(name, registration);
  }
  unregister(name: string): boolean {
    return this.data.delete(name);
  }
  getByType(type: PluginComponentType) {
    const results = [];
    for (const registration of this.data.values()) {
      if (registration.type === type) {
        results.push(registration);
      }
    }

    return results;
  }
}

export function usePluginSettings<T>(
  pluginName: string,
  defaults?: Partial<T>
): T {
  const dataset = recoil.useRecoilValue(fos.dataset);
  const appConfig = recoil.useRecoilValue(fos.appConfig);
  const datasetPlugins = _.get(dataset, "appConfig.plugins", {});
  const appConfigPlugins = _.get(appConfig, "plugins", {});

  const settings = _.merge<T | {}, Partial<T>, Partial<T>>(
    { ...defaults },
    _.get(appConfigPlugins, pluginName, {}),
    _.get(datasetPlugins, pluginName, {})
  );

  return settings as T;
}
