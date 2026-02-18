import browser from "webextension-polyfill";
import MarktoneConfig from "./marktone-config";

function setExtensionIcon(enabled: boolean): void {
  const path = browser.runtime.getURL(
    enabled ? "icons/icon48.png" : "icons/disabled-icon48.png",
  );
  browser.action.setIcon({ path }).catch(console.error);
}

MarktoneConfig.loadEnabled((enabled) => {
  setExtensionIcon(enabled);
});

browser.action.onClicked.addListener((_tab) => {
  MarktoneConfig.loadEnabled((enabled) => {
    const newEnabled = !enabled;

    setExtensionIcon(newEnabled);

    void MarktoneConfig.saveEnabled(newEnabled);
  });
});
