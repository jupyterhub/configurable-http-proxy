var Jasmine = require("jasmine");
var jasmine = new Jasmine();

jasmine.loadConfig({
  // Config reference: https://jasmine.github.io/api/npm/edge/Configuration.html
  random: false,
  spec_dir: "test",
  spec_files: ["*_spec.js"],
});
jasmine.configureDefaultReporter({
  // Options reference: https://jasmine.github.io/api/npm/edge/ConsoleReporterOptions.html
  //
  // showColors influences the green dots for each successful test, but not the
  // report after tests complete from istanbul-reports depending on
  // supports-color package that respects the FORCE_COLOR environment variable.
  //
  showColors: true,
});
jasmine.execute();
