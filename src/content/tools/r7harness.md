---
layout: layouts/tool.njk
title: r7-Harness
slug: r7harness
detailAccentRgb: "255, 76, 139"
date: 2026-08-24
summary: A simplified version of my own agent setup on OMP, for Codex, Claude and other models it supports.
description: A simplified version of my own agent setup on OMP, for Codex, Claude and other models it supports.
thumbnail: /images/tools/r7harness/icon.svg
icon: fas fa-terminal
tags:
  - tools
  - Dev
showcaseImages:
  - src: /images/tools/r7harness/showcase.png
    alt: r7-Harness terminal workspace
externalLinks:
  - label: GitHub Repo
    url: https://github.com/RyanWheeler7321/r7-Harness
dossier:
  facts:
    - label: Platform
      value: WSL + Windows Terminal or r7-Shell
    - label: Foundation
      value: OMP
    - label: Works With
      value: Codex, Claude, and others
  features:
    - title: Compact Interface
      summary: Session titles, turn timing, usage and status, with an input box that stays put.
      symbol: responsive
    - title: Separate Profiles
      summary: Each agent gets its own identity, config, login and sessions.
      symbol: users
    - title: Instructions and Skills
      summary: Global and project instructions, plus skills.
      symbol: braces
    - title: Themes and Fonts
      summary: Idle and working themes that follow what the agent is doing, plus a list of good terminal fonts.
      symbol: sliders
    - title: Reply Style
      summary: Short replies with colored markers and numbered questions, every color can be changed.
      symbol: palette
    - title: Safeguards
      summary: It won't change anything until setup checks pass, tools are limited in what they can change, and subagents can't edit the same files.
      symbol: lock
    - title: Pinned Build
      summary: Stays on one exact OMP version, and it's easy to roll back to an earlier one.
      symbol: restore
permalink: /tools/r7harness/index.html
---
## Overview

r7-Harness is a simplified version of my own agent setup, built on OMP.

I use it with Codex and Claude, and it works with any other model OMP supports. It runs on WSL with Windows Terminal or r7-Shell.

This repo is an unofficial modification of OMP. It isn't officially associated with OMP, Codex, or their developers.

## Personality

You pick your agent's name, provider and model when you install it, and it gets its own separate local profile. How it behaves is up to you in its personality file. Your identity, instructions, credentials, sessions, memory, and project details stay on your own machine.
