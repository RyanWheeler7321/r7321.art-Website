---
layout: layouts/update.njk
title: 3D Viewer
slug: quick-3d-viewer
date: 2026-05-08
thumbnail: /images/updates/3d-viewer/3d-viewer-01.png
tags:
  - updates
  - Tooling
  - 3D
permalink: /updates/quick-3d-viewer/index.html
---
I put together a small 3D viewer because I wanted a faster way to check models without opening Blender, Unity, or a heavier asset tool every time.

The main use is simple: open a `.glb`, `.gltf`, `.fbx`, or zipped model, move around it, look at the texture with point lighting or HDRI lighting against different backgrounds, look at the topology with texture, no material, or wireframe, and decide what to do with it next. It does not replace my main 3D workflows in Blender and Substance Painter. It is a quick inspection window that can work with some of my automated scripts to assist in the development of 3D assets in general.

{% columns "media" %}
{% column "media" %}
{% image "/images/updates/3d-viewer/3d-viewer-01.png", "A textured character model viewed in the 3D viewer against a simple brown background." %}
{% endcolumn %}
{% column "media" %}
{% image "/images/updates/3d-viewer/3d-viewer-02.png", "A dark generated character model viewed in the 3D viewer against a purple background." %}
{% endcolumn %}
{% endcolumns %}

I also published a public version on GitHub. My own local version has some more particular processing features for my workflow, but the public one is focused on the viewer itself. It keeps the useful core: fast model loading, camera controls, HDRI switching, basic lighting modes, clay mode, wireframe mode, and a Windows right-click entry for files like `.glb`, `.gltf`, `.fbx`, and ZIP files containing glTF or GLB models.

{% columns "media" %}
{% column "media" %}
{% image "/images/updates/3d-viewer/3d-viewer-03.png", "The same character model shown in clay mode for checking the model shape without textures." %}
{% endcolumn %}
{% column "media" %}
{% image "/images/updates/3d-viewer/3d-viewer-04.png", "A planter box model shown with a bright wireframe overlay to inspect topology." %}
{% endcolumn %}
{% endcolumns %}

{% columns %}
{% column %}
One thing I wanted was quick environment testing. The viewer can swap through HDRIs, so I can see how a model reads in different lighting scenarios without setting up a whole scene. That has been useful for catching material problems quickly, especially when a model looks fine in one lighting setup but falls apart in another.
{% endcolumn %}
{% column %}
The lighting, clay, and wireframe tools are there for the same reason. Sometimes I just want to see the model shape clearly. Sometimes I want to check the texture and material response. Sometimes I want to see the topology over the surface and get a rough idea of whether the mesh is clean enough to keep using.
{% endcolumn %}
{% endcolumns %}

There are still some small rendering issues with certain high-poly meshes, so it is not a finished or perfect viewer. But for the job I made it for, it has already been useful: quick 3D viewing, quick lighting checks, and checking topology quickly. The main point is for it to sit inside automated workflows as a quick check before an asset moves to the next step.

{% cta "https://github.com/RyanWheeler7321/3D-Viewer", "3D Viewer on GitHub", "GitHub" %}
