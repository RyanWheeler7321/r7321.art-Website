---
layout: layouts/tool.njk
title: Krita Random Exporter
slug: krita-random-exporter
date: 2024-11-18
summary: Krita Scripter exporter for generating large batches of layered variations with rarity control and optional animation output.
thumbnail: /images/tools/krita-random-exporter/icon.svg
icon: fas fa-image
tags:
  - tools
  - Krita Script
  - Python
externalLinks:
  - label: GitHub Repo
    url: https://github.com/RyanWheeler7321/Krita-Random-Exporter
dossier:
  facts:
    - label: Platform
      value: Krita
    - label: Language
      value: Python
    - label: Type
      value: Scripter Tool
    - label: Repository
      value: GitHub
  features:
    - title: Layer Combinations
      summary: Builds exports from structured groups of visible Krita layers.
      symbol: layers
    - title: Weighted Traits
      summary: Gives individual variations deliberate selection weights.
      symbol: weights
    - title: Rarity Groups
      summary: Controls how often broader trait groups appear across a batch.
      symbol: diamond
    - title: Unique Results
      summary: Avoids duplicate combinations while generating a large set.
      symbol: sparkles
    - title: JSON Metadata
      summary: Writes structured metadata beside the exported images.
      symbol: braces
    - title: Animation Export
      summary: Can assemble optional animated GIF output through FFmpeg.
      symbol: film
permalink: /tools/krita-random-exporter/index.html
---
## Overview

Krita Random Exporter is a Python script for exporting randomized combinations of visible Krita layers, with weighted traits, rarity groups, unique combinations, JSON metadata, and optional animated GIFs.

## Setup

Edit the configuration block in `randomMassExporter.py`, then run it through Krita's built-in Scripter plugin with the source document open.

Layer hierarchy in the Krita file needs to mirror the attribute setup in the script, with names formatted as `traitName_variationName`.

## Animation export

For animation output, enable `GENERATE_ANIMATION` and point `FFMPEG_EXECUTABLE` at FFmpeg.
