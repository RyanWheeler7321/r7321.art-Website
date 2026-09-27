---
layout: layouts/tool.njk
title: Krita Random Exporter
slug: krita-random-exporter
detailAccentRgb: "255, 184, 77"
date: 2024-11-18
summary: Python script for exporting big batches of random layer combinations from Krita, with rarity and optional GIFs.
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
      summary: Turns named trait layers on and off for each image, including layers inside groups.
      symbol: layers
    - title: Weighted Traits
      summary: Each normal variation has a weight that sets how often it shows up.
      symbol: weights
    - title: Rarity Groups
      summary: Set how many images each rarity gets, with rare variations more likely at higher rarities.
      symbol: diamond
    - title: Unique Results
      summary: No duplicate combinations, and it stops with an error if it runs out.
      symbol: sparkles
    - title: JSON Metadata
      summary: Saves each image's traits and rarity to a JSON file.
      symbol: braces
    - title: Animation Export
      summary: Optional animated GIFs through FFmpeg.
      symbol: film
permalink: /tools/krita-random-exporter/index.html
---
## Overview

Python script for exporting large batches of random images from Krita by turning trait layers on and off. It handles weighted traits, rarity, unique combinations, JSON metadata and optional animated GIFs.

It's basically the scaffolding from a script I used in 2021 to generate a bunch of random images and gifs, so it's meant as a starting point to modify, not something to run as is.

## Setup

Edit the attributes and `rarity_counts` at the top of `randomMassExporter.py`, then run it through Krita's built-in Scripter plugin with the source document open. Trait layers need names like `traitName_variationName`, and they can be inside groups.

## Animation export

Set up the animation timeline in Krita, leave `generate_animation` on, and set `ffmpeg_path` if FFmpeg isn't on your PATH.
