---
layout: layouts/tool.njk
title: r7Harness
slug: r7harness
detailAccentRgb: "255, 76, 139"
date: 2026-08-24
summary: A simplified version of my OMP-based agent workspace, for Codex, Claude and other agents that work with OMP.
description: A simplified version of my OMP-based agent workspace, for Codex, Claude and other agents that work with OMP.
thumbnail: /images/tools/r7harness/icon.svg
icon: fas fa-terminal
tags:
  - tools
  - Developer Tool
  - Codex
showcaseImages:
  - src: /images/tools/r7harness/showcase.png
    alt: r7Harness terminal workspace
externalLinks:
  - label: GitHub Repo
    url: https://github.com/RyanWheeler7321/r7Harness
dossier:
  facts:
    - label: Platform
      value: WSL + Windows Terminal
    - label: Foundation
      value: OMP
    - label: Backend
      value: Codex, Claude, and others
  features:
    - title: Compact Interface
      summary: Session titles, turn timing, usage and status, with a composer that stays put.
      symbol: responsive
    - title: Isolated Profiles
      summary: Each agent gets its own identity, config, login and sessions.
      symbol: users
    - title: Durable Instructions
      summary: Global and project instructions, plus reusable skills.
      symbol: braces
    - title: Themes and Fonts
      summary: Idle and working themes that follow what the agent is doing, plus a list of good terminal fonts.
      symbol: sliders
    - title: Guarded Execution
      summary: Readiness checks, clear limits on what tools can change, and file ownership so subagents don't overlap.
      symbol: lock
    - title: Pinned and Reversible
      summary: A pinned OMP build that installs next to stock OMP and rolls back cleanly.
      symbol: restore
permalink: /tools/r7harness/index.html
---
## Overview

r7Harness is a simplified version of my own OMP-based agent workspace. I use the original setup for fast, direct technical work. This version keeps the useful parts, like the compact terminal UI, separate agent profiles, global and project instructions, themes, guarded tool use and a pinned install you can roll back, without any of my personal setup.

I built it around Codex, but it isn't limited to Codex. You can use Claude or any other agent that works with OMP. Right now it runs on WSL with Windows Terminal, since that's what I use.

This repo is an unofficial modification of OMP. It isn't officially associated with OMP, Codex, or their developers.

## Personality

You pick your agent's name, provider and model when you install it, and it gets its own separate local profile. How it behaves is up to you in its personality file. Your identity, instructions, credentials, sessions, memory, and project details stay on your own machine.
