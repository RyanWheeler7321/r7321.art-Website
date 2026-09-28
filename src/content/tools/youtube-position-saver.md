---
layout: layouts/tool.njk
title: YouTube Position Saver
slug: youtube-position-saver
detailAccentRgb: "255, 75, 75"
date: 2026-03-24
summary: Chrome extension that saves and restores your exact spot in YouTube videos more reliably than watch history usually does.
thumbnail: /images/tools/youtube-position-saver/icon.svg
tags:
  - tools
  - Browser
showcaseImages:
  - src: /images/tools/youtube-position-saver/showcase.webp
    alt: YouTube Position Saver extension popup
externalLinks:
  - label: GitHub Repo
    url: https://github.com/RyanWheeler7321/Youtube-Position-Saver
dossier:
  facts:
    - label: Platform
      value: Chrome
    - label: Stack
      value: Extension
    - label: Storage
      value: Local
    - label: Repository
      value: GitHub
  features:
    - title: Position Saving
      summary: Saves your exact spot in each YouTube video.
      symbol: clock
    - title: Automatic Restore
      summary: Returns the video to the saved position when you come back later.
      symbol: restore
    - title: Save Interval
      summary: Auto-saves on an interval from 1 to 30 seconds.
      symbol: sliders
    - title: Video Blacklist
      summary: Blacklist videos you don't want it to save.
      symbol: ban
    - title: Manual Save
      summary: Save the current position with one button.
      symbol: save
    - title: Quick Toggle
      summary: Power button to turn it on or off.
      symbol: toggle
permalink: /tools/youtube-position-saver/index.html
---
## Overview

This Chrome extension saves your position in YouTube videos and restores it when you come back later. YouTube already kind of does this through watch history, but it misses often enough that I wanted a version that actually behaves the way I want.

## Installation

It is not on the Chrome Web Store right now. Turn on Developer mode in Chrome, choose `Load unpacked`, and point it at the repo folder.
