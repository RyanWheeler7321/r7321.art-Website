---
layout: layouts/update.njk
title: r7-EQ
slug: r7-eq
date: 2026-09-28
thumbnail: /images/updates/r7-eq/r7-eq-01.png
tags:
  - updates
  - Tooling
permalink: /updates/r7-eq/index.html
---
I have two audio outputs on my PC, computer speakers and headphones. The speakers are actually too good, so I needed a way to bring down their dynamic range, and I also wanted to shape the sound more to my own taste. So I made a small EQ app for Equalizer APO, and I'm putting it out for anyone who wants to use it or extend it.

{% image "/images/updates/r7-eq/r7-eq-01.png", "r7-EQ, with the EQ curve over a live spectrum analyzer and the dials below it." %}

The compressor is based on Chrome's Web Audio compressor code, and the T button sets it to a reasonable default for TV, dialogue and other non-music stuff. Each output has its own profile, and the app switches to whichever one Windows is using.

It's pretty barebones and mostly made for my own setup, but it should work with anything Equalizer APO supports. It's Windows only, and the code and setup steps are on GitHub.

{% cta "https://github.com/RyanWheeler7321/r7-EQ", "r7-EQ on GitHub", "GitHub" %}
