---
layout: layouts/tool.njk
title: Spotify Randomizer
slug: spotify-randomizer
detailAccentRgb: "89, 247, 162"
date: 2026-03-24
summary: Python app that builds a new Spotify playlist from the artists in your own playlists.
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
      summary: Uses your own playlists as the starting point.
      symbol: playlist
    - title: Artist Expansion
      summary: Picks songs from the artists in those playlists.
      symbol: users
    - title: Random Modes
      summary: Each song is picked at random from your playlists, the same album, or the artist's top tracks or full discography.
      symbol: shuffle
    - title: Duplicate Filtering
      summary: Can skip tracks already in your main playlists.
      symbol: filter
    - title: Playback Start
      summary: Can start playing the new playlist right away.
      symbol: play
permalink: /tools/spotify-randomizer/index.html
---
## Overview

I made this Python app to build a new Spotify playlist that finds new music and plays some songs I already like. It picks from the artists in playlists you already have.

## Setup

You need Python, Spotipy, and your own Spotify developer app. Copy the example config file to `my_config.json`, add your client ID, client secret and playlist IDs, then run the script or the included batch file.
