---
layout: layouts/tool.njk
title: Paint Studio
slug: paint-studio
detailAccentRgb: "67, 191, 255"
date: 2026-04-04
summary: Custom painting app I use for quick edits, thumbnails and rough concept work.
thumbnail: /images/tools/paint-studio/icon.svg
tags:
  - tools
  - Desktop App
  - Art Tool
showcaseImages:
  - src: /images/tools/paint-studio/showcase-1.png
    alt: Paint Studio painting workspace
externalLinks:
  - label: GitHub Repo
    url: https://github.com/RyanWheeler7321/Paint-Studio
dossier:
  facts:
    - label: Platform
      value: Windows
    - label: Stack
      value: Python, PySide6
    - label: Type
      value: Desktop App
    - label: Repository
      value: GitHub
  features:
    - title: Brushes
      summary: Air, Ink, Paint, Shape, Blur, Stamp and Fill, and each brush keeps its own settings.
      symbol: brush
    - title: Layers
      summary: Layers and groups with blend modes, opacity, alpha lock and clipping masks.
      symbol: layers
    - title: Selections
      summary: Freehand selections you can add to, subtract from or intersect.
      symbol: selection
    - title: Transforms
      summary: Move, scale, rotate, skew and perspective on the selection or selected layers.
      symbol: move
    - title: Smart Shape
      summary: Draw a rough shape and hold still, and it turns into a clean shape you can resize and rotate.
      symbol: sparkles
    - title: Local Bridge
      summary: Scripts and AI agents can read the canvas and paint strokes into it over a local socket.
      symbol: braces
permalink: /tools/paint-studio/index.html
---
## Overview

Paint Studio is a custom painting app I use for quick edits, thumbnails and rough concept work. The canvas gets most of the window, with the brush and layer panels kept small on the side.

It has crash recovery, its own `.paintstudio` files and PNG export. Closing the window saves the painting as a project, and `Open Recent` brings projects back with their full undo history.

## Setup

It's made for Windows, and I run it on Python 3.12. Install PySide6 and NumPy, then run `launch.pyw`.
