---
layout: layouts/tool.njk
title: 3D Viewer
slug: 3d-viewer
date: 2026-05-08
summary: Small desktop viewer for quickly opening 3D models, testing lighting, and checking topology before moving assets through a pipeline.
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
      summary: Quickly orbit, pan, zoom, and inspect the asset from any angle.
      symbol: orbit
    - title: Lighting Checks
      summary: Tests models under different lights and HDRI environments.
      symbol: sun
    - title: Clay View
      summary: Removes material noise so the form and silhouette are easier to judge.
      symbol: material
    - title: Wireframe View
      summary: Exposes topology and edge flow without opening a larger DCC.
      symbol: wireframe
    - title: Quick Framing
      summary: Keeps inspection fast with simple camera and presentation controls.
      symbol: camera
permalink: /tools/3d-viewer/index.html
---
## Overview

3D Viewer is a small desktop app for checking models without opening Blender, Unity, or another heavier tool every time.

It opens `.glb`, `.gltf`, `.fbx`, and `.zip` files, including zipped glTF or GLB bundles. The main use is quick inspection: move around the model, try different lighting or HDRI setups, switch to clay or wireframe, and decide whether the asset is ready for the next step.

I use it as a small part of a larger 3D asset workflow, but the viewer itself is standalone.
