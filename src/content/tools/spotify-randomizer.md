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
dossier:
  facts:
    - label: Platform
      value: Desktop
    - label: Language
      value: Python
    - label: API
      value: Spotify
    - label: Repository
      value: GitHub
  features:
    - title: Playlist Sources
      summary: Starts from playlists you already use instead of a generic catalog seed.
      symbol: playlist
    - title: Artist Expansion
      summary: Pulls from artists connected to those playlists to widen the pool.
      symbol: users
    - title: Random Modes
      summary: Builds fresh playlists through several different randomization methods.
      symbol: shuffle
    - title: Duplicate Filtering
      summary: Can skip tracks that already live in your main playlists.
      symbol: filter
    - title: PKCE Login
      summary: Authenticates without storing a Spotify client secret.
      symbol: lock
    - title: Playback Start
      summary: Can begin playing the new playlist immediately after generation.
      symbol: play
permalink: /tools/spotify-randomizer/index.html
---
## Overview

This is a small Python app for making a fresh Spotify playlist without relying on the same recommendation loop every time. It pulls from the artists connected to playlists you already use, then builds a new playlist from a few different randomization methods.

## Setup

You need Python, Spotipy, and your own Spotify developer app. Copy the example config file to `my_config.json`, add your client ID and playlist IDs, then run the script or the included batch file.

## Notes

The app uses Spotify's PKCE login flow, so no client secret is stored. It can skip tracks already in your main playlists and start playback immediately if you want it to.
