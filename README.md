![r7321.art homepage](src/images/tools/r7321-art-website/showcase.webp)

# r7321.art

This is the source for [r7321.art](https://r7321.art), my site for games, tools, updates, and whatever else I am making.

It is an Eleventy static site with Markdown-driven content and shared layouts. A small media pipeline turns the original images and GIFs into responsive WebP images and poster-first MP4 loops.

- Updates, projects, and tools are separate Markdown content collections.
- Shared layouts keep their index and detail pages consistent.
- The media build creates content-hashed responsive images, inline previews, and lightweight video loops.
- The message form handles feedback and bug reports through a small protected PHP service.

## Layout

- `src/content` - updates, projects, and tool pages
- `src/images` - original site images and post media
- `src/_includes` - shared layouts
- `src/assets` - CSS and browser JavaScript
- `server/support` - the message service source and example configuration
- `scripts` - build, media, browser-test, and deployment helpers
