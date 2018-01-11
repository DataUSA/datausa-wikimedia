const axios = require("axios"),
      d3 = require("d3-array"),
      fs = require("fs");

const urls = [
  "map/?level=state&key=homicide_rate",
  "map/?level=state&key=adult_obesity",
  "map/?level=state&key=teen_births",
  "map/?level=state&key=adult_smoking",
  "map/?level=state&key=uninsured",
  "map/?level=state&key=pop,pop_moe,pop_rank",
  "map/?level=state&key=income,income_moe,income_rank"
];

const embeds = [
  "profile/geo/{{location}}/demographics/citizenship",
  "profile/geo/{{location}}/demographics/ethnicity",
  "profile/geo/{{location}}/demographics/languages",
  "profile/geo/{{location}}/economy/tmap_occ_num_emp",
  "profile/geo/{{location}}/economy/tmap_ind_num_emp"
];

const datafold = (json, data = "data", headers = "headers") =>
  json[data].map(data =>
    json[headers].reduce((obj, header, i) =>
      (obj[header] = data[i], obj), {}));

// const state = axios.get("https://api.datausa.io/attrs/geo?sumlevel=state")
//   .then(data => datafold(data.data).map(d => d.id));

const county = axios.get("https://api.datausa.io/api/?sort=desc&required=pop&order=pop&sumlevel=county&show=geo&limit=1")
  .then(data => datafold(data.data).map(d => d.geo));

Promise.all([county])
  .then(data => {
    const locations = d3.merge(data);
    embeds.forEach(embed => {
      locations.forEach(geo => {
        urls.push(embed.replace("{{location}}", geo));
      });
    });
    console.log(urls);
    fs.writeFileSync("config.js", `module.exports = ${JSON.stringify({urls}, null, 2)};\n`);
  });
