---
layout: layouts/tool.njk
title: r7321.art Website Source
slug: r7321-art-website
date: 2026-03-24
summary: Source code for the r7321.art portfolio and update site, built as a static 11ty project with markdown-driven content.
thumbnail: /images/tools/r7321-art-website/icon.svg
icon: fas fa-code
tags:
  - tools
  - Website
  - 11ty
externalLinks:
  - label: GitHub Repo
    url: https://github.com/RyanWheeler7321/r7321.art-Website
permalink: /tools/r7321-art-website/index.html
---
## Overview

This repo contains the full source for `r7321.art`, the static portfolio and progress site used for projects, updates, and public tool pages.

## Structure

- `src/content/updates` stores update posts.
- `src/content/projects` stores project pages.
- `src/content/tools` stores tool pages.
- `src/images` stores site images and post media.
- `src/_includes` stores shared layouts.
- `src/assets` stores the site's CSS and JavaScript.

## Workflow

- `npm run dev` starts local development.
- `npm run build` prepares image metadata and builds the static site.

## Notes

The site is built with 11ty and keeps the content layer markdown-driven so new updates, projects, and tools can be added without rebuilding the overall structure each time.
