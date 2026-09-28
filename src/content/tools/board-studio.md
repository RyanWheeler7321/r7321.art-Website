---
layout: layouts/tool.njk
title: Board Studio
slug: board-studio
detailAccentRgb: "46, 139, 255"
date: 2026-04-04
summary: Desktop board app for collecting references and organizing projects with text, images, links, audio, video and 3D models.
thumbnail: /images/tools/board-studio/icon.svg
tags:
  - tools
  - Art
showcaseImages:
  - src: /images/tools/board-studio/showcase-1.png
    alt: Board Studio with the terminal open and a project board
externalLinks:
  - label: GitHub Repo
    url: https://github.com/RyanWheeler7321/Board-Studio
dossier:
  facts:
    - label: Platform
      value: Windows
    - label: Stack
      value: Electron
    - label: Type
      value: Desktop App
    - label: Repository
      value: GitHub
  features:
    - title: Nested Boards
      summary: Boards are created and stored inside other boards, recursively.
      symbol: board
    - title: Mixed Media
      summary: Text, images, links, audio, video and animated 3D models on the same board, with arrows connecting them.
      symbol: media
    - title: Fast Import
      summary: Paste or drop images, audio, video and links straight onto the board.
      symbol: clipboard
    - title: Board Previews
      summary: Each board shows a preview of what's inside it.
      symbol: preview
    - title: Terminal Panel
      summary: A terminal on the left side of the window, toggled with the backtick key.
      symbol: terminal
    - title: Local CLI
      summary: Scripts and AI agents can put images on a board, read what's there and move things around.
      symbol: braces
permalink: /tools/board-studio/index.html
---
## Overview

Board Studio is a desktop board app I built for collecting references, organizing projects, and keeping text, images, links, audio, video and 3D models together.

There's a terminal panel on the left and a small local CLI, so scripts or AI agents can put images on a board, read what's there and move things around.

It isn't a packaged release. To run it, clone the repo, then `npm install` and `npm start`.
