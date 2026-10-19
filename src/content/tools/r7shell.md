---
layout: layouts/tool.njk
title: r7-Shell
slug: r7shell
detailAccentRgb: "212, 92, 255"
date: 2026-10-01
summary: A lean custom terminal for Windows, made for running agents in WSL, as well as anything else you'd run in a terminal.
description: A lean custom terminal for Windows, made for running agents in WSL, as well as anything else you'd run in a terminal.
thumbnail: /images/tools/r7shell/icon.svg
tags:
  - tools
  - Dev
showcaseImages:
  - src: /images/tools/r7shell/showcase.png
    alt: r7-Harness running in r7-Shell, with a finished reply
externalLinks:
  - label: GitHub Repo
    url: https://github.com/RyanWheeler7321/r7-Shell
dossier:
  facts:
    - label: Platform
      value: Windows + WSL
    - label: Language
      value: JavaScript
    - label: Type
      value: Desktop App
    - label: Repository
      value: GitHub
  features:
    - title: Background Sessions
      summary: Sessions keep running when the app restarts or crashes, and windows come back where they were.
      symbol: layers
    - title: r7shell Command
      summary: Start sessions, type into them, wait for output and take window screenshots without focus.
      symbol: terminal
    - title: Attention Flash
      summary: The window flashes in the theme color when an agent finishes a response, and again every 30 seconds until you look.
      symbol: bolt
    - title: Launch Screen
      summary: Water rises while an agent starts, and what you type lands in its input box.
      symbol: play
    - title: With r7-Harness
      summary: Replies and steps drawn in HTML, finished steps folded into one line, pictures in replies and mouse editing in the input box.
      symbol: tabs
    - title: Panel
      summary: A picture and buttons across the top of a window, like a Play button for a game.
      symbol: preview
permalink: /tools/r7shell/index.html
---
## Overview

r7-Shell is a lean custom terminal for Windows, made for running agents like Claude Code, Codex and my own r7-Harness in WSL, as well as anything else you'd run in a terminal.

Sessions run in the background in WSL, so they survive the app restarting or crashing, and the windows come back where they were. Closing a window keeps its session running too, and `r7shell reopen` brings the window back. The `r7shell` command can start sessions, type into them, wait for output and take screenshots of a window, so an agent can run other terminals without touching your mouse or keyboard.
