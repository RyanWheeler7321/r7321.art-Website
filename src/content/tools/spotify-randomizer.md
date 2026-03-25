---
layout: layouts/tool.njk
title: Spotify Randomizer
slug: spotify-randomizer
date: 2026-03-24
summary: Python tool for generating a new Spotify playlist from the artists connected to playlists you already use.
thumbnail: /images/tools/spotify-randomizer/icon.svg
tags:
  - tools
  - Python
  - Music Tool
showcaseImages:
  - src: /images/tools/spotify-randomizer/showcase.webp
    alt: Spotify Randomizer application window
externalLinks:
  - label: GitHub Repo
    url: https://github.com/RyanWheeler7321/SpotifyRandomizer
permalink: /tools/spotify-randomizer/index.html
---
## Overview

This is a small Python app for making a fresh Spotify playlist without relying on the same recommendation loop every time. It pulls from the artists connected to playlists you already use, then builds a new playlist from a few different randomization methods.

## Setup

You need Python, Spotipy, and your own Spotify developer app. Copy the example config file to `my_config.json`, add your client details and playlist IDs, then run the script or the included batch file.

## Notes

The repo now keeps local config and token cache files out of Git, so setup stays cleaner. It can also skip tracks that already exist in your main playlists and start playback immediately if you want it to.
