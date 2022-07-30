const express = require('express');

const { SvenskaSpel } = require('./plugins');

const app = express();

const plugins = {
  SvenskaSpel,
};

Object.keys(plugins).forEach((plugin) => {
  const pluginPath = plugin.toLocaleLowerCase();

  const routes = plugins[plugin].getRoutes();

  routes.forEach(({ type, path, controller }) => {
    console.log(`mpa:routes:${type}`, `/api/v1/${pluginPath}/${path}`);

    app[type](`/api/v1/${pluginPath}/${path}`, controller);
  });
});

// http://localhost:3000/api/v1/svenskaspel/getLeagues?sportIds=36
// http://localhost:3000/api/v1/svenskaspel/getEvents?leagueIds=203394,203395

app.listen(3000, () => {
  console.log('mpa:listen', 'http://localhost:3000');
});
