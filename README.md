# r7321.art

Source code for my website.

The site is currently built as a static 11ty project with markdown-based content for updates, projects, and tools.

### Development

Start local development:

```bash
npm run dev
```

Build the site:

```bash
npm run build
```

### Structure

- `src/content/updates` contains update posts
- `src/content/projects` contains project pages
- `src/content/tools` contains tool pages
- `src/images` contains site images and post media
- `src/_includes` contains layouts
- `src/assets` contains CSS and JavaScript

### Notes

The site supports:

- standalone update pages
- standalone project pages
- update tag filtering
- project filtering in updates
- a tools section for public releases and assets

### Scaffolds

Starter files for new content live in:

- `scaffolds/update.md`
- `scaffolds/project.md`
- `scaffolds/tool.md`
