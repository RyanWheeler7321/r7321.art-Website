---
layout: layouts/tool.njk
title: Unity Tools
slug: unity-tools
date: 2024-11-19
summary: Reusable Unity C# scripts for managers, saves, audio, utilities, triggers, animation events, and tracking.
thumbnail: /images/tools/unity-tools/icon.svg
icon: fas fa-gear
tags:
  - tools
  - Unity Tools
  - C#
externalLinks:
  - label: GitHub Repo
    url: https://github.com/RyanWheeler7321/UnityTools
permalink: /tools/unity-tools/index.html
---
## Overview

Unity Tools is a set of C# scripts for Unity built around practical systems that save setup time across projects.

## Included scripts

- `MAIN` gives you a central singleton for shared references, screen fades, level loading hooks, and debug helpers.
- `OptionsMenu` handles local saving for core settings like volume, resolution, and quality values.
- `Save` stores serializable game data and custom data to file with easy singleton access.
- `Sound` covers SFX and music playback, soundbanks, pooling, pitch and volume variation, 3D or UI playback, reverb, panning, fades, and loop handling.
- `Util` is a static helper collection for common development shortcuts, delayed actions, random calculations, object lookups, and other repeated tasks.
- `AnimatorEventPasser` works around animator event limits by forwarding events to referenced objects.
- `Trigger` exposes enter, exit, and stay events through a reusable trigger-collider setup.
- `Tracker` follows a target transform with options for lookahead, damping, rotation follow, automatic player tracking, and Y locking.

## Notes

Some scripts are drop-in ready, while others assume you will connect them to your own project structure or UI. The repo is meant as a reusable foundation, not a one-click framework.
