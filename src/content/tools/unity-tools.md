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
dossier:
  facts:
    - label: Platform
      value: Unity
    - label: Language
      value: C#
    - label: Type
      value: Script Collection
    - label: Repository
      value: GitHub
  features:
    - title: Animation Events
      summary: EventPasser forwards animation events into inspector-assigned UnityEvents.
      symbol: bolt
    - title: Trigger Events
      summary: Trigger exposes enter, exit, and stay callbacks through one reusable setup.
      symbol: trigger
    - title: Target Tracking
      summary: Tracker follows a target transform with practical control over the result.
      symbol: target
    - title: Motion Smoothing
      summary: Adds lookahead, damping, rotation follow, and optional Y locking.
      symbol: wave
    - title: Common Helpers
      summary: Util collects reusable object, coroutine, math, and random helpers.
      symbol: toolbox
    - title: Scene Helpers
      summary: Keeps small scene-loading and object lookup utilities close at hand.
      symbol: scene
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
