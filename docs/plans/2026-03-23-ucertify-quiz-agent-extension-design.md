# uCertify Quiz Agent Extension Design

## Goal

Wrap the existing browser-side uCertify quiz agent in a Chrome Manifest V3 extension so the user can run it with popup buttons instead of pasting code into DevTools.

## Scope

The extension will target `https://www.ucertify.com/*`, expose popup controls for `Start`, `Stop`, and `Download`, and run the existing agent logic inside a content script on matching pages.

## Architecture

- `manifest.json` declares a popup and a content script for uCertify pages.
- `content-script.js` embeds the existing agent logic, keeps a singleton agent instance per tab, and listens for popup messages.
- `popup.html`, `popup.js`, and `popup.css` provide the control surface and status messages.

The popup sends commands with `chrome.tabs.sendMessage`. The content script starts or stops the agent and returns lightweight status snapshots so the popup can show progress.

## Behavior

- `Start` creates or reuses an agent and runs it.
- `Stop` flips the running flag without losing collected results.
- `Download` serializes the saved results and triggers the existing JSON download flow.
- `Status` reports `idle`, `running`, `finished`, or `error` with question count.

## Constraints

- No background worker is needed for the first version.
- The extension should fail clearly if the page is not a uCertify review page.
- Keep permissions minimal: only `activeTab`, `tabs`, and the uCertify host match.

## Testing

Test the message handler and popup command formatting under Node, then manually load the unpacked extension in Chrome for a live-page sanity check.
