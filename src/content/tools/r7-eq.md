---
layout: layouts/tool.njk
title: r7-EQ
slug: r7-eq
detailAccentRgb: "255, 61, 170"
date: 2026-09-28
summary: Custom EQ app on top of Equalizer APO, with Twitch's compressor and a profile for each playback device.
thumbnail: /images/tools/r7-eq/icon.svg
tags:
  - tools
  - Music
showcaseImages:
  - src: /images/tools/r7-eq/showcase.png
    alt: r7-EQ with an EQ curve over the live analyzer and the dials underneath
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
      summary: Up to 64 points, drawn over a live analyzer of what's playing.
      symbol: wave
    - title: Tone and Space
      summary: Dials for tilt, warmth, presence and air, plus stereo width, 3D and a small room.
      symbol: sliders
    - title: Twitch Compressor
      summary: Built from Chrome's own compressor code, with the Twitch settings on one button.
      symbol: bolt
    - title: Device Profiles
      summary: Each playback device keeps its own settings and presets, and the editor follows the one Windows is using.
      symbol: layers
    - title: Switches
      summary: One switch turns everything off for all devices, and the EQ and compressor turn on or off per device.
      symbol: toggle
permalink: /tools/r7-eq/index.html
---
## Overview

r7-EQ is a small EQ app on top of Equalizer APO. I made it for my speakers and headphones, mostly to bring down the dynamic range on the speakers and shape the sound the way I like.

It's pretty barebones and mostly made for my own setup, but it should work with any setup Equalizer APO supports. The processing runs inside Equalizer APO, so it keeps working with the window closed.
