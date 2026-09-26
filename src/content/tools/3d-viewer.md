---
layout: layouts/tool.njk
title: 3D Viewer
slug: 3d-viewer
detailAccentRgb: "255, 78, 145"
date: 2026-05-08
summary: Small desktop viewer for quickly opening 3D models, testing lighting, and checking topology.
thumbnail: /images/tools/3d-viewer/icon.svg
tags:
  - tools
  - Desktop App
  - 3D Tool
  - Python
showcaseImages:
  - src: /images/tools/3d-viewer/showcase-1.png
    alt: 3D Viewer showing a character model against a simple brown background
  - src: /images/tools/3d-viewer/showcase-2.png
    alt: 3D Viewer showing a planter box model with a wireframe overlay
externalLinks:
  - label: GitHub Repo
    url: https://github.com/RyanWheeler7321/3D-Viewer
dossier:
  facts:
    - label: Platform
      value: Windows
    - label: Language
      value: Python
    - label: Type
      value: Desktop App
    - label: Repository
      value: GitHub
  features:
    - title: Format Support
      summary: Opens GLB, glTF, FBX, and zipped model bundles.
      symbol: cube
    - title: Model Navigation
      summary: Orbit, pan and zoom with the mouse.
      symbol: orbit
    - title: Lighting Checks
      summary: Tests models under different lights and HDRI environments.
      symbol: sun
    - title: Clay View
      summary: Plain clay material for checking the form and silhouette.
      symbol: material
    - title: Wireframe View
      summary: Wireframe and x-ray views for checking topology.
      symbol: wireframe
    - title: Quick Framing
      summary: F frames the model and cycles through saved angles.
      symbol: camera
permalink: /tools/3d-viewer/index.html
---
## Overview

3D Viewer is a small desktop app for checking models without opening Blender, Unity, or another heavier tool every time.

It opens `.glb`, `.gltf`, `.fbx`, and `.zip` files, including zipped glTF or GLB bundles. You can move around the model, try different lighting or HDRI setups, and switch to clay or wireframe to check it. Animated models play in place, and a small sidecar file can group model variants so you can swap between them.
