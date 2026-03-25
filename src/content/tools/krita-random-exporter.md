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
    url: https://github.com/RyanWheeler7321/KritaRandomExporter
permalink: /tools/krita-random-exporter/index.html
---
## Overview

Krita Random Exporter is a Python script for exporting large amounts of varying images from Krita, with support for rarity weighting and as many random traits as you want to define.

## Setup

Load the `massExporter` script through Krita's built-in Scripter plugin. It works best if you save a local copy, edit the settings you need, and run it from there.

## How it works

Configure the attributes inside the script to match the traits you want to generate. The default example uses color, but the system is built for broader trait combinations.

Layer hierarchy in the Krita file needs to mirror the attribute setup in the script, with names formatted as `traitName_variationName`.

## Animation export

If you want animation output, set up the animation timeline in Krita and point the script at your `ffmpeg` install. If you only want still images, leave animation export disabled.
