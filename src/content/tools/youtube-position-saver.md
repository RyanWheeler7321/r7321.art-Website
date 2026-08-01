---
layout: layouts/tool.njk
title: YouTube Position Saver
slug: youtube-position-saver
date: 2026-03-24
summary: Chrome extension that saves and restores your exact spot in YouTube videos more reliably than watch history usually does.
thumbnail: /images/tools/youtube-position-saver/icon.svg
tags:
  - tools
  - Browser Tool
  - Chrome Extension
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
      summary: Records the exact point reached in each YouTube video.
      symbol: clock
    - title: Automatic Restore
      summary: Returns the video to the saved position when you come back later.
      symbol: restore
    - title: Save Interval
      summary: Lets you control how frequently the current position is recorded.
      symbol: sliders
    - title: Video Blacklist
      summary: Excludes videos that should never receive saved progress.
      symbol: ban
    - title: Manual Save
      summary: Stores the current position immediately when you ask it to.
      symbol: save
    - title: Quick Toggle
      summary: Turns the extension on or off without digging through settings.
      symbol: toggle
permalink: /tools/youtube-position-saver/index.html
---
## Overview

This Chrome extension saves your position in YouTube videos and restores it when you come back later. YouTube already kind of does this through watch history, but it misses often enough that I wanted a version that actually behaves the way I want.

## Installation

It is not on the Chrome Web Store right now. Turn on Developer mode in Chrome, choose `Load unpacked`, and point it at the repo folder.

## Notes

Saved positions and blacklist data stay local. Settings use Chrome's extension storage. You can control the save interval, manually save a position, blacklist videos entirely, and turn the extension on or off without digging through settings.
