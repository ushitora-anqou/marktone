(async () => {
  const runtime =
    typeof browser !== "undefined" ? browser.runtime : chrome.runtime;
  const script = runtime.getURL("content.js");
  await import(script);
})();
