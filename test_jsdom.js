const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('frontend/index.html', 'utf8');
const js = fs.readFileSync('frontend/app.js', 'utf8');

const dom = new JSDOM(html, { 
  runScripts: "dangerously", 
  resources: "usable",
  url: "http://localhost/" 
});

dom.window.eval(js);

dom.window.addEventListener('error', (event) => {
  console.log("JSDOM ERROR:", event.error);
});

setTimeout(() => {
  console.log("Checking if dockEngine is initialized:", !!dom.window.dockEngine);
  if(dom.window.dockEngine) {
    console.log("dockEngine targetX:", dom.window.dockEngine.targetX);
  } else {
    console.log("dockEngine not initialized. Checking if active tab exists...");
    const dockPill = dom.window.document.querySelector('.tab-bar-pill');
    const indicator = dom.window.document.getElementById('dock-indicator');
    console.log("dockPill exists?", !!dockPill);
    console.log("indicator exists?", !!indicator);
  }
}, 1000);
