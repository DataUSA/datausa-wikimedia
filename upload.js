const Bot = require("nodemw"),
      client = new Bot({
        protocol: "https",
        server: "commons.wikimedia.org",
        path: "/w",
        debug: true,
        username: process.env.WIKI_USERNAME,
        password: process.env.WIKI_PASSWORD,
        userAgent: "DataUSA Uploader (https://datausa.io; hello@datausa.io)"
      }),
      fs = require("fs");

function upload(files) {

  const fileName = files.pop();
  const {title} = require(fileName.replace("svg", "js"));
  fs.readFile(fileName, "utf8", (err, svg) => {
    if (err) throw err;
    fs.readFile(fileName.replace("svg", "txt"), "utf8", (err, txt) => {
      if (err) throw err;
      client.getArticle(`File:${title}.svg`, err => {
        if (err) throw err;
        client.upload(title, svg, "updates SVG", () => {
          client.edit(`File:${title}.svg`, txt, "updates description", () => {
            console.log(`uploaded: ${title}`);
            if (files.length) upload(files);
            else console.log("done!");
          });
        });
      });
    });
  });

}

client.logIn(err => {
  if (err) throw err;
  fs.readdir("./exports", (err, files) => {
    if (err) throw err;
    upload(files.filter(file => file.includes(".svg")).map(file => `./exports/${file}`));
  });
});
