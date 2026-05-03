# HBuilderX Usage

This directory is a lightweight 5+ App shell for the Vite project.

## Build

Run this from the `openIm_H5` directory:

```bash
npm run build:hbuilder
```

The command writes the built web assets into `hbuilder/www`.

## Import Into HBuilderX

1. Import the `openIm_H5/hbuilder` directory into HBuilderX.
2. Open [manifest.json](/Users/booker/Desktop/IM%20H5%20模版/openIm_H5/hbuilder/manifest.json) and replace the placeholder `id` with your own AppID before cloud packaging.
3. Run the 5+ App project in HBuilderX.

## Notes

- Re-run `npm run build:hbuilder` whenever the Vue source changes.
- The HBuilderX build uses relative assets and hash routing to avoid white screens from local `www` resources.
- If you package a custom base or a release app, complete any camera, microphone, album, or storage permissions in HBuilderX's manifest visual editor as needed.
