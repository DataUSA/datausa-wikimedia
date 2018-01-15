const Bot = require("nodemw"),
      client = new Bot({
        protocol: "https",
        server: "commons.wikimedia.org",
        path: "/w",
        debug: false,
        username: process.env.WIKI_USERNAME,
        password: process.env.WIKI_PASSWORD,
        userAgent: "DataUSA Uploader (https://datausa.io; hello@datausa.io)"
      }),
      fs = require("fs");

let total;

function upload(files) {

  const fileName = files.pop();
  process.stdout.write(`\nUploaded ${total - files.length} of ${total}`);
  const {title} = require(fileName.replace("svg", "js"));

  fs.readFile(fileName, "utf8", (err, svg) => {
    if (err) throw err;
    fs.readFile(fileName.replace("svg", "txt"), "utf8", (err, txt) => {
      if (err) throw err;
      client.upload(title, svg, "updates SVG", () => {
        client.edit(`File:${title}.svg`, txt, "updates description", err => {
          if (err) throw err;

          process.stdout.clearLine();
          process.stdout.cursorTo(0);
          process.stdout.write(title);

          if (files.length) {
            setTimeout(() => upload(files), 7500);
          }
          else console.log("done!");
        });
      });
    });
  });

}

client.logIn(err => {
  if (err) throw err;
  fs.readdir("./exports", (err, files) => {
    if (err) throw err;
    files = files.filter(file => file.includes(".svg"))
      .sort((a, b) => b.localeCompare(a))
      .map(file => `./exports/${file}`);
    total = files.length;
    upload(files);
  });
});
