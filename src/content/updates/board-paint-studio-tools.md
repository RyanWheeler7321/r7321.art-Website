---
layout: layouts/update.njk
title: Board/Paint Studio Tools
slug: board-paint-studio-tools
date: 2026-04-05
thumbnail: /images/updates/board-paint-studio-tools/board-paint-studio-tools-01.png
tags:
  - updates
  - Tooling
permalink: /updates/board-paint-studio-tools/index.html
---
I put together a public version of my Workboard app, which I am calling Board Studio. I built it pretty quickly over a few days, using newer AI coding tools as part of the process. Stuff like this only really works well if I understand the software deeply enough to guide it properly. If I let it make too many design decisions on its own, it gets messy fast and I end up in the dark when something breaks. The upside is that once the structure is understood properly, it becomes very fast for me to add custom features, hotkeys, and workflow improvements, which is a big part of why I prefer building tools like this for myself instead of relying entirely on commercial software.

{% image "/images/updates/board-paint-studio-tools/board-paint-studio-tools-01.png", "Board Studio main workspace showing lists, notes, references, audio, and media blocks." %}

It is a Windows Electron app for organizing ideas, references, project spaces, links, media, notes, and other bits of information in a way that actually feels useful instead of cluttered. I use this kind of thing constantly, so getting a clean standalone version out in public felt worth doing.

{% image "/images/updates/board-paint-studio-tools/board-paint-studio-tools-02.png", "Board Studio project library and board view with grouped game content blocks." %}

It also connects directly to a built-in paint system, so I can do quick concepting, edits, and even some basic placeholder sprite work without leaving the app. The GitHub version is posted as its own standalone base, so if anybody wants to use it as-is or build their own version from it, they can. In my own setup I also have it tied into AutoHotKey and some other workflow tools.

{% columns "media" %}
{% column "media" %}
{% image "/images/updates/board-paint-studio-tools/board-paint-studio-tools-03.png", "Paint Studio sketch workspace with color controls and a character concept on canvas." %}
{% endcolumn %}
{% column "media" %}
{% image "/images/updates/board-paint-studio-tools/board-paint-studio-tools-04.png", "Paint Studio workspace showing tiled asset painting and multiple mirrored views." %}
{% endcolumn %}
{% endcolumns %}

{% columns %}
{% column %}
Paint Studio is built for rough concept work, thumbnails, storyboards, and simple animations, but it also has some stronger tools than that probably makes it sound. It has a full layer system, tiling, mirroring, quick adjustment processing, a good color selector, and a range of brushes including a stamp brush for repeating shapes and assets fast when blocking in contrast, value, and composition ideas.
{% endcolumn %}
{% column %}
In the second image you can also see the tiling setup, which lets me paint across the canvas bounds so tiled assets and repeating concepts read more correctly while I work. It also ties back into Board Studio so I can save individual assets as projects with multiple images, layers, and frames. There is also a Unity export path built into it, although I have not used that part enough yet to know where the bugs still are.
{% endcolumn %}
{% endcolumns %}

{% cta "https://github.com/RyanWheeler7321/Board-Studio", "Board Studio on GitHub", "GitHub" %}
