---
layout: layouts/update.njk
title: r7-Harness + r7-Shell
slug: r7harness-r7shell
date: 2026-10-01
thumbnail: /images/updates/r7harness-r7shell/r7harness-r7shell-thumb.png
tags:
  - updates
  - Tooling
permalink: /updates/r7harness-r7shell/index.html
---
AI models have gotten really good this year. I use Codex and Claude pretty much every day, and I wanted a harness and terminal I can customize however I want, so I made both.

r7-Harness is my agent harness, built on OMP. It has task titles with time estimates, separate profiles for each agent, and a reply style with colored markers for key points, finished work and questions.

r7-Shell is a lean custom terminal for Windows, made for running agents in WSL, as well as anything else you'd run in a terminal. Sessions keep running in the background, new text fades in and moved text glides into place, and a window flashes when its agent finishes a response.

{% image "/images/updates/r7harness-r7shell/r7harness-r7shell-01.png", "r7-Harness in r7-Shell, showing a finished reply with colored markers." %}

{% image "/images/updates/r7harness-r7shell/r7-console.gif", "r7-Shell running a game server console." %}

Running r7-Harness in r7-Shell, you also get pictures inside replies, bigger titles and mouse editing in the input box.

{% columns "media" %}
{% column "media" %}
{% image "/images/updates/r7harness-r7shell/r7-launch.gif", "The launch screen, then a message and its reply." %}
{% endcolumn %}
{% column "media" %}
{% image "/images/updates/r7harness-r7shell/r7-switch.gif", "Switching models and thinking levels." %}
{% endcolumn %}
{% endcolumns %}

{% columns "media compare-height" %}
{% column "media" %}
{% image "/images/updates/r7harness-r7shell/r7-ask.gif", "Clicking a question to answer it." %}
{% endcolumn %}
{% column "media" %}
{% image "/images/updates/r7harness-r7shell/r7harness-r7shell-02.png", "An agent working in one r7-Shell window, next to the launch screen in another." %}
{% endcolumn %}
{% endcolumns %}

{% ctas %}
{% cta "https://github.com/RyanWheeler7321/r7-Harness", "r7-Harness on GitHub", "GitHub" %}
{% cta "https://github.com/RyanWheeler7321/r7-Shell", "r7-Shell on GitHub", "GitHub" %}
{% endctas %}

At this point the models are so good that I have to stop myself from making more useful custom tools and actually work on my games. So, let me get to it.
