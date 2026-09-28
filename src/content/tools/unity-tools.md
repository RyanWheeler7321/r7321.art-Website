---
layout: layouts/tool.njk
title: Unity Tools
slug: unity-tools
detailAccentRgb: "79, 214, 255"
date: 2024-11-19
summary: Small collection of Unity C# scripts for a game manager, saving, sound, options, triggers, tracking and common helpers.
thumbnail: /images/tools/unity-tools/icon.svg
icon: fas fa-gear
tags:
  - tools
  - Unity
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
    - title: Game Manager
      summary: MAIN is a central singleton with a screen fade, level loading and debug tools.
      symbol: gamepad
    - title: Saving
      summary: SaveManager saves any serializable data to a file, custom classes included.
      symbol: save
    - title: Sound
      summary: Pooled SFX with sound banks, and music with an intro section that leads into a loop.
      symbol: wave
    - title: Options Menu
      summary: OptionsMenu saves volume, resolution and quality settings through PlayerPrefs.
      symbol: sliders
    - title: Animation Events
      summary: AnimatorEventPasser fires animation events on any object set in the inspector.
      symbol: bolt
    - title: Target Tracking
      summary: Tracker follows a target, with optional controls such as lookahead, damping and rotation.
      symbol: target
permalink: /tools/unity-tools/index.html
---
## Overview

Unity Tools is a small collection of Unity C# scripts I keep around as reference. My newer rendering and LOD systems are in [MAZE Tools](/tools/maze-tools/).

## Included scripts

- `MAIN` is a central singleton for the main game manager, with a screen fade, level loading and debug tools.
- `SaveManager` saves game data and custom data to a file. Anything serializable can be stored.
- `Sound` handles pooled SFX with sound banks, pitch and volume variation, 3D and UI sounds, and music with fades and intro-to-loop tracks.
- `OptionsMenu` saves volume, resolution and quality settings through PlayerPrefs. It's built on my own menu UI and a few other scripts, so it needs hooking up to your own.
- `AnimatorEventPasser` fires animation events on any object set in the inspector, not just the one with the animator.
- `Trigger` fires enter, exit and stay events from a trigger collider, filtered by tag.
- `Tracker` follows a target transform with options for lookahead, damping, rotation follow, automatic player tracking and Y locking.
- `Util` has object, coroutine, math, random and scene-loading helpers.
