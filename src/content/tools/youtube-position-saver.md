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
permalink: /tools/youtube-position-saver/index.html
---
## Overview

This Chrome extension saves your position in YouTube videos and restores it when you come back later. YouTube already kind of does this through watch history, but it misses often enough that I wanted a version that actually behaves the way I want.

## Installation

It is not on the Chrome Web Store right now. Turn on Developer mode in Chrome, choose `Load unpacked`, and point it at the repo folder.

## Notes

Everything stays local in Chrome storage. You can control the save interval, manually save a position, blacklist videos entirely, and turn the extension on or off without digging through settings.
