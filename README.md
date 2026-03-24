# r7321.art

Source code for the redesigned static site at `r7321.art`.

## Stack

- 11ty for static builds
- Markdown + front matter for updates, projects, and tools
- Plain CSS and vanilla JS for layout, filters, navigation, and progressive enhancements

## Commands

```bash
npm install
npm run dev
npm run build
```

## Content Structure

- Updates: `src/content/updates/*.md`
- Projects: `src/content/projects/*.md`
- Tools: `src/content/tools/*.md`
- Shared data: `src/_data/site.js`
- Layouts: `src/_includes/layouts/`
- Styles: `src/assets/css/site.css`
- Scripts: `src/assets/js/site.js`
- Static images: `src/images/`

## Weekly Publishing Flow

1. Gather notes, links, media, and downloads.
2. Draft the update or project entry with Kara.
3. Add the final content as Markdown in the repo.
4. Put media in a matching folder under `src/images/`.
5. Run `npm run build` and review locally.

## Scaffolds

Starter files live in `scaffolds/`:

- `scaffolds/update.md`
- `scaffolds/project.md`
- `scaffolds/tool.md`

## Notes

- The repo is now the source of truth.
- The old `uploadOnSave` workflow should stay disabled.
