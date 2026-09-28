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
I have two audio outputs on my PC, computer speakers and headphones. The speakers are actually too good, so I needed a way to bring down their dynamic range, and I also wanted to shape the sound more to my own taste. So I made a small EQ app on top of Equalizer APO, and I'm putting it out for anyone who wants to use it or extend it.

{% image "/images/updates/r7-eq/r7-eq-01.png", "r7-EQ with an EQ curve over the live analyzer and the dials underneath." %}

You draw the EQ curve over a live analyzer, with dials under it for tone, stereo space and the compressor. The compressor is built from Chrome's own Web Audio compressor code, and the T button sets it to the same settings as the Twitch compressor I use. Each output gets its own profile, and the editor switches to whichever one Windows is playing through.

It's pretty barebones and mostly made for my own setup, but it should work with any setup Equalizer APO supports. Windows only, and the code and setup steps are on GitHub.

{% cta "https://github.com/RyanWheeler7321/r7-EQ", "r7-EQ on GitHub", "GitHub" %}
