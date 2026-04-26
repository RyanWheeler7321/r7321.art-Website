---
layout: layouts/update.njk
title: The Maze
slug: the-maze
date: 2026-04-25
summary: I've been putting together a new Unity development environment that I am calling The Maze.
thumbnail: /images/updates/the-maze/the-maze-01.png
tags:
  - updates
  - Game Dev
  - Unity
  - Technical Art
permalink: /updates/the-maze/index.html
---
I've been putting together a new Unity development environment that I am calling The Maze. It is basically a playground for keeping my game-dev experiments in one place instead of splitting every idea into a separate project.

{% image "/images/updates/the-maze/the-maze-01.png", "Unity scene running in The Maze, showing reflective water, fog, clouds, lighting, and tall test spires." %}

{% columns %}
{% column %}
Right now, this version is mostly about getting 3D rendering into a strong place. So far I've made custom Unity render pipeline features for planar reflections, screen-space reflections, procedural clouds, cloud shadows, water, volumetric fog, lighting, sun rays, shaders, and a custom post-processing setup. I will probably open source some of the individual graphics features later once they are refined enough for other people to use outside my own setup.
{% endcolumn %}
{% column %}
In this screenshot, the scene is running at over 250 FPS while drawing about 5.95 million triangles, with a GPU frame time around 3.6 ms. There's only 48 draw calls since there is not a full environment here yet, so that number does not mean the whole thing is optimized, but it is already a good sign for the kind of scenes I want to build.
{% endcolumn %}
{% endcolumns %}

The Maze gives me a place to experiment and prototype quickly within Unity, with different input modalities and rendering styles, without creating a bunch of new projects. The goal is to find interesting gameplay systems, tools, playable slices, environments, animation setups, and other experiments, then combine the strongest parts into final projects later.
