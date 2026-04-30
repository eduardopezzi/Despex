# Documentation

This directory contains the documentation for Open Receipt OCR, automatically published to GitHub Pages.

## Structure

- **index.md** - Home page with project overview
- **getting-started.md** - Installation and basic setup instructions
- **configuration.md** - Configure OCR providers, storage, and secrets
- **api.md** - REST API reference and examples
- **development.md** - Developer guide for contributing
- **extending.md** - How to add custom providers and features
- **docker.md** - Docker and Docker Compose deployment guide
- **quick-reference.md** - Quick commands and common tasks

## Building Locally

### Prerequisites
- Ruby 3.0+
- Bundler

### Build
```bash
cd docs
bundle install
bundle exec jekyll serve
```

Visit `http://localhost:4000` in your browser.

### Build Static Site
```bash
bundle exec jekyll build
# Output in: _site/
```

## Publishing

Documentation is automatically published to GitHub Pages when changes are pushed to the `main` branch (via `.github/workflows/pages.yml`).

Access at: `https://yourusername.github.io/open-receipt-ocr`

## Contributing to Docs

1. Edit markdown files in this directory
2. Test locally with `bundle exec jekyll serve`
3. Commit changes: `git commit -m "docs: description"`
4. Push to main branch
5. GitHub Actions will automatically deploy

## Jekyll Configuration

The site uses:
- **Theme**: Cayman (GitHub Pages default)
- **Engine**: Jekyll 4.0+
- **Language**: Markdown (CommonMark)

See `_config.yml` for theme and plugin settings.

## Maintenance

- Keep documentation in sync with code changes
- Update quick reference when adding new features
- Test all code examples before committing
- Use consistent formatting and terminology
