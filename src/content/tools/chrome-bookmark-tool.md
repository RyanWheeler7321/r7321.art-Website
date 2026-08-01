---
layout: layouts/tool.njk
title: Chrome Bookmark Tool
slug: chrome-bookmark-tool
date: 2025-02-19
summary: Chrome extension for picking a bookmark folder and opening one random bookmark or the whole folder from the same popup.
thumbnail: /images/tools/chrome-bookmark-tool/icon.svg
icon: fas fa-bookmark
tags:
  - tools
  - Browser Tool
  - Chrome Extension
externalLinks:
  - label: GitHub Repo
    url: https://github.com/RyanWheeler7321/Chrome-Bookmark-Tool
dossier:
  facts:
    - label: Platform
      value: Chrome
    - label: Stack
      value: Extension
    - label: Type
      value: Browser Tool
    - label: Repository
      value: GitHub
  features:
    - title: Folder Picker
      summary: Chooses the bookmark folder that should drive the next action.
      symbol: folder
    - title: Random Bookmark
      summary: Opens one random entry from the selected folder.
      symbol: shuffle
    - title: Open Entire Folder
      summary: Launches every bookmark in the chosen folder when the full set is useful.
      symbol: tabs
    - title: Compact Popup
      summary: Keeps folder selection and both actions in one small extension surface.
      symbol: click
permalink: /tools/chrome-bookmark-tool/index.html
---
## Overview

Chrome Bookmark Tool is a small extension for choosing a bookmark folder and opening either one random bookmark or the whole folder.

## Installation

Clone the repo, turn on Chrome developer mode, choose `Load unpacked`, and point it at the project root.

Pin the extension, open its popup, choose a folder, then use **Open Random Bookmark** or **Open All Bookmarks**.
