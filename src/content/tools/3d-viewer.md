---
layout: layouts/tool.njk
title: 3D Viewer
slug: 3d-viewer
date: 2026-05-08
summary: Small desktop viewer for quickly opening 3D models, testing lighting, and checking topology before moving assets through a pipeline.
thumbnail: /images/tools/3d-viewer/showcase-1.png
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
permalink: /tools/3d-viewer/index.html
---
## Overview

3D Viewer is a small desktop app for checking models without opening Blender, Unity, or another heavier tool every time.

It opens `.glb`, `.gltf`, `.fbx`, and `.zip` files, including zipped glTF or GLB bundles. The main use is quick inspection: move around the model, try different lighting or HDRI setups, switch to clay or wireframe, and decide whether the asset is ready for the next step.

## Workflow

In my own setup, I have it hooked into AutoHotkey and some 3D model development pipelines so generated or downloaded assets can be checked quickly before moving forward.

The public repo is the standalone viewer part. It is meant to be useful on its own, but it also works well as a small piece inside a larger asset workflow.

{% cta "https://github.com/RyanWheeler7321/3D-Viewer", "Open repo", "GitHub" %}
