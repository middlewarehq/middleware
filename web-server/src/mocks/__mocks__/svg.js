// Next's build treats .svg imports as React components via an SVGR-style
// loader; Jest has no such transform and chokes trying to parse raw SVG/XML
// as JS. Stubbed to a trivial component -- nothing under test asserts on
// icon markup itself.
const React = require('react');
module.exports = (props) => React.createElement('svg', props);
module.exports.default = module.exports;
