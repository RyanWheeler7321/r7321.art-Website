---
layout: layouts/tool.njk
title: r7-EQ
slug: r7-eq
detailAccentRgb: "255, 61, 170"
date: 2026-09-28
summary: Custom EQ app for Equalizer APO, with a compressor and a profile for each playback device.
thumbnail: /images/tools/r7-eq/icon.svg
tags:
  - tools
  - Music
showcaseImages:
  - src: /images/tools/r7-eq/showcase.png
    alt: r7-EQ, with the EQ curve over a live spectrum analyzer and the dials below it
externalLinks:
  - label: GitHub Repo
    url: https://github.com/RyanWheeler7321/r7-EQ
dossier:
  facts:
    - label: Platform
      value: Windows
    - label: Language
      value: Python, C++
    - label: Type
      value: Desktop App
    - label: Repository
      value: GitHub
  features:
    - title: EQ Curve
      summary: Up to 64 points, over a live spectrum analyzer.
      symbol: wave
    - title: Tone and Space
      summary: Dials for tilt, warmth, presence and air, plus stereo width, 3D and room reverb.
      symbol: sliders
    - title: Compressor
      summary: Based on Chrome's Web Audio compressor code, and the T button sets a reasonable default for TV and dialogue.
      symbol: bolt
    - title: Device Profiles
      summary: Each playback device has its own settings and presets, and the app switches to whichever one Windows is using.
      symbol: layers
    - title: Switches
      summary: The All switch turns r7-EQ off for every device, and the EQ and Comp switches only affect the current device.
      symbol: toggle
permalink: /tools/r7-eq/index.html
---
## Overview

r7-EQ is a small EQ app for Equalizer APO. I made it for my speakers and headphones, mostly to bring down the dynamic range on the speakers and shape the sound the way I like.

The processing runs inside Equalizer APO, so it keeps working with the window closed. It's pretty barebones and mostly made for my own setup, but it should work with anything Equalizer APO supports.
