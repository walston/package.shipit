const path = require("path");
const fs = require("fs");
const yargs = require("yargs");

const args = yargs
  .scriptName("package-shipit")
  .version()
  .pkgConf("shipit")
  .option("no-overwrite", {
    boolean: true,
    describe: "Terminates process rather than overwriting old target path",
    default: false
  })
  .option("use-file", {
    describe: "Use provided file as `package.json`",
    default: path.join(process.cwd(), "package.json")
  })
  .option("copy-file", {
    alias: "c",
    array: true,
    string: true,
    describe: "Copy this file to target directory with package.json",
    example: "--copy-file=README.md -c=CHANGELOG.md"
  })
  .option("omit", {
    string: true,
    alias: "o",
    describe:
      "Omit certain keys/sub-keys from being included in the output package.json",
    example: "--omit=scripts,contributors",
    default: ""
  })
  .option("include", {
    string: true,
    alias: "i",
    describe: "Include keys/sub-keys in the output package.json",
    example: "--include=eslint,scripts.start,scripts.test",
    default: ""
  })
  .option("indent", {
    string: true,
    alias: "n",
    default: "tab",
    choices: ["2", "4", "tab"]
  }).argv;

const indent = (function(arg) {
  if (arg === "tab") return "\t";
  if (arg === "4") return "    ";
  return "  ";
})(args.indent);

const path_to_original = (function(uri) {
  if (!fs.existsSync(uri)) {
    const rel = path.relative(process.cwd(), uri);
    console.error(`Cannot use "${rel}", file does not exist`);
    process.exit(1);
  }
  if (uri[0] === "/") return uri;
  return path.join(process.cwd(), uri);
})(args["use-file"]);

const path_to_output = (function(uri) {
  /** @todo check to ensure `uri` is a directory */
  if (!fs.existsSync(uri)) {
    const rel = path.relative(process.cwd(), uri);
    console.error(`Cannot write to "${rel}", directory does not exist`);
    process.exit(1);
  }
  uri = path.join(uri, "package.json");
  if (uri[0] === "/") return uri;
  return path.join(process.cwd(), uri);
})(args._[0] || path.join(process.cwd(), "dist"));

fs.readFile(path_to_original, (err, data) => {
  if (err) throw Error(`ReadError: could not access ${path_to_original}`);

  const pkg = require("./main")(data.toString(), {
    indent,
    omit: args.omit.split(","),
    include: args.include.split(",")
  });

  fs.writeFile(path_to_output, pkg, err => {
    if (err) throw Error(`WriteError: could not write to ${path_to_output}`);
    copyFiles().catch(console.error);
  });
});

async function copyFiles() {
  const files = args["copy-file"];
  for (const filename of files) {
    const src = path.resolve(process.cwd(), filename);
    const dest = path.resolve(path.dirname(path_to_output), filename);
    fs.copyFile(src, dest, err => {
      if (err) throw err;
    });
  }
}
