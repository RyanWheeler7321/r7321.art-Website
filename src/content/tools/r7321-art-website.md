---
layout: layouts/tool.njk
title: r7321.art Site Source
slug: r7321-art-website
detailAccentRgb: "183, 140, 255"
date: 2026-03-24
summary: Source code for the r7321.art portfolio and update site, built as a static 11ty project with markdown-driven content.
thumbnail: /images/tools/r7321-art-website/icon.svg
icon: fas fa-code
tags:
  - tools
  - Website
  - 11ty
showcaseImages:
  - src: /images/tools/r7321-art-website/showcase.webp
    alt: r7321.art homepage with project, update, and tool sections
externalLinks:
  - label: GitHub Repo
    url: https://github.com/RyanWheeler7321/r7321.art-Website
dossier:
  facts:
    - label: Platform
      value: Web
    - label: Stack
      value: 11ty
    - label: Content
      value: Markdown
    - label: Repository
      value: GitHub
  features:
    - title: Updates
      summary: Short progress posts and longer project notes.
      symbol: news
    - title: Project Pages
      summary: A page for each released and active game.
      symbol: gamepad
    - title: Tool Pages
      summary: Tools I use, with descriptions and source links.
      symbol: wrench
    - title: Managed Images
      summary: Builds responsive images and poster-first video loops from the original media.
      symbol: image
    - title: Message Form
      summary: Routes feedback and bug reports through a small protected PHP service.
      symbol: lock
    - title: Responsive Layout
      summary: Keeps the same visual system usable across desktop and smaller screens.
      symbol: responsive
permalink: /tools/r7321-art-website/index.html
---
## Overview

This repo has the source for `r7321.art`, my site for projects, updates and tool pages. It is built with 11ty and the content is all Markdown, so new updates, projects and tools can be added without touching the overall structure.

## Structure

- `src/content/updates` stores update posts.
- `src/content/projects` stores project pages.
- `src/content/tools` stores tool pages.
- `src/images` stores site images and post media.
- `src/_includes` stores shared layouts.
- `src/assets` stores the site's CSS and JavaScript.
