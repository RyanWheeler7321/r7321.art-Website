---
layout: layouts/tool.njk
title: Unity Tools
slug: unity-tools
date: 2024-11-19
summary: Small reference collection of standalone Unity C# utilities, triggers, animation events, and tracking helpers.
thumbnail: /images/tools/unity-tools/icon.svg
icon: fas fa-gear
tags:
  - tools
  - Unity Tools
  - C#
externalLinks:
  - label: GitHub Repo
    url: https://github.com/RyanWheeler7321/Unity-Tools
permalink: /tools/unity-tools/index.html
---
## Overview

Unity Tools is a small collection of standalone Unity C# scripts I keep around as reference. They are meant to be read or copied individually rather than installed as a package.

## Included scripts

- `EventPasser` forwards animation events to inspector-assigned UnityEvents.
- `Trigger` exposes enter, exit, and stay events through a reusable trigger-collider setup.
- `Tracker` follows a target transform with options for lookahead, damping, rotation follow, automatic player tracking, and Y locking.
- `Util` collects object, coroutine, math, random, and scene-loading helpers.

## Notes

My larger current Unity systems are collected separately in [MAZE Tools](/tools/maze-tools/).
