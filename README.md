# datausa-wikimedia

Must install the Google Font "Noto Sans" before proceeding.

Local configuration needs to be stored in `config.js` file with the following structure:

```js
module.exports = {
  urls: [
    "map/?level=state&key=violent_crime",
    "profile/geo/tennessee/demographics/ethnicity/",
    "profile/geo/massachusetts/education/majors/"
  ]
};
```

## Scripts

`npm run scrape` - references the "urls" array from the config and creates SVGs and meta TXT files in an "exports/" folder.
