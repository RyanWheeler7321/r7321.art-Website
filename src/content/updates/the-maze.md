---
layout: layouts/update.njk
title: The Maze
slug: the-maze
date: 2026-04-25
summary: I have been putting together a new Unity development environment that I am calling The Maze.
thumbnail: /images/updates/the-maze/the-maze-01.png
tags:
  - updates
  - Game Dev
  - Unity
  - Technical Art
permalink: /updates/the-maze/index.html
---
I have been putting together a new Unity development environment that I am calling The Maze.

It is basically a generalized space for building and testing different game ideas without needing to start over every time. I want it to be a playground environment where I can try 2D, 3D, rendering, input, options, management systems, tools, mechanics, and other reusable game systems in one place.

{% image "/images/updates/the-maze/the-maze-01.png", "Unity scene running in The Maze, showing reflective water, fog, clouds, lighting, and tall test spires." %}

This first version is mostly focused on getting the 3D side into a strong place. I have been building out a customizable rendering setup with my own Unity render pipeline features, including planar reflections, screen-space reflections, procedural clouds, cloud shadows, water, volumetric fog, lighting, sun rays, shaders, and post-processing effects. I will probably open source some of the individual graphics features later once they are refined enough for other people to use outside my own setup.

The scene in this screenshot is running at over 250 FPS while rendering about 5.95 million triangles, with a GPU frame time around 3.6 ms. There are only 48 draw calls here, so that number is not proof that the whole thing is fully optimized yet, but it is already a strong base for building and testing the kinds of scenes I want to make.

The important part is that The Maze gives me a place to prove things quickly. I can build a gameplay system, a tool, a playable slice, an interesting environment, an animation setup, or some other experiment, then keep the parts that work and combine them into stronger final projects later.
