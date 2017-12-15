/* globals d3 */

const Nightmare = require("nightmare"),
      config = require("./config.js"),
      fs = require("fs");

const dir = "./exports";

if (!fs.existsSync(dir)) fs.mkdirSync(dir);

config.urls.forEach(url => {

  const fullUrl = `https://datausa.io/${url}`;

  let filename = url.replace(/\//g, "-");
  const profile = filename.includes("profile");
  if (profile) filename = filename.slice(0, -1);
  else {
    filename = filename.replace("?level=", "").replace("&key=", "-");
  }

  new Nightmare({show: false})
    .viewport(profile ? 1400 : 1100, 650)
    .goto(fullUrl)
    .wait(5000)
    .evaluate((profile, filename, url, done) => {

      let description = "", heightMod = 0, sources = [], title;

      const viz = d3.select("svg");

      if (profile) {
        const build = window.current_build;

        title = build.title.substring(11).replace(/\n/g, "").replace(/\s{2,}/g, " ");
        title += ` (${d3.max(d3.merge(build.data.map(d => d.data)), d => d.year)})`;

        d3.selectAll(".content aside p").each(function() {
          const text = d3.select(this).text();
          if (text) {
            if (description.length) description += " ";
            description += text;
          }
        });

        sources = build.sources;

        if (build.viz.font) {
          build.viz.font("sans-serif").draw(() => {
            setTimeout(finishScrape, 1000);
          });
        }
        else {
          finishScrape();
        }

      }
      else {
        title = `United States Map of ${window.buildTitle}`;
        title += ` (${d3.select("#map-fullscreen .year-toggle .d3plus_button_active .d3plus_button_label").html()})`;

        window.load(window.data_url, (x, y, json) => {
          sources.push(json.source);
          finishScrape();
        });

      }

      function recursiveFormat(node) {
        if (!node.tagName) return;
        const elem = d3.select(node);

        if (node.tagName.toLowerCase() === "svg") {
          elem.attr("xmlns", "http://www.w3.org/2000/svg")
            .attr("xmlns:xlink", "http://www.w3.org/1999/xlink")
            .attr("height", elem.attr("height") - heightMod)
            .style("background-color", null);
        }

        if (elem.attr("font-family")) elem.attr("font-family", "sans-serif");
        if (elem.attr("vector-effect")) elem.attr("vector-effect", null);
        const transform = elem.style("text-transform");
        if (transform) {
          if (transform === "uppercase") elem.text(elem.text().toUpperCase());
          else if (transform === "lowercase") elem.text(elem.text().toLowerCase());
          else elem.style("text-transform", null);
        }
        elem.attr("clip-path", null);

        Array.from(node.childNodes).map(recursiveFormat);
      }

      function finishScrape() {


        // map specific
        const scale = viz.select("g.scale");
        const legend = [];
        if (scale.size()) {
          heightMod += scale.node().getBBox().height;
          const ticks = scale.selectAll("text.d3plus_tick")[0];
          scale.selectAll(".d3plus_legend_break").each(function(d, i) {
            legend.push({
              color: d3.select(this).attr("fill"),
              label: `${ticks[i].innerHTML} - ${ticks[i + 1].innerHTML}`
            });

          });
          scale.remove();
        }
        viz.select("g.tiles").remove();
        viz.select("g.pins").remove();
        viz.select("g.brush").remove();

        // viz specific
        const key = viz.select("g#key");
        if (key.size()) {
          heightMod += key.node().getBBox().height;
          const colorKey = window.current_build.color;
          const attrs = window.attrStyles[colorKey];
          const dataAttrs = window.current_build.viz.attrs();
          const format = window.viz.format.text;
          const squares = key.selectAll("rect");
          let exclude = [];
          if (colorKey === "sex") exclude = ["Women", "Men"];
          else if (colorKey === "race" && squares.size() > 2) exclude = ["Non-Black"];
          squares.each(function() {
            const fill = d3.select(this).attr("fill");
            const reg = new RegExp(/png_(.*)\)/g);
            let fillColor = reg.exec(fill);
            if (fillColor) {
              fillColor = fillColor[1];
              let color, label;
              for (const id in attrs) {
                if ({}.hasOwnProperty.call(attrs, id)) {
                  const attr = attrs[id];
                  if (attr.color.includes(fillColor)) {
                    if (dataAttrs && id in dataAttrs) {
                      label = dataAttrs[id].name;
                      color = attr.color;
                      break;
                    }
                    const tempName = format(id, {key: colorKey});
                    if (!exclude.includes(tempName) && isNaN(tempName)) {
                      label = tempName;
                      color = attr.color;
                      break;
                    }
                  }
                }
              }
              if (label && color) legend.push({color, label});
            }
          });
          key.remove();
        }
        viz.select("rect#bg").remove();
        viz.select("g#timeline").remove();
        viz.select("g#footer").remove();
        viz.select("rect#d3plus_overlay").remove();
        viz.select("g#edge_hover").remove();
        viz.selectAll("clipPath").remove();
        viz.selectAll("defs").remove();

        recursiveFormat(viz.node());

        if (profile) {
          const splitUrl = url = url.split("/");
          splitUrl.splice(6, 1);
          splitUrl[6] = `#${splitUrl[6]}`;
          splitUrl.pop();
          url = url.join("/");
        }

        done(null, {description, filename, legend, sources, title, url, viz: viz.node().outerHTML});

      }

    }, profile, filename, fullUrl)
    .end()
    .then(data => {
      console.log(data.title);

      const contents = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">

${data.viz}`;

      delete data.viz;

      fs.writeFileSync(`${dir}/${data.filename}.svg`, contents);
      fs.writeFileSync(`${dir}/${data.filename}.js`, `module.exports = ${JSON.stringify(data)}`);

      const today = new Date();
      let dd = today.getDate();
      let mm = today.getMonth() + 1;
      const yyyy = today.getFullYear();
      if (dd < 10) dd = `0${dd}`;
      if (mm < 10) mm = `0${mm}`;
      const date = `${yyyy}-${mm}-${dd}`;
      const meta = `=={{int:filedesc}}==
{{Information
|description={{en|1=${data.description || data.title}}}
${data.legend.map(d => `{{legend|${d.color}|${d.label}}}`).join("\n")}
|date=${date}
|source=*Interactive Visualization: [${data.url} Data USA]
${data.sources.map((d, i) => `${i ? "\n" : ""}*Data Source: [${d.link} ${d.org} - ${d.dataset}]`)}
|author=[http://datawheel.us/ Datawheel]
|permission=
|other versions=
}}

{{ValidSVG}}

=={{int:license-header}}==
{{Data USA license}}
`;
      fs.writeFileSync(`${dir}/${data.filename}.txt`, meta);
    });

});
